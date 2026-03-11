import api from '../lib/api';
import type { Transaction, ApiTransactionMeta } from '../types/finance';

export interface GetTransactionsParams {
  month?: string;
  type?: 'income' | 'expense';
  search?: string;
}

export interface GetTransactionsResponse {
  data: Transaction[];
  meta: ApiTransactionMeta;
}

export interface CreateTransactionInput {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note?: string;
  icon?: string;
  date: string;
}

export async function getTransactions(params: GetTransactionsParams = {}): Promise<GetTransactionsResponse> {
  const res = await api.get<GetTransactionsResponse>('/transactions', { params });
  return res.data;
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const res = await api.post<{ data: Transaction }>('/transactions', input);
  return res.data.data;
}

export async function deleteTransaction(id: string): Promise<Transaction> {
  const res = await api.delete<{ data: Transaction }>(`/transactions/${id}`);
  return res.data.data;
}

export async function deleteTransactionsByMonth(yearMonth: string): Promise<Transaction[]> {
  const res = await api.delete<{ data: Transaction[]; count: number }>(`/transactions/month/${yearMonth}`);
  return res.data.data;
}

export async function deleteTransactionsByDate(dateValue: string): Promise<Transaction[]> {
  const res = await api.delete<{ data: Transaction[]; count: number }>(`/transactions/date/${dateValue}`);
  return res.data.data;
}
