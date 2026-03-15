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
    date:
      date && date.length === 10
        ? `${date}T${new Date().toISOString().split("T")[1]}`
        : date || new Date().toISOString(),
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
    date:
      date && date.length === 10
        ? `${date}T${new Date().toISOString().split("T")[1]}`
        : date || new Date().toISOString(),
    note: `Tarik dari tabungan: ${s.name}`,
    icon: s.icon
  });

  s.current -= amount;
  if (s.current < 0) s.current = 0;
  await db.savings.put(s);
}

export async function autoAllocateSaving(id: string, _month: string, date?: string, amount?: number): Promise<void> {
  const s = await db.savings.get(id);
  if (!s) return;

  let amountToAllocate = amount;

  if (amountToAllocate === undefined) {
    // 1. Calculate the global balance (all-time)
    const allTxs = await db.transactions.toArray();
    const globalIncome = allTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const globalExpense = allTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const globalBalance = globalIncome - globalExpense;

    if (globalBalance <= 0) return; // Cannot allocate
    
    // Exactly 10%
    amountToAllocate = Math.floor(globalBalance * 0.10);
  }
  
  if (amountToAllocate > 0) {
    await depositSaving(id, amountToAllocate, date);
  }
}
