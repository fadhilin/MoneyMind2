import React, { useState } from 'react';
import HeroSection from '../components/HeroSection';
import StatsRow from '../components/StatsRow';
import BudgetSection from '../components/BudgetSection';
import TransactionHistory from '../components/TransactionHistory';
import TransaksiInput from '../components/TransaksiInput';
import OnboardingGuide from '../components/OnboardingGuide';

const Dashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in zoom-in-95 duration-500">
      <HeroSection />
      <StatsRow />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BudgetSection />
        <TransactionHistory />
      </div>
      <TransaksiInput isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <OnboardingGuide />

      {/* Action Button Khusus Desktop/Tab (hidden on mobile) */}
      <button
        onClick={() => window.dispatchEvent(new Event("open-quick-input"))}
        className="fixed bottom-8 right-8 z-40 bg-rose-500 text-white size-16 rounded-full shadow-xl shadow-rose-500/30 hover:scale-110 hover:-translate-y-1 active:scale-95 transition-all lg:flex items-center justify-center group ring-4 ring-white dark:ring-[#151121] hidden"
        aria-label="Catat Pengeluaran Cepat"
      >
        <span className="material-symbols-outlined text-3xl group-hover:animate-pulse">remove</span>
      </button>
    </div>
  );
};

export default Dashboard;
