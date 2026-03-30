import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface Reminder {
  id: string;
  name: string;
  dayOfMonth: number; // 1–31
  amount?: number;
  icon: string;
  enabled: boolean;
  createdAt: string;
}

const REMINDERS_KEY = 'payment_reminders';

async function loadReminders(): Promise<Reminder[]> {
  const { value } = await Preferences.get({ key: REMINDERS_KEY });
  return value ? JSON.parse(value) : [];
}

async function saveReminders(reminders: Reminder[]): Promise<void> {
  await Preferences.set({ key: REMINDERS_KEY, value: JSON.stringify(reminders) });
  await syncLocalNotifications(reminders);
}

async function syncLocalNotifications(reminders: Reminder[]) {
  try {
    if (typeof LocalNotifications === 'undefined' || !LocalNotifications.checkPermissions) {
      console.warn('LocalNotifications plugin not available');
      return;
    }
    
    const perms = await LocalNotifications.checkPermissions();
    if (perms.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Cancel all existing to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    const notifications = reminders
      .filter((r) => r.enabled)
      .map((r, index) => ({
        title: `⏰ Tagihan Jatuh Tempo!`,
        body: `Waktunya bayar ${r.name}${r.amount ? ` sebesar Rp ${r.amount.toLocaleString('id-ID')}` : ''}. Segera catat pengeluaranmu!`,
        id: index + 100, // Fixed ID per reminder in the list
        schedule: {
          on: {
            day: r.dayOfMonth,
            hour: 9,
            minute: 0
          },
          repeats: true,
          allowWhileIdle: true
        },
        extra: { reminderId: r.id },
        smallIcon: 'ic_stat_name', // Should match native icon resource if available
        actionTypeId: 'OPEN_APP'
      }));

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (err) {
    console.error('Failed to sync local notifications:', err);
  }
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadReminders().then((data) => {
      setReminders(data);
      setIsLoaded(true);
    });
  }, []);

  const addReminder = useCallback(async (input: { name: string; dayOfMonth: number; amount?: number; icon?: string }) => {
    const newReminder: Reminder = {
      id: crypto.randomUUID?.() || Date.now().toString(36),
      name: input.name,
      dayOfMonth: input.dayOfMonth,
      amount: input.amount,
      icon: input.icon || 'alarm',
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...reminders, newReminder];
    setReminders(updated);
    await saveReminders(updated);
    return newReminder;
  }, [reminders]);

  const removeReminder = useCallback(async (id: string) => {
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    await saveReminders(updated);
  }, [reminders]);

  const toggleReminder = useCallback(async (id: string) => {
    const updated = reminders.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    setReminders(updated);
    await saveReminders(updated);
  }, [reminders]);

  const getTodayReminders = useCallback(() => {
    const today = new Date().getDate();
    return reminders.filter((r) => r.enabled && r.dayOfMonth === today);
  }, [reminders]);

  return {
    reminders,
    isLoaded,
    addReminder,
    removeReminder,
    toggleReminder,
    getTodayReminders,
  };
}
