import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as txService from '../services/transactions.service';
import type { CreateTransactionInput } from '../services/transactions.service';

export const TRANSACTIONS_KEY = 'transactions';

export interface TransactionsFilters {
  month?: string;
  date?: string;
  type?: 'income' | 'expense';
  search?: string;
}

export function useTransactions(filters: TransactionsFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => txService.getTransactions(filters),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => {
      // Always store as plain YYYY-MM-DD to avoid timezone shifts
      const normalizedDate = input.date && input.date.length >= 10
        ? input.date.slice(0, 10)
        : new Date().toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD in local timezone
      return txService.createTransaction({ ...input, date: normalizedDate });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['savings'] });
      
      // Proactive sync
      import('../lib/sync').then(({ syncData }) => syncData()).catch(console.error);
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => txService.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });

      // Proactive sync
      import('../lib/sync').then(({ syncData }) => syncData()).catch(console.error);
    },
  });
}

export function useDeleteTransactionsByMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (yearMonth: string) => txService.deleteTransactionsByMonth(yearMonth),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['savings'] });

      // Proactive sync
      import('../lib/sync').then(({ syncData }) => syncData()).catch(console.error);
    },
  });
}

export function useDeleteTransactionsByDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dateValue: string) => txService.deleteTransactionsByDate(dateValue),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['savings'] });

      // Proactive sync
      import('../lib/sync').then(({ syncData }) => syncData()).catch(console.error);
    },
  });
}
