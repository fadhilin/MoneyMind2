import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Transaction, Budget, Saving } from '../types/finance';
import { FinanceContext } from './FinanceContextCore';


export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('fc_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('fc_budgets');
    return saved ? JSON.parse(saved) : [];
  });

  const [savings, setSavings] = useState<Saving[]>(() => {
    const saved = localStorage.getItem('fc_savings');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    localStorage.setItem('fc_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fc_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('fc_savings', JSON.stringify(savings));
  }, [savings]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: Date.now().toString() };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateBudget = (id: string, updates: Partial<Budget>) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const addBudget = (b: Omit<Budget, 'id' | 'spent'>) => {
    setBudgets(prev => [...prev, { ...b, id: Date.now().toString(), spent: 0 }]);
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const addSaving = (s: Omit<Saving, 'id' | 'current'>) => {
    setSavings(prev => [...prev, { ...s, id: Date.now().toString(), current: 0 }]);
  };

  const updateSaving = (id: string, updates: Partial<Saving>) => {
    setSavings(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSaving = (id: string) => {
    setSavings(prev => prev.filter(s => s.id !== id));
  };

  const depositSaving = (id: string, amount: number) => {
    setSavings(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, current: s.current + amount };
      }
      return s;
    }));

    addTransaction({
      amount,
      type: 'expense',
      category: 'Tabungan',
      note: 'Simpan ke Tabungan',
      date: new Date().toLocaleDateString('en-CA'),
      icon: 'savings'
    });
  };

  const withdrawSaving = (id: string, amount: number) => {
    setSavings(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, current: Math.max(0, s.current - amount) };
      }
      return s;
    }));

    addTransaction({
      amount,
      type: 'income',
      category: 'Tarik Tabungan',
      note: 'Ambil dari Tabungan',
      date: new Date().toLocaleDateString('en-CA'),
      icon: 'account_balance_wallet'
    });
  };

  const depositBudget = (id: string, amount: number) => {
    const budget = budgets.find(b => b.id === id);
    if (!budget) return;

    addTransaction({
      amount,
      type: 'expense',
      category: budget.category,
      note: `Pengeluaran Budget ${budget.category}`,
      date: new Date().toLocaleDateString('en-CA'),
      icon: budget.icon
    });
  };

  const withdrawBudget = (id: string, amount: number) => {
    const budget = budgets.find(b => b.id === id);
    if (!budget) return;

    // 1. Tambah ke limit (Allocation)
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, limit: b.limit + amount } : b));

    // 2. Kurangi sisa uang (Create expense transaction)
    addTransaction({
      amount,
      type: 'expense',
      category: 'Alokasi Budget',
      note: `Alokasi dana ke ${budget.category}`,
      date: new Date().toLocaleDateString('en-CA'),
      icon: 'sync_alt'
    });
  };

  const autoAllocateSavings = (savingId: string) => {
    const amountToAllocate = Math.round(totalIncome * 0.1);
    
    if (amountToAllocate <= 0) {
      return alert('Target tabungan belum bisa ditentukan karena pemasukan masih Rp 0');
    }

    if (amountToAllocate > totalBalance) {
      return alert(`Saldo tidak mencukupi untuk alokasi otomatis (Dibutuhkan: Rp ${amountToAllocate.toLocaleString('id-ID')}, Tersedia: Rp ${totalBalance.toLocaleString('id-ID')})`);
    }

    depositSaving(savingId, amountToAllocate);
  };

  // Calculations
  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === selectedMonth.getMonth() && d.getFullYear() === selectedMonth.getFullYear();
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const withdrawals = filteredTransactions
    .filter(t => (t.type === 'income' && t.category === 'Tarik Tabungan'))
    .reduce((acc, t) => acc + t.amount, 0);

  const realIncome = totalIncome - withdrawals;

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const adjustedExpense = totalExpense - withdrawals;

  const totalBalance = totalIncome - totalExpense;
  
  // Dynamic Budget Calculation
  const budgetsWithSpent = budgets.map(b => {
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense' && t.category === b.category)
      .reduce((acc, t) => acc + t.amount, 0);
    const incomeForCategory = filteredTransactions
      .filter(t => t.type === 'income' && t.category === b.category)
      .reduce((acc, t) => acc + t.amount, 0);
    return { ...b, spent: Math.max(0, expenses - incomeForCategory) };
  });

  const totalBudgetSpent = budgetsWithSpent.reduce((acc, b) => acc + b.spent, 0);
  const totalBudgetLimit = budgetsWithSpent.reduce((acc, b) => acc + b.limit, 0);
  
  // Formula: Safety Spend = Sisa Uang (Balance) - Target Tabungan
  const safetySpend = Math.max(0, totalBalance - (realIncome * 0.1));

  const clearIncomeTransactions = () => {
    if (!window.confirm('Hapus seluruh data keuangan bulan ini (Pemasukan, Pengeluaran & Tabungan)?')) return;
    
    setTransactions(prev => prev.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() !== selectedMonth.getMonth() || d.getFullYear() !== selectedMonth.getFullYear();
    }));

    setSavings(prev => prev.map(s => ({ ...s, current: 0 })));
  };

  return (
    <FinanceContext.Provider value={{
      transactions,
      budgets: budgetsWithSpent,
      savings,
      selectedMonth,
      addTransaction,
      deleteTransaction,
      updateBudget,
      addBudget,
      deleteBudget,
      depositBudget,
      withdrawBudget,
      addSaving,
      updateSaving,
      deleteSaving,
      depositSaving,
      withdrawSaving,
      autoAllocateSavings,
      clearIncomeTransactions,
      setSelectedMonth,
      totalIncome,
      realIncome,
      totalExpense,
      adjustedExpense,
      totalBalance,
      totalBudgetSpent,
      totalBudgetLimit,
      safetySpend
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
