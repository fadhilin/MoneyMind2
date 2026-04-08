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
    // Use plain YYYY-MM-DD comparisons to avoid timezone boundary issues
    const [yearStr, monStr] = params.month.split('-');
    const year = parseInt(yearStr, 10);
    const mon = parseInt(monStr, 10);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const start = `${year}-${pad(mon)}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const end = `${year}-${pad(mon)}-${pad(lastDay)}`;
    data = data.filter(tx => {
      const txDate = tx.date.slice(0, 10); // Extract YYYY-MM-DD from any format
      return txDate >= start && txDate <= end;
    });
  }

  if (params.date) {
    data = data.filter(tx => tx.date.slice(0, 10) === params.date);
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
  const [yearStr, monStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monStr, 10);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const start = `${year}-${pad(mon)}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${year}-${pad(mon)}-${pad(lastDay)}`;
  const toDelete = await db.transactions.filter(tx => {
    const txDate = tx.date.slice(0, 10);
    return txDate >= start && txDate <= end;
  }).toArray();
  await db.transactions.bulkDelete(toDelete.map(t => t.id));
  return toDelete;
}

export async function deleteTransactionsByDate(dateValue: string): Promise<Transaction[]> {
  const toDelete = await db.transactions.filter(tx => tx.date.slice(0, 10) === dateValue).toArray();
  await db.transactions.bulkDelete(toDelete.map(t => t.id));
  return toDelete;
}
