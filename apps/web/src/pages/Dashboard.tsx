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
    </div>
  );
};

export default Dashboard;
