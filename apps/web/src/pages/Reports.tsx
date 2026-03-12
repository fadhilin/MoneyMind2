import React, { useState, useMemo } from 'react';
import { useMonthlySummary, useBudgetDistribution, useTransactionBreakdown } from '../hooks/useReports';
import { useGlobalDate } from '../hooks/useGlobalDate';
import { useBudgets } from '../hooks/useBudgets';
import ReportSection from '../components/ReportSection';

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

const Reports: React.FC = () => {
  const [globalDate] = useGlobalDate();
  
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [reportDate, setReportDate] = useState<string>(globalDate);

  // Helper to format date string to YYYY-MM-DD
  const formatDate = (date: Date) => {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().split('T')[0];
  };

  const periodParams = useMemo(() => {
    const dateObj = new Date(reportDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    const monthStr = reportDate.slice(0, 7);

    // Default: Monthly
    let startDate = `${monthStr}-01`;
    let endDate = formatDate(new Date(year, month + 1, 0));
    let label = new Date(`${monthStr}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    if (reportPeriod === 'daily') {
      startDate = reportDate;
      endDate = reportDate;
      label = new Date(reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (reportPeriod === 'weekly') {
      // 7-day rolling window based on days since start of year
      const dCopy = new Date(year, month, day); 
      const startOfYear = new Date(year, 0, 1);
      
      // Calculate days difference (ignore sub-day precision)
      const diffTime = dCopy.getTime() - startOfYear.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Zero-indexed week
      const weekIndex = Math.floor(diffDays / 7);
      
      const wStart = new Date(year, 0, 1 + weekIndex * 7);
      const wEnd = new Date(year, 0, 1 + weekIndex * 7 + 6);
      
      startDate = formatDate(wStart);
      endDate = formatDate(wEnd);
      
      const startMonthStr = wStart.toLocaleDateString('id-ID', { month: 'short' });
      const endMonthStr = wEnd.toLocaleDateString('id-ID', { month: 'short' });
      const sYearStr = wStart.getFullYear();
      const eYearStr = wEnd.getFullYear();

      if (wStart.getMonth() === wEnd.getMonth() && sYearStr === eYearStr) {
        label = `${wStart.getDate()} - ${wEnd.getDate()} ${startMonthStr} ${eYearStr}`;
      } else if (sYearStr === eYearStr) {
        label = `${wStart.getDate()} ${startMonthStr} - ${wEnd.getDate()} ${endMonthStr} ${eYearStr}`;
      } else {
        label = `${wStart.getDate()} ${startMonthStr} ${sYearStr.toString().slice(2)} - ${wEnd.getDate()} ${endMonthStr} ${eYearStr.toString().slice(2)}`;
      }
    }

    return { month: monthStr, startDate, endDate, label };
  }, [reportDate, reportPeriod]);

  // Sync date with globalDate when it changes, but only if they diverge in month for Monthly view,
  // or exactly for daily view. For simplicity, just reset to globalDate when switching tabs if needed, 
  // but React state handles reportDate directly. Let's just monitor globalDate changes:
  React.useEffect(() => {
    setReportDate(globalDate);
  }, [globalDate]);

  const { data: summary } = useMonthlySummary({
    month: periodParams.month,
    startDate: periodParams.startDate,
    endDate: periodParams.endDate
  });
  
  const { data: budgetDist = [] } = useBudgetDistribution({
    month: periodParams.month,
    startDate: periodParams.startDate,
    endDate: periodParams.endDate
  });
  
  const { data: breakdown = [] } = useTransactionBreakdown({
    month: periodParams.month,
    startDate: periodParams.startDate,
    endDate: periodParams.endDate
  });
  
  // budgets hook might just use month, but we pass what we can
  const { data: budgets = [] } = useBudgets(periodParams.month, reportDate);

  const totalIncome = summary?.realIncome ?? 0;
  const totalExpense = summary?.adjustedExpense ?? 0;
  const totalBalance = summary?.totalBalance ?? 0;
  const efficiency = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const ratioPercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  const exportToCSV = () => {
    const todayDate = new Date().toISOString().split('T')[0];
    const csvRows: string[] = [];

    // Helper to escape CSV values
    const esc = (v: any) => {
      const s = String(v ?? '');
      if (s.includes(';') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    // 1. Header & Identitas
    csvRows.push(`${esc('LAPORAN KEUANGAN')} - ${esc(user?.name || 'User')}`);
    csvRows.push(`${esc('Periode')};${esc(periodParams.label)}`);
    csvRows.push(`${esc('Tanggal Unduh')};${esc(new Date().toLocaleDateString('id-ID'))}`);
    csvRows.push('');
    
    // 2. Ringkasan Keuangan (High Level)
    csvRows.push(esc('RINGKASAN UTAMA'));
    csvRows.push(`${esc('Pemasukan')};${esc(totalIncome)}`);
    csvRows.push(`${esc('Pengeluaran')};${esc(totalExpense)}`);
    csvRows.push(`${esc('Selisih (Net)')};${esc(totalBalance)}`);
    csvRows.push(`${esc('Efisiensi')};${esc(efficiency + '%')}`);
    csvRows.push(`${esc('Saldo Saat Ini (Dompet)')};${esc(summary?.globalBalance || 0)}`);
    csvRows.push('');
    
    // 3. Distribusi Anggaran
    csvRows.push(esc('DISTRIBUSI ANGGARAN (PENGELUARAN PER KATEGORI)'));
    if (budgetDist.length > 0) {
      csvRows.push(`${esc('Kategori')};${esc('Limit Bulanan')};${esc('Terpakai (Periode)')};${esc('Sisa Limit')};${esc('Persentase')}`);
      budgetDist.forEach(b => {
        const remaining = b.limit - b.spent;
        csvRows.push(`${esc(b.category)};${esc(b.limit)};${esc(b.spent)};${esc(remaining)};${esc(b.percent.toFixed(1) + '%')}`);
      });
    } else {
      csvRows.push(esc('Tidak ada data anggaran untuk periode ini.'));
    }
    csvRows.push('');
    
    // 4. Breakdown Transaksi (Detail Tipe)
    csvRows.push(esc('BREAKDOWN DETAIL TRANSAKSI'));
    if (breakdown.length > 0) {
      csvRows.push(`${esc('Kategori')};${esc('Tipe')};${esc('Total (Rp)')};${esc('Frekuensi')}`);
      breakdown.forEach(item => {
        const typeIndo = item.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        csvRows.push(`${esc(item.category)};${esc(typeIndo)};${esc(item.total)};${esc(item.count + 'x')}`);
      });
    } else {
      csvRows.push(esc('Tidak ada detail transaksi untuk periode ini.'));
    }

    // Wrap in Blob for better compatibility with different encodings
    const csvString = csvRows.join('\r\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_${user?.name || 'User'}_${todayDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrev = () => {
    const d = new Date(reportDate);
    if (reportPeriod === 'daily') d.setDate(d.getDate() - 1);
    else if (reportPeriod === 'weekly') d.setDate(d.getDate() - 7);
    else if (reportPeriod === 'monthly') d.setMonth(d.getMonth() - 1);
    
    // Quick timezone fix before shifting back to YYYY-MM-DD
    const newDateStr = formatDate(d);
    setReportDate(newDateStr);
  };

  const handleNext = () => {
    const d = new Date(reportDate);
    if (reportPeriod === 'daily') d.setDate(d.getDate() + 1);
    else if (reportPeriod === 'weekly') d.setDate(d.getDate() + 7);
    else if (reportPeriod === 'monthly') d.setMonth(d.getMonth() + 1);
    
    // Prevent going past today if needed, or just let them
    const newDateStr = formatDate(d);
    setReportDate(newDateStr);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-6 md:mb-10 flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-start gap-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">Laporan</h2>
            <div className="flex items-center group bg-slate-100 dark:bg-white/5 rounded-full px-2 py-1 w-full sm:w-auto justify-between sm:justify-center">
              <button onClick={handlePrev} className="flex items-center justify-center size-8 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <div className="flex items-center justify-center px-4 min-w-[120px] text-center text-primary font-bold text-[13px] md:text-sm leading-none">
                {periodParams.label}
              </div>
              <button onClick={handleNext} className="flex items-center justify-center size-8 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            {/* Period Tabs */}
            <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl w-full sm:w-auto">
              {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((p) => (
                <button 
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-2 text-[11px] md:text-xs font-bold rounded-lg transition-all ${reportPeriod === p ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-500 hover:text-black dark:hover:text-white'}`}
                >
                  {p === 'daily' ? 'Harian' : p === 'weekly' ? '7 Hari' : '30 Hari'}
                </button>
              ))}
            </div>

            <button onClick={exportToCSV} className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:brightness-110 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">download</span>
              Unduh CSV
            </button>
          </div>
        </div>
      </header>

      {/* Charts Section */}
      <ReportSection 
        summary={summary} 
        budgetDist={budgetDist} 
        breakdown={breakdown} 
        periodLabel={periodParams.label} 
        budgets={budgets}
        reportPeriod={reportPeriod}
      />

      {/* Transaction breakdown */}
      {breakdown.length > 0 && (
        <div className="mt-8 glass-card p-6 md:p-8 rounded-3xl md:rounded-4xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="text-lg md:text-xl font-bold mb-6 text-black dark:text-white">Breakdown Transaksi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {breakdown.map((item, i) => (
              <div key={i} className="p-3 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-xs md:text-sm text-black dark:text-white truncate max-w-[120px]">{item.category}</p>
                  <p className={`text-[10px] md:text-xs font-semibold mt-1 ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{item.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xs md:text-sm text-black dark:text-white">Rp {item.total.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-slate-400">{item.count}x</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
