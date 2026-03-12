import { NavLink } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useGlobalDate } from '../hooks/useGlobalDate';

const TransactionHistory = () => {
  const { data } = useTransactions({}); // No date filter for general history
  const transactions = data?.data ?? [];
  const recentTransactions = transactions.slice(0, 10);

  return (
    <div className="glass-card p-6 md:p-8 rounded-3xl md:rounded-4xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-black dark:text-white">Transaksi Terakhir</h3>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Aktivitas Terbaru</p>
        </div>
        <NavLink
          to="/transactions"
          className="text-xs font-bold bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-black dark:text-white"
        >
          Lihat Riwayat
        </NavLink>
      </div>

      <div className="space-y-4">
        {recentTransactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-xl flex items-center justify-center ${
                tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
              }`}>
                <span className="material-symbols-outlined">{tx.icon}</span>
              </div>
              <div>
                <p className="font-bold text-sm text-black dark:text-white truncate max-w-[100px] sm:max-w-[150px]">{tx.note || tx.category}</p>
                <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{tx.category}</span>
                  <span className="size-1 bg-slate-300 rounded-full"></span>
                  <span className="text-[10px] text-slate-500">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {tx.type === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-slate-400">Berhasil</p>
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
            <div className="size-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">receipt_long</span>
            </div>
            <p className="font-bold text-slate-500 dark:text-slate-400">Belum ada transaksi</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Catat pengeluaran atau pemasukan hari ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
