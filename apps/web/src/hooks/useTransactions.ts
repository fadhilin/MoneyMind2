import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as txService from '../services/transactions.service';
import type { CreateTransactionInput, GetTransactionsResponse } from '../services/transactions.service';
import api from '../lib/api';

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
    queryFn: async () => {
      const res = await api.get<GetTransactionsResponse>('/transactions', { params: filters });
      return res.data;
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => txService.createTransaction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      // Also invalidate reports since summary changes
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
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
    },
  });
}
