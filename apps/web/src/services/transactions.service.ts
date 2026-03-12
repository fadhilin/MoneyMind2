import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, ApiTransactionMeta, TransactionType } from '../types/finance';

export interface GetTransactionsParams {
  month?: string;
  date?: string;
  type?: TransactionType;
  search?: string;
}

export interface GetTransactionsResponse {
  data: Transaction[];
  meta: ApiTransactionMeta;
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  icon?: string;
  date: string;
}

export async function getTransactions(params: GetTransactionsParams = {}): Promise<GetTransactionsResponse> {
  // Sort by date descending
  let data = await db.transactions.orderBy('date').reverse().toArray();

  if (params.month) {
    const start = new Date(`${params.month}-01T00:00:00.000Z`).toISOString();
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    data = data.filter(tx => tx.date >= start && tx.date <= end);
  }

  if (params.date) {
    data = data.filter(tx => tx.date.startsWith(params.date as string));
  }

  if (params.type) {
    data = data.filter(tx => tx.type === params.type);
  }

  if (params.search) {
    const s = params.search.toLowerCase();
    data = data.filter(tx => 
      (tx.note && tx.note.toLowerCase().includes(s)) || 
      (tx.category && tx.category.toLowerCase().includes(s))
    );
  }

  const meta: ApiTransactionMeta = {
    totalIncome: data.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    totalExpense: data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    totalBalance: 0
  };
  meta.totalBalance = meta.totalIncome - meta.totalExpense;

  return { data, meta };
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const newTx: Transaction = {
    id: uuidv4(),
    ...input,
    note: input.note || '',
    icon: input.icon || '',
  };
  await db.transactions.add(newTx);
  return newTx;
}

export async function deleteTransaction(id: string): Promise<Transaction> {
  const tx = await db.transactions.get(id);
  if (tx) {
    await db.transactions.delete(id);
  }
  return tx as Transaction;
}

export async function deleteTransactionsByMonth(yearMonth: string): Promise<Transaction[]> {
  const start = new Date(`${yearMonth}-01T00:00:00.000Z`).toISOString();
  const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
  const toDelete = await db.transactions.filter(tx => tx.date >= start && tx.date <= end).toArray();
  await db.transactions.bulkDelete(toDelete.map(t => t.id));
  return toDelete;
}

export async function deleteTransactionsByDate(dateValue: string): Promise<Transaction[]> {
  const toDelete = await db.transactions.filter(tx => tx.date.startsWith(dateValue)).toArray();
  await db.transactions.bulkDelete(toDelete.map(t => t.id));
  return toDelete;
}
