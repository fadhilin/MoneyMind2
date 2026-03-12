import React, { useState } from 'react';
import TransaksiInput from '../components/TransaksiInput';
import { useTransactions } from '../hooks/useTransactions';
import { useGlobalDate } from '../hooks/useGlobalDate';

const Transactions: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const [search, setSearch] = useState('');
  const [globalDate, setGlobalDate] = useGlobalDate();
  const selectedMonth = globalDate.slice(0, 7);

  const { data, isLoading } = useTransactions({
    month: selectedMonth,
    // Remover date filter so it shows the whole month history
    type: filter === 'all' ? undefined : filter,
    search: search || undefined,
  });

  const rawTransactions = data?.data ?? [];

  // Sort logic
  const transactions = [...rawTransactions].sort((a, b) => {
    if (sortOrder === 'asc') return a.amount - b.amount;
    if (sortOrder === 'desc') return b.amount - a.amount;
    return 0;
  });

  // Group by date
  const grouped = transactions.reduce((acc, t) => {
    const d = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[d]) acc[d] = [];
    acc[d].push(t);
    return acc;
  }, {} as Record<string, typeof transactions>);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6 md:mb-10 p-2 md:p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Riwayat Transaksi</h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Lacak semua pengeluaran dan pemasukan Anda</p>
          </div>
          <div className="relative w-full md:w-80 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 md:py-3 bg-white dark:bg-white/5 border-none rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-primary transition-all dark:text-white text-sm"
              placeholder="Cari transaksi..."
              type="text"
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 mt-6 md:mt-8">
          {/* Top Row: Type Filters & Date Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'income', 'expense'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[13px] md:text-sm font-semibold transition-all ${
                    filter === f
                      ? f === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/25'
                        : f === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                      : 'bg-white dark:bg-[#121620] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 shadow-sm'
                  }`}
                >
                  {f === 'all' ? 'Semua' : f === 'income' ? 'Masuk' : 'Keluar'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={globalDate}
                onChange={(e) => setGlobalDate(e.target.value)}
                className="w-full sm:w-auto px-4 md:px-5 py-2 md:py-2.5 bg-white dark:bg-[#121620] border border-slate-200 dark:border-white/5 rounded-full text-xs md:text-sm font-bold text-slate-600 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary scheme-light dark:scheme-dark z-20 cursor-pointer shadow-sm"
                title="Pilih Bulan"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-10 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mb-4" />
            <p>Memuat transaksi...</p>
          </div>
        ) : Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([date, items], index) => (
            <section key={date}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-2 gap-2">
                <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">{date}</h3>
                {index === 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'none' : 'asc')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 md:px-4 py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold transition-all border ${
                        sortOrder === 'asc' 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-[#121620] text-slate-400 border-white/5 hover:bg-[#1a1f2c]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] md:text-sm">arrow_upward</span>
                      Terendah
                    </button>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'desc' ? 'none' : 'desc')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 md:px-4 py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold transition-all border ${
                        sortOrder === 'desc' 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-[#121620] text-slate-400 border-white/5 hover:bg-[#1a1f2c]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] md:text-sm">arrow_downward</span>
                      Tertinggi
                    </button>
                    {sortOrder !== 'none' && (
                      <button
                        onClick={() => setSortOrder('none')}
                        className="flex items-center justify-center gap-1 px-2 md:px-3 py-2 rounded-xl text-[10px] md:text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all underline decoration-rose-500/30"
                      >
                        <span className="material-symbols-outlined text-[16px] md:text-sm">restart_alt</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {items.map((tx) => (
                  <div key={tx.id} className="glass p-3 md:p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      <div className={`size-10 md:size-12 shrink-0 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/20 text-orange-500'}`}>
                        <span className="material-symbols-outlined text-xl md:text-2xl">{tx.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm md:text-base text-black dark:text-white truncate">{tx.note || tx.category}</p>
                        <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 truncate">{tx.category} • {new Date(tx.date).toLocaleDateString('id-ID', { month: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 z-10 shrink-0">
                      <span className={`font-bold text-base md:text-lg ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.type === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4">history_toggle_off</span>
            <p className="font-medium text-lg">Tidak ada transaksi ditemukan</p>
            <p className="text-sm">Mungkin kamu bisa mencatat sesuatu hari ini?</p>
          </div>
        )}
      </div>

      <TransaksiInput isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Transactions;
