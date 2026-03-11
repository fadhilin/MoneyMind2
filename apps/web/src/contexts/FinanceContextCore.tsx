import { createContext, useContext } from 'react';
import type { FinanceState, Transaction, Budget, Saving } from '../types/finance';

export interface FinanceContextType extends FinanceState {
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  addBudget: (budget: Omit<Budget, 'id' | 'spent'>) => void;
  deleteBudget: (id: string) => void;
  depositBudget: (id: string, amount: number) => void;
  withdrawBudget: (id: string, amount: number) => void;
  addSaving: (saving: Omit<Saving, 'id' | 'current'>) => void;
  updateSaving: (id: string, updates: Partial<Saving>) => void;
  deleteSaving: (id: string) => void;
  depositSaving: (id: string, amount: number) => void;
  withdrawSaving: (id: string, amount: number) => void;
  autoAllocateSavings: (savingId: string) => void;
  clearIncomeTransactions: () => void;
  setSelectedMonth: (date: Date) => void;
  totalIncome: number;
  realIncome: number;
  totalExpense: number;
  adjustedExpense: number;
  totalBalance: number;
  totalBudgetSpent: number;
  totalBudgetLimit: number;
  safetySpend: number;
}

export const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
