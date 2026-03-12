import React, { useState } from 'react';
import type { TransactionType } from '../types/finance';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useBudgets } from '../hooks/useBudgets';
import { useMonthlySummary } from '../hooks/useReports';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalDate } from '../hooks/useGlobalDate';

interface TransaksiInputProps {
  isOpen: boolean;
  onClose: () => void;
}

const incomeCategories = [
  { name: 'Gaji', icon: 'payments', color: 'emerald-500' },
  { name: 'Bonus', icon: 'redeem', color: 'amber-500' },
  { name: 'Investasi', icon: 'trending_up', color: 'blue-500' },
  { name: 'Pinjaman', icon: 'account_balance_wallet', color: 'blue-500' },
  { name: 'Narik / Dagang', icon: 'monetization_on', color: 'blue-500' },
  { name: 'Lainnya', icon: 'more_horiz', color: 'slate-500' },
];

const TransaksiInput: React.FC<TransaksiInputProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [globalDate, setGlobalDate] = useGlobalDate();
  const [date, setDate] = useState<string>(globalDate);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('0');
  const [category, setCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const txMonth = date ? date.slice(0, 7) : globalDate.slice(0, 7);
  const { data: budgets = [] } = useBudgets(txMonth);
  const { data: summary } = useMonthlySummary({ month: txMonth });
  const createTransaction = useCreateTransaction();

  const totalIncome = summary?.totalIncome ?? 0;
  const safetySpend = summary?.safetySpend ?? 0;

  // Sync internal date state with global date whenever it changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setDate(globalDate);
    }
  }, [globalDate, isOpen]);

  const resetForm = () => {
    setType('expense');
    setAmount('0');
    setCategory('');
    setNote('');
    setDate(globalDate);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const displayCategories = type === 'income'
    ? incomeCategories
    : budgets.map(b => ({ name: b.category, icon: b.icon, color: b.color }));

  if (!isOpen) return null;

  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '');
    setAmount(numeric || '0');
  };

  const handleSave = () => {
    const numAmount = parseInt(amount);
    if (numAmount <= 0) return alert('Masukkan nominal yang valid');
    if (!category) return alert('Pilih kategori / buat kategori terlebih dahulu dimenu budget');

    if (type === 'expense') {
      if (totalIncome === 0) {
        return alert('Gagal! Silahkan input pemasukan terlebih dahulu sebelum mencatat pengeluaran.');
      }
      if (numAmount > safetySpend) {
        if (!window.confirm('Hati-hati! Pengeluaran ini akan membuat anda boros melebihi estimasi safety spend. Tetap simpan?')) {
          return;
        }
      }
    }

    const selectedCat = displayCategories.find(c => c.name === category);
    createTransaction.mutate({
      amount: numAmount,
      type,
      category,
      note,
      date,
      icon: selectedCat?.icon || 'payments',
    }, {
      onSuccess: async () => {
        console.log("✅ Transaksi berhasil! Memaksa refresh UI...");
        
        // Sync global calendar UI to the date user just inputted
        setGlobalDate(date);
        
        // Jurus Pamungkas: Refresh SEMUA query yang ada di cache tanpa peduli nama key-nya
        await queryClient.invalidateQueries(); 
        
        handleClose();
      },
      onError: (err: Error) => {
        console.error("❌ Gagal menyimpan:", err);
        alert("Gagal menyimpan transaksi, cek koneksi atau server.");
      }
    });
  };  

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-md select-none"
      onClick={handleClose}
    >
      <div
        className="relative w-full sm:max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] bg-white dark:bg-[#151121]/95 border border-slate-200 dark:border-primary/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-primary/10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-black dark:text-white">Catat Transaksi</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-6 py-6">
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <input checked={type === 'expense'} onChange={() => { setType('expense'); setCategory(''); }} className="hidden peer" name="type" type="radio" />
                  <div className="py-3 text-center rounded-2xl text-sm font-bold transition-all bg-slate-400 dark:bg-white/5 peer-checked:bg-rose-500 peer-checked:text-white text-slate-600 dark:text-slate-400">Pengeluaran</div>
                </label>
              <label className="flex-1 cursor-pointer">
                <input checked={type === 'income'} onChange={() => { setType('income'); setCategory(''); }} className="hidden peer" name="type" type="radio" />
                <div className="py-3 text-center rounded-2xl text-sm font-bold transition-all bg-slate-400 dark:bg-white/5 peer-checked:bg-emerald-500 peer-checked:text-white text-slate-600 dark:text-slate-400">Pemasukan</div>
              </label>
            </div>
          </div>

          <div className="px-6 py-10 text-center bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/5 mx-6 rounded-3xl mb-8">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Nominal Transaksi</p>
            <div className={`text-4xl sm:text-6xl font-black flex justify-center items-baseline gap-2 transition-colors ${amount !== '0' ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className="text-primary text-2xl font-bold">Rp</span>
              <input
                type="text"
                value={amount === '0' ? '' : Number(amount).toLocaleString('id-ID')}
                onChange={(e) => handleAmountChange(e.target.value)}
                autoFocus
                className={`bg-transparent border-none focus:ring-0 w-full text-center outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors ${amount !== '0' ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
                placeholder="0"
              />
            </div>
          </div>

          <div className="px-6 pb-8">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 px-1 uppercase tracking-wider">Kategori</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 md:gap-6">
              {displayCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className={`flex flex-col items-center gap-3 group transition-all w-full overflow-hidden ${category === cat.name ? 'scale-105' : 'hover:scale-102 active:scale-95'}`}
                >
                  <div className={`size-14 md:size-16 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 aspect-square ${category === cat.name ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 group-hover:border-primary/50 group-hover:text-primary'}`}>
                    <span className="material-symbols-outlined text-2xl md:text-3xl">{cat.icon}</span>
                  </div>
                  <span className={`text-[10px] md:text-xs font-bold text-center leading-tight transition-colors w-full truncate px-1 ${category === cat.name ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 space-y-4 mb-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">edit_note</span>
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-base md:text-sm text-black dark:text-white focus:border-primary outline-hidden transition-all placeholder:text-slate-400"
                placeholder="Catatan tambahan..."
                type="text"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-base md:text-sm text-black dark:text-white focus:border-primary outline-hidden transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>

        <footer className="p-6 bg-black/5 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={handleSave}
            disabled={createTransaction.isPending}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createTransaction.isPending ? (
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <span className="material-symbols-outlined">analytics</span>
            )}
            Simpan Transaksi
          </button>
        </footer>
      </div>
    </div>
  );
};

export default TransaksiInput;
