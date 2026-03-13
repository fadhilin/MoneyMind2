import { useMonthlySummary } from '../hooks/useReports';
import { useSavings } from '../hooks/useSavings';
import { useVisibilityStore } from '../stores/useVisibilityStore';

const StatsRow = () => {
  const { isSaldoVisible } = useVisibilityStore();
  const todayDate = new Date().toLocaleDateString('en-CA');
  const todayMonth = todayDate.slice(0, 7);
  
  // Fetch today's summary specifically for daily stats
  const { data: todaySummary } = useMonthlySummary({ 
    month: todayMonth, 
    date: todayDate 
  });
  
  const { data: savings = [] } = useSavings();

  const dailyIncome = todaySummary?.totalIncome ?? 0;
  const dailyExpense = todaySummary?.totalExpense ?? 0;

  const mainSaving = savings[0] || { current: 0, target: 1 };
  const savingPercent = Math.min(100, Math.round((mainSaving.current / mainSaving.target) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="glass-card p-6 rounded-[1.5rem] bg-white dark:bg-black border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all">
        <div className="flex items-center gap-4 mb-3 pr-3">
          <div className="size-12 rounded-2xl text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined font-bold">arrow_downward</span>
          </div>
          <p className="text-normal md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Total Pemasukan Hari Ini</p>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
          {isSaldoVisible ? `Rp ${dailyIncome.toLocaleString('id-ID')}` : 'Rp •••••••'}
        </h3>
      </div>

      <div className="glass-card p-6 rounded-[1.5rem] bg-white dark:bg-black border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all">
        <div className="flex items-center gap-4 mb-3 -ml-3">
          <div className="size-12 rounded-2xl text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined font-bold">arrow_upward</span>
          </div>
          <p className="text-normal md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Total Pengeluaran Hari Ini</p>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
          {isSaldoVisible ? `Rp ${dailyExpense.toLocaleString('id-ID')}` : 'Rp •••••••'}
        </h3>
      </div>

      <div className="glass-card p-6 rounded-[1.5rem] bg-white dark:bg-black border border-slate-200 dark:border-white/10 group hover:shadow-xl transition-all">
        <div className="flex items-center gap-4 mb-3">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined">savings</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Tabungan</p>
            <p className={`text-[10px] font-bold ${savingPercent >= 100 ? 'text-amber-500 animate-pulse' : 'text-primary'}`}>Progres: {savingPercent}%</p>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full mt-4 overflow-hidden relative">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${savingPercent >= 100 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-primary'}`} 
            style={{ width: `${savingPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default StatsRow;
