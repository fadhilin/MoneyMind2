import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Saving } from '../types/finance';

export interface CreateSavingInput {
  name: string;
  targetAmount: number;
  icon?: string;
  color?: string;
}

export interface UpdateSavingInput {
  name?: string;
  targetAmount?: number;
  icon?: string;
  color?: string;
}

export async function getSavings(): Promise<Saving[]> {
  return await db.savings.toArray();
}

export async function createSaving(input: CreateSavingInput): Promise<Saving> {
  const newSaving: Saving = {
    id: uuidv4(),
    name: input.name,
    target: input.targetAmount,
    current: 0,
    icon: input.icon || 'default',
    color: input.color || '#cccccc',
  };
  await db.savings.add(newSaving);
  return newSaving;
}

export async function updateSaving(id: string, input: UpdateSavingInput): Promise<Saving> {
  const s = await db.savings.get(id);
  if (!s) throw new Error('Saving not found');
  
  if (input.name !== undefined) s.name = input.name;
  if (input.targetAmount !== undefined) s.target = input.targetAmount;
  if (input.icon !== undefined) s.icon = input.icon;
  if (input.color !== undefined) s.color = input.color;

  await db.savings.put(s);
  return s;
}

export async function deleteSaving(id: string, date?: string): Promise<Saving> {
  const s = await db.savings.get(id);
  if (s) {
    if (s.current > 0) {
      // Restore the saving money back to the wallet as income
      await db.transactions.add({
        id: uuidv4(),
        type: 'expense',
        amount: -s.current,
        category: 'Pencairan Tabungan',
        date: date || new Date().toISOString(),
        note: `Pencairan tabungan dari penghapusan ${s.name}`,
        icon: s.icon
      });
    }
    await db.savings.delete(id);
  }
  return s as Saving;
}

export async function depositSaving(id: string, amount: number, date?: string): Promise<void> {
  const s = await db.savings.get(id);
  if (!s) return;

  // Deduct from wallet (create expense)
  await db.transactions.add({
    id: uuidv4(),
    type: 'expense',
    amount: amount,
    category: 'Tabungan',
    date: date || new Date().toISOString(),
    note: `Setor ke tabungan: ${s.name}`,
    icon: s.icon
  });

  s.current += amount;
  await db.savings.put(s);
}

export async function withdrawSaving(id: string, amount: number, date?: string): Promise<void> {
  const s = await db.savings.get(id);
  if (!s) return;

  // Add to wallet (create income)
  await db.transactions.add({
    id: uuidv4(),
    type: 'expense',
    amount: -amount,
    category: 'Pencairan Tabungan',
    date: date || new Date().toISOString(),
    note: `Tarik dari tabungan: ${s.name}`,
    icon: s.icon
  });

  s.current -= amount;
  if (s.current < 0) s.current = 0;
  await db.savings.put(s);
}

export async function autoAllocateSaving(id: string, month: string, date?: string): Promise<void> {
  const s = await db.savings.get(id);
  if (!s) return;

  // 1. Calculate the total balance from that month
  const start = new Date(`${month}-01T00:00:00.000Z`).toISOString();
  const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
  
  const txs = await db.transactions.filter(tx => tx.date >= start && tx.date <= end).toArray();
  const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  if (totalBalance <= 0) return; // Cannot allocate

  // Standard allocation is 20%
  const amountToAllocate = Math.floor(totalBalance * 0.20);
  
  if (amountToAllocate > 0) {
    await depositSaving(id, amountToAllocate, date);
  }
}
