import { useState } from 'react';
import { useReminders } from '../hooks/useReminders';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';

interface ReminderPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconOptions = [
  { id: 'bolt', label: 'Listrik' },
  { id: 'water_drop', label: 'Air (PDAM)' },
  { id: 'wifi', label: 'Internet' },
  { id: 'phone_iphone', label: 'HP / Pulsa' },
  { id: 'home', label: 'Kos/Sewa' },
  { id: 'payments', label: 'Cicilan' },
  { id: 'credit_card', label: 'Kartu Kredit' },
  { id: 'school', label: 'Pendidikan' },
  { id: 'health_and_safety', label: 'Asuransi' },
  { id: 'directions_car', label: 'Kendaraan' },
  { id: 'alarm', label: 'Lainnya' },
];

export default function ReminderPanel({ isOpen, onClose }: ReminderPanelProps) {
  const { reminders, addReminder, removeReminder, toggleReminder } = useReminders();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [amount, setAmount] = useState('');
  const [icon, setIcon] = useState('alarm');

  const handleAdd = async () => {
    if (!name.trim() || !day) return alert('Lengkapi nama dan tanggal');
    const dayNum = parseInt(day);
    if (dayNum < 1 || dayNum > 31) return alert('Tanggal harus 1-31');
    
    await addReminder({
      name: name.trim(),
      dayOfMonth: dayNum,
      amount: amount ? parseInt(parseCurrencyInput(amount)) : undefined,
      icon,
    });
    setName('');
    setDay('');
    setAmount('');
    setIcon('alarm');
    setIsAdding(false);
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] flex flex-col glass-card rounded-2xl shadow-2xl bg-white dark:bg-[#151121]/95 border border-slate-200 dark:border-primary/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
          <div>
            <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">alarm</span>
              Pengingat Pembayaran
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{reminders.length} pengingat aktif</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-rose-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {reminders.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
              <span className="material-symbols-outlined text-5xl mb-3">event_upcoming</span>
              <p className="font-bold text-sm">Belum ada pengingat</p>
              <p className="text-xs mt-1">Tambahkan pengingat pembayaran rutin Anda</p>
            </div>
          )}

          {reminders.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                r.enabled
                  ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'
                  : 'bg-slate-50 dark:bg-white/2 border-slate-100 dark:border-white/5 opacity-50'
              }`}
            >
              <div className={`p-2 rounded-lg ${r.enabled ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                <span className="material-symbols-outlined text-xl">{r.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-black dark:text-white truncate">{r.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500 font-medium">Tanggal {r.dayOfMonth}</span>
                  {r.amount && (
                    <>
                      <span className="size-1 bg-slate-300 rounded-full"></span>
                      <span className="text-[10px] text-slate-500 font-medium">Rp {r.amount.toLocaleString('id-ID')}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleReminder(r.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${r.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-0.5 size-4 bg-white rounded-full shadow-sm transition-transform ${r.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Hapus pengingat "${r.name}"?`)) removeReminder(r.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}

          {/* Add New Form */}
          {isAdding && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 animate-in slide-in-from-bottom-2 space-y-3">
              <h4 className="text-sm font-bold text-primary">Tambah Pengingat Baru</h4>
              
              {/* Icon Selector */}
              <div className="flex gap-2 flex-wrap">
                {iconOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setIcon(opt.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      icon === opt.id ? 'bg-primary text-white' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                    title={opt.label}
                  >
                    <span className="material-symbols-outlined text-sm">{opt.id}</span>
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
              </div>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama (misal: Bayar Listrik)"
                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-hidden text-black dark:text-white"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tanggal (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    placeholder="Tanggal"
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-hidden text-black dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nominal (Opsional)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount ? formatCurrencyInput(amount) : ''}
                    onChange={(e) => setAmount(parseCurrencyInput(e.target.value))}
                    placeholder="Rp"
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-hidden text-black dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
                  disabled={!name.trim() || !day}
                >
                  Simpan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer button */}
        {!isAdding && (
          <div className="p-5 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add_alert</span>
              Tambah Pengingat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
