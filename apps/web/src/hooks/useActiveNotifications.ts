import { useEffect, useState } from 'react';
import { useMonthlySummary } from './useReports';
import { useBudgets } from './useBudgets';
import { useSavings } from './useSavings';
import { useGlobalDate } from './useGlobalDate';
import { useSettings } from './useSettings';
import { Preferences } from '@capacitor/preferences';

export interface Notification {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  icon: string;
  title: string;
  message: string;
  time: string;
}

export function useActiveNotifications() {
  const [globalDate] = useGlobalDate();
  const month = globalDate.slice(0, 7);
  const { data: monthSummary } = useMonthlySummary({ month });
  const { data: budgets = [] } = useBudgets(month, globalDate);
  const { data: savings = [] } = useSavings();
  const { data: settings } = useSettings();

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const loadDismissed = async () => {
      const { value: saved } = await Preferences.get({ key: 'dismissed_notifs' });
      if (saved) setDismissedIds(JSON.parse(saved));
    };
    loadDismissed();

    const handleSync = async () => {
      const { value: saved } = await Preferences.get({ key: 'dismissed_notifs' });
      setDismissedIds(saved ? JSON.parse(saved) : []);
    };
    window.addEventListener('notif-sync', handleSync);
    return () => window.removeEventListener('notif-sync', handleSync);
  }, []);

  const handleDismiss = async (id: string) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    await Preferences.set({
      key: 'dismissed_notifs',
      value: JSON.stringify(next)
    });
    window.dispatchEvent(new Event('notif-sync'));
  };

  const handleDismissAll = async (ids: string[]) => {
    if (ids.length > 0) {
      const next = [...dismissedIds, ...ids];
      setDismissedIds(next);
      await Preferences.set({
        key: 'dismissed_notifs',
        value: JSON.stringify(next)
      });
      window.dispatchEvent(new Event('notif-sync'));
    }
  };

  const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });



  const notifications: Notification[] = [];
  const monthlyIncome = monthSummary?.realIncome ?? 0;
  const monthlyExpense = monthSummary?.adjustedExpense ?? 0;
  const currentBalance = monthlyIncome - monthlyExpense;
  const ratio = monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 0;

  // Belum ada pemasukan
  if (monthlyIncome === 0) {
    notifications.push({
      id: 'no-income',
      type: 'info',
      icon: 'info',
      title: 'Belum ada pemasukan',
      message: 'Tambahkan pemasukan bulan ini untuk memantau kesehatan keuanganmu.',
      time: now,
    });
  }

  // Safety spend: Bahaya
  if (monthlyIncome > 0 && ratio > 90) {
    notifications.push({
      id: 'danger-spend',
      type: 'danger',
      icon: 'warning',
      title: 'Bahaya! Pengeluaran Sangat Tinggi',
      message: `Pengeluaranmu sudah ${ratio.toFixed(0)}% dari pemasukan. Segera kurangi pengeluaran!`,
      time: now,
    });
  } else if (monthlyIncome > 0 && ratio >= 70) {
    notifications.push({
      id: 'warning-spend',
      type: 'warning',
      icon: 'trending_up',
      title: 'Waspada Pengeluaran',
      message: `Pengeluaranmu mencapai ${ratio.toFixed(0)}% dari pemasukan. Mendekati batas aman.`,
      time: now,
    });
  }

  // Saldo tipis
  if (monthlyIncome > 0 && currentBalance < monthlyIncome * 0.1 && currentBalance >= 0) {
    notifications.push({
      id: 'low-balance',
      type: 'danger',
      icon: 'account_balance_wallet',
      title: 'Saldo Tersisa Sangat Tipis',
      message: `Saldo kamu hanya Rp ${currentBalance.toLocaleString('id-ID')}. Pertimbangkan untuk hemat.`,
      time: now,
    });
  }

  // Budget limits
  budgets.forEach((b) => {
    const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
    if (pct >= 100) {
      notifications.push({
        id: `budget-full-${b.id}`,
        type: 'danger',
        icon: 'block',
        title: `Budget ${b.category} Habis`,
        message: `Anggaran kategori "${b.category}" sudah terpakai penuh (Rp ${b.spent.toLocaleString('id-ID')} / Rp ${b.limit.toLocaleString('id-ID')}).`,
        time: now,
      });
    } else if (pct >= 80) {
      notifications.push({
        id: `budget-warn-${b.id}`,
        type: 'warning',
        icon: 'pie_chart',
        title: `Budget ${b.category} Hampir Habis`,
        message: `Kategori "${b.category}" sudah ${pct.toFixed(0)}% terpakai. Sisanya Rp ${(b.limit - b.spent).toLocaleString('id-ID')}.`,
        time: now,
      });
    }
  });

  // Savings milestones
  savings.forEach((s) => {
    const pct = s.target > 0 ? (s.current / s.target) * 100 : 0;
    if (pct >= 100) {
      notifications.push({
        id: `saving-done-${s.id}`,
        type: 'success',
        icon: 'emoji_events',
        title: `Target "${s.name}" Tercapai! 🎉`,
        message: `Selamat! Kamu berhasil mencapai target tabungan Rp ${s.target.toLocaleString('id-ID')}.`,
        time: now,
      });
    } else if (pct >= 75) {
      notifications.push({
        id: `saving-almost-${s.id}`,
        type: 'success',
        icon: 'savings',
        title: `"${s.name}" Hampir Tercapai`,
        message: `Sudah ${pct.toFixed(0)}% dari target. Tinggal Rp ${(s.target - s.current).toLocaleString('id-ID')} lagi!`,
        time: now,
      });
    }
  });

  // Semua aman
  if (notifications.length === 0 && monthlyIncome > 0) {
    notifications.push({
      id: 'all-good',
      type: 'success',
      icon: 'check_circle',
      title: 'Keuanganmu Aman',
      message: 'Pengeluaran masih dalam batas aman. Pertahankan pola ini!',
      time: now,
    });
  }

  const activeNotifications = notifications.filter((n) => !dismissedIds.includes(n.id));
  const notificationsEnabled = settings?.notificationsEnabled ?? true;

  return { notifications, activeNotifications, handleDismiss, handleDismissAll, notificationsEnabled };
}
