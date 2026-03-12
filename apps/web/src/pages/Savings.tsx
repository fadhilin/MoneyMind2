import React, { useState } from 'react';
import type { Saving } from '../types/finance';
import {
  useSavings,
  useCreateSaving,
  useUpdateSaving,
  useDeleteSaving,
  useDepositSaving,
  useWithdrawSaving,
  useAutoAllocateSaving,
} from '../hooks/useSavings';
import { useMonthlySummary } from '../hooks/useReports';
import { useGlobalDate } from '../hooks/useGlobalDate';

const Savings: React.FC = () => {
  const [globalDate] = useGlobalDate();
  const selectedMonth = globalDate.slice(0, 7);

  // Users explicitly want Savings interactions to always drop into "Today", 
  // bypassing whatever historical date they might be viewing.
  const d = new Date();
  const todayDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const { data: savings = [], isLoading } = useSavings();
  const { data: monthSummary } = useMonthlySummary({ month: selectedMonth });
  const { data: dailySummary } = useMonthlySummary({ month: selectedMonth, date: globalDate });

  const createSaving = useCreateSaving();
  const updateSaving = useUpdateSaving();
  const deleteSaving = useDeleteSaving();
  const depositSaving = useDepositSaving();
  const withdrawSaving = useWithdrawSaving();
  const autoAllocate = useAutoAllocateSaving();

  const realIncome = dailySummary?.realIncome ?? 0;
  const safetySpend = monthSummary?.safetySpend ?? 0;
  
  const remainingBudget = monthSummary?.globalBalance ?? 0;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedSaving, setSelectedSaving] = useState<Saving | null>(null);
  const [txAmount, setTxAmount] = useState('');
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [formData, setFormData] = useState({ name: '', target: '', icon: 'savings', color: 'blue-500' });

  const handleOpenAdd = () => {
    setEditingSaving(null);
    setFormData({ name: '', target: '', icon: 'savings', color: 'blue-500' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Saving) => {
    setEditingSaving(s);
    setFormData({ name: s.name, target: s.target.toString(), icon: s.icon, color: s.color });
    setIsModalOpen(true);
  };

  const handleOpenTx = (s: Saving, type: 'deposit' | 'withdraw') => {
    setSelectedSaving(s);
    setTxType(type);
    setTxAmount('');
    setIsTxModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.target) return alert('Lengkapi data');
    if (editingSaving) {
      updateSaving.mutate({ id: editingSaving.id, input: { name: formData.name, targetAmount: parseInt(formData.target), icon: formData.icon, color: formData.color } });
    } else {
      createSaving.mutate({ name: formData.name, targetAmount: parseInt(formData.target), icon: formData.icon, color: formData.color });
    }
    setIsModalOpen(false);
  };

  const handleTxSubmit = () => {
    if (!selectedSaving || !txAmount) return;
    const amount = parseInt(txAmount);
    if (txType === 'deposit') {
      if (amount > remainingBudget) {
        return alert(`Oops! Saldo Anda tidak cukup. Sisa saldo: Rp ${remainingBudget.toLocaleString('id-ID')}`);
      }
      depositSaving.mutate({ id: selectedSaving.id, amount, date: todayDate }, {
        onError: (err: Error) => alert(err.message || 'Gagal deposit')
      });
    } else {
      if (amount > selectedSaving.current) {
        return alert(`Gagal! Saldo di target ini hanya Rp ${selectedSaving.current.toLocaleString('id-ID')}`);
      }
      withdrawSaving.mutate({ id: selectedSaving.id, amount, date: todayDate }, {
        onError: (err: Error) => alert(err.message || 'Gagal withdraw')
      });
    }
    setIsTxModalOpen(false);
  };

  const handleAutoAllocate = (savingId: string) => {
    const amountToAllocate = Math.round(realIncome * 0.1);
    if (amountToAllocate <= 0) return alert('Target tabungan belum bisa ditentukan karena pemasukan masih Rp 0');
    if (amountToAllocate > remainingBudget) return alert(`Saldo tidak mencukupi (Dibutuhkan: Rp ${amountToAllocate.toLocaleString('id-ID')}, Tersedia: Rp ${remainingBudget.toLocaleString('id-ID')})`);
    autoAllocate.mutate({ id: savingId, month: selectedMonth, date: todayDate });
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 animate-in fade-in zoom-in-95 duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">Tabungan</h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola rencana masa depan Anda</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-primary text-white px-5 md:px-6 py-2.5 rounded-xl font-bold text-[13px] md:text-sm shadow-xl shadow-primary/30 hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm md:text-base">add</span>
          Target Baru
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            </div>
          ) : savings.length > 0 ? savings.map((saving) => {
            const percent = Math.round((saving.current / saving.target) * 100);
            return (
              <div key={saving.id} className="glass-card p-6 md:p-8 rounded-3xl md:rounded-4xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 group hover:shadow-2xl transition-all shadow-sm relative">
                <div className="absolute top-4 md:top-6 right-4 md:right-6 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(saving)} className="p-1.5 md:p-2 bg-slate-100 dark:bg-white/10 rounded-lg hover:text-primary transition-colors text-black dark:text-white">
                    <span className="material-symbols-outlined text-xs md:text-sm">edit</span>
                  </button>
                  <button onClick={() => deleteSaving.mutate({ id: saving.id, date: globalDate })} className="p-1.5 md:p-2 bg-slate-100 dark:bg-white/10 rounded-lg hover:text-rose-500 transition-colors text-black dark:text-white">
                    <span className="material-symbols-outlined text-xs md:text-sm">delete</span>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-4 md:gap-6">
                  <div className="flex gap-4 md:gap-6">
                    <div className={`size-12 md:size-16 rounded-xl md:rounded-2xl bg-${saving.color.replace('-500', '')}/10 text-${saving.color} flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined text-2xl md:text-3xl">{saving.icon}</span>
                    </div>
                    <div className="min-w-0 pr-12 sm:pr-0">
                      <h3 className="text-xl md:text-2xl font-bold text-black dark:text-white truncate">{saving.name}</h3>
                      <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-2">
                        <span className="text-[11px] md:text-sm font-bold text-slate-400">Target: Rp {saving.target.toLocaleString('id-ID')}</span>
                        <span className="px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black bg-primary/10 text-primary">{percent}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col justify-between sm:text-right items-center sm:items-end">
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] md:text-sm text-slate-500 uppercase font-black tracking-widest leading-none">Terkumpul</p>
                      <p className="text-xl md:text-2xl font-black text-primary">Rp {saving.current.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex gap-2 sm:mt-4">
                      <button onClick={() => handleOpenTx(saving, 'deposit')} className="text-[9px] md:text-[10px] px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg font-bold hover:bg-emerald-500 hover:text-white transition-colors">Tambah</button>
                      <button onClick={() => handleOpenTx(saving, 'withdraw')} className="text-[9px] md:text-[10px] px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg font-bold hover:bg-rose-500 hover:text-white transition-colors">Ambil</button>
                    </div>
                  </div>
                </div>
                <div className="mt-6 md:mt-8">
                  <div className="flex justify-between text-[10px] md:text-xs font-bold mb-2 text-slate-400">
                    <span>Progres Tabungan</span>
                  </div>
                  <div className="w-full h-3 md:h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, percent)}%` }}></div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="glass-card p-8 md:p-12 rounded-3xl md:rounded-4xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl md:text-5xl text-slate-300 dark:text-slate-700 mb-4">savings</span>
              <p className="text-sm md:text-base text-slate-500">Belum ada target tabungan.</p>
            </div>
          )}
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* Safety Spend Card */}
          <div className="glass-card p-6 md:p-8 rounded-3xl md:rounded-4xl bg-linear-to-br from-primary/10 to-transparent border border-primary/20 shadow-sm">
            <h4 className="text-base md:text-lg font-bold mb-2 text-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl md:text-2xl">shield_with_heart</span>
              Safety Spend
            </h4>
            <p className="text-xl md:text-2xl font-black text-black dark:text-white mb-1">Rp {safetySpend.toLocaleString('id-ID')}</p>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Batas aman pengeluaran Anda agar target tabungan tetap terjaga.</p>
          </div>

          {/* Tips Nabung */}
          <div className="glass-card p-6 md:p-8 rounded-3xl md:rounded-4xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
            <h4 className="text-base md:text-lg font-bold mb-2 text-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl md:text-2xl">lightbulb</span>
                Saran Nabung
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-[13px] md:text-sm leading-relaxed mb-6">
              Dengan pemasukan <b className="text-black dark:text-white">Rp {realIncome.toLocaleString('id-ID')}</b>, alokasikan 10% (Rp {(realIncome * 0.1).toLocaleString('id-ID')}) untuk target Anda:
            </p>
            {savings.length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                <p className="text-[10px] font-bold uppercase text-slate-400">Pilih Target:</p>
                {savings.slice(0, 2).map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleAutoAllocate(s.id)}
                    className="w-full py-2.5 md:py-3 bg-slate-50 dark:bg-white/5 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs md:text-sm transition-all text-left px-4 flex justify-between group"
                  >
                    <span className="truncate mr-4">{s.name}</span>
                    <span className="material-symbols-outlined text-primary group-hover:text-white text-sm md:text-base">bolt</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-500">Belum ada target tabungan.</p>
            )}
          </div>
        </div>
      </div>

      {/* Saving Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151121] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-white/10">
            <h3 className="text-2xl font-bold mb-6 text-black dark:text-white">{editingSaving ? 'Edit Target' : 'Target Baru'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Nama Target</label>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-black dark:text-white focus:border-primary outline-none" placeholder="Contoh: Beli Laptop" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Nominal Target (Rp)</label>
                <input type="number" value={formData.target} onChange={e => setFormData({ ...formData, target: e.target.value })} className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-black dark:text-white focus:border-primary outline-none" placeholder="0" />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all">Batal</button>
                <button onClick={handleSave} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151121] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-white/10">
            <h3 className="text-2xl font-bold mb-6 text-black dark:text-white">
              {txType === 'deposit' ? 'Tambah Tabungan' : 'Ambil Tabungan'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">Target: <span className="font-bold text-primary">{selectedSaving?.name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Nominal (Rp)</label>
                <input type="number" autoFocus value={txAmount} onChange={e => setTxAmount(e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-black dark:text-white focus:border-primary outline-none text-xl font-bold" placeholder="0" />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsTxModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all">Batal</button>
                <button onClick={handleTxSubmit} className={`flex-1 py-3 ${txType === 'deposit' ? 'bg-emerald-500' : 'bg-rose-500'} text-white font-bold rounded-xl shadow-lg transition-all hover:brightness-110`}>Konfirmasi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Savings;
