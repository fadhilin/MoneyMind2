import { NavLink } from 'react-router-dom';
import { useBudgets } from '../hooks/useBudgets';
import { useGlobalDate } from '../hooks/useGlobalDate';

const BudgetSection = () => {
  const [globalDate] = useGlobalDate();
  const month = globalDate.slice(0, 7);
  const { data: budgets = [] } = useBudgets(month);

  const displayBudgets = budgets.slice(0, 3);

  const totalBudgetSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limit, 0);

  return (
    <div className="glass-card p-6 md:p-8 rounded-3xl md:rounded-4xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 h-full shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-black dark:text-white">Budget Terpakai</h3>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
            Rp {totalBudgetSpent.toLocaleString('id-ID')} / Rp {totalBudgetLimit.toLocaleString('id-ID')}
          </p>
        </div>
        <NavLink
          to="/budget"
          className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20 transition-all"
        >
          Lihat Semua
        </NavLink>
      </div>

      <div className="space-y-6">
        {displayBudgets.map((budget) => {
          const percent = budget.limit > 0 ? Math.min(100, Math.round((budget.spent / budget.limit) * 100)) : 0;
          return (
            <div key={budget.id} className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${budget.color}/10 text-${budget.color}`}>
                    <span className="material-symbols-outlined text-xl">{budget.icon}</span>
                  </div>
                  <span className="font-bold text-sm text-black dark:text-white">{budget.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-black dark:text-white">Rp {budget.spent.toLocaleString('id-ID')}</span>
                  <span className="text-[10px] text-slate-500 block">dari Rp {budget.limit.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-${budget.color} rounded-full transition-all duration-1000`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && (
          <div className="py-8 flex flex-col items-center justify-center text-center opacity-60">
            <div className="size-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">account_balance_wallet</span>
            </div>
            <p className="font-bold text-slate-500 dark:text-slate-400 text-sm">Belum ada budget set</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Atur limit anggaran Anda di halaman Budget.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetSection;
