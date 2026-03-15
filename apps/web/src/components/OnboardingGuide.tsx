import React, { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from '../hooks/useAuth';

const STEPS = [
  {
    title: 'Selamat Datang di MoneyMind!',
    description: 'Aplikasi pencatat keuangan modern yang membantu Anda mengelola uang dengan lebih pintar dan mudah.',
    icon: 'waving_hand',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10'
  },
  {
    title: 'Atur Tanggal Kapan Saja',
    description: 'Klik teks tanggal atau icon kalender di bagian atas untuk melihat atau menambah data pada tanggal berapapun secara fleksibel.',
    icon: 'calendar_month',
    color: 'text-primary',
    bg: 'bg-primary/10'
  },
  {
    title: 'Pantau Budget & Tabungan',
    description: 'Pisahkan uang Anda ke dalam berbagai kategori budget dan target tabungan agar keuangan lebih terkontrol.',
    icon: 'savings',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10'
  },
  {
    title: 'Mulai Catat Transaksimu',
    description: 'Gunakan tombol + Transaksi Baru di sidebar Dashboard untuk mulai mencatat pemasukan dan pengeluaran harian.',
    icon: 'add_circle',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10'
  }
];

const OnboardingGuide: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the guide
    const checkOnboarding = async () => {
      if (user?.id) {
        const { value: hasSeen } = await Preferences.get({ key: `finance_control_onboarded_${user.id}` });
        if (!hasSeen) {
          setIsOpen(true);
        }
      }
    };
    checkOnboarding();
  }, [user]);

  const handleClose = async () => {
    if (user?.id) {
      await Preferences.set({ key: `finance_control_onboarded_${user.id}`, value: 'true' });
    }
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#151121] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden">
        
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-black dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center mt-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${step.bg}`}>
            <span className={`material-symbols-outlined text-4xl ${step.color}`}>{step.icon}</span>
          </div>
          
          <h3 className="text-2xl font-black text-black dark:text-white mb-3">
            {step.title}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 h-16">
            {step.description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-primary' : 'w-2 bg-slate-200 dark:bg-white/10'}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button 
              onClick={handlePrev}
              className="px-5 py-3 rounded-xl font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              Kembali
            </button>
          )}
          <button 
            onClick={handleNext}
            className="flex-1 py-3 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/30 hover:brightness-110 transition-all"
          >
            {currentStep === STEPS.length - 1 ? 'Mulai Sekarang' : 'Selanjutnya'}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default OnboardingGuide;
