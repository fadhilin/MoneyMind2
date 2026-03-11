import { useMonthlySummary } from '../hooks/useReports';
import { useVisibilityStore } from '../stores/useVisibilityStore';
import AvatarReaction from './AvatarReaction';

const HeroSection = () => {
  const { isSaldoVisible, toggleVisibility } = useVisibilityStore();
  const todayDate = new Date().toLocaleDateString('en-CA');
  const todayMonth = todayDate.slice(0, 7);
  
  const { data: summary } = useMonthlySummary({ month: todayMonth, date: todayDate });


  // Saldo Saat Ini -> Global Cumulative Balance
  const totalBalance = summary?.globalBalance ?? 0;
  
  const localIncome = summary?.realIncome ?? 0;
  const localExpense = summary?.adjustedExpense ?? 0;
  const ratio = localIncome > 0 ? (localExpense / localIncome) * 100 : 0;
  const { data: monthSummary } = useMonthlySummary({ month: todayMonth });
  const safetySpend = monthSummary?.safetySpend ?? 0;

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-linear-to-r from-primary to-[#a855f7] rounded-4xl blur-xl opacity-20 group-hover:opacity-30 transition-all"></div>
      <div className="relative glass-card p-6 md:p-10 rounded-3xl md:rounded-4xl overflow-hidden bg-background-light dark:bg-background-dark border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <AvatarReaction />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Saldo Kamu Saat Ini</p>
                <button 
                  onClick={toggleVisibility}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors group flex items-center justify-center"
                  title={isSaldoVisible ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
                >
                  <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-primary transition-colors">
                    {isSaldoVisible ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-black dark:text-white tracking-tighter flex items-baseline gap-1 md:gap-2">
                <span className="text-2xl md:text-4xl">Rp</span>
                <span className="truncate">{isSaldoVisible ? totalBalance.toLocaleString('id-ID') : '•••••••'}</span>
              </h1>
            </div>
          </div>

          <div className="h-20 w-px bg-slate-200 dark:bg-white/10 hidden lg:block"></div>

          <div className="bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 p-6 rounded-2xl backdrop-blur-md min-w-[240px]">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Estimasi Safety Spend</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-black dark:text-white">
                {isSaldoVisible ? `Rp ${safetySpend.toLocaleString('id-ID')}` : 'Rp •••••••'}
              </span>
              <span className="text-xs text-slate-500">/bulan</span>
            </div>

            {!isSaldoVisible ? (
              <p className="text-[10px] text-slate-400 mt-2 italic shadow-inner">Nominal disembunyikan</p>
            ) : totalBalance === 0 ? (
              <p className="text-[10px] text-slate-500 mt-2 italic">Saldo Anda kosong, tidak ada estimasi saat ini.</p>
            ) : ratio < 70 ? (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 font-bold flex items-center gap-1">
                <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Aman: Anda masih punya ruang.
              </p>
            ) : ratio <= 90 ? (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-bold flex items-center gap-1">
                <span className="size-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                Waspada: Mendekati batas aman.
              </p>
            ) : (
              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-2 font-bold flex items-center gap-1">
                <span className="size-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                Bahaya: Berhenti! Anda boros.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
