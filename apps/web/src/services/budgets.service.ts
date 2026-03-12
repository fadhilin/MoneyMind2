import { db } from "../lib/db";
import { v4 as uuidv4 } from "uuid";
import type { Budget } from "../types/finance";

export interface CreateBudgetInput {
  category: string;
  limitAmount?: number;
  icon?: string;
  color?: string;
  description?: string;
  date?: string | null;
}

export interface UpdateBudgetInput {
  category?: string;
  limitAmount?: number;
  icon?: string;
  color?: string;
  description?: string;
}

export async function getBudgets(
  month?: string,
  date?: string,
): Promise<Budget[]> {
  let budgets = await db.budgets.toArray();

  if (month) {
    const prefix = month;
    budgets = budgets.filter((b) => !b.date || b.date.startsWith(prefix));

    // Ensure default categories exist for this month prefix context if they are not there
    const hasMakan = budgets.some((b) => b.category === "Makan & Minum");
    const hasTransport = budgets.some((b) => b.category === "Transportasi");

    if (!hasMakan) {
      const newM = await createBudget({
        category: "Makan & Minum",
        icon: "restaurant",
        color: "orange-500",
        date: month + "-01",
      });
      budgets.push(newM);
    }
    if (!hasTransport) {
      const newT = await createBudget({
        category: "Transportasi",
        icon: "directions_car",
        color: "blue-500",
        date: month + "-01",
      });
      budgets.push(newT);
    }
  }

  // Calculate `spent` locally based on transactions
  for (const b of budgets) {
    let txQuery = db.transactions.filter((tx) => tx.category === b.category);
    // Use the same priority as reports service
    if (date) {
      txQuery = txQuery.filter((tx) => tx.date.startsWith(date));
    } else if (month) {
      txQuery = txQuery.filter((tx) => tx.date.startsWith(month));
    }

    const relatedTx = await txQuery.toArray();
    const expense = relatedTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const income = relatedTx
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    // Spent is Net Expense
    b.spent = Math.max(0, expense - income);
  }

  return budgets;
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const newBudget: Budget = {
    id: uuidv4(),
    category: input.category,
    limit: input.limitAmount || 0,
    spent: 0,
    icon: input.icon || "default",
    color: input.color || "#cccccc",
    description: input.description,
    date: input.date,
  };
  await db.budgets.add(newBudget);
  return newBudget;
}

export async function updateBudget(
  id: string,
  input: UpdateBudgetInput,
): Promise<Budget> {
  const b = await db.budgets.get(id);
  if (!b) throw new Error("Budget not found");

  if (input.category !== undefined) b.category = input.category;
  if (input.limitAmount !== undefined) b.limit = input.limitAmount;
  if (input.icon !== undefined) b.icon = input.icon;
  if (input.color !== undefined) b.color = input.color;
  if (input.description !== undefined) b.description = input.description;

  await db.budgets.put(b);
  return b;
}

export async function deleteBudget(
  id: string,
  month?: string,
): Promise<Budget> {
  const b = await db.budgets.get(id);
  if (!b) throw new Error("Budget not found");

  if (b.category === "Makan & Minum" || b.category === "Transportasi") {
    throw new Error("Kategori default tidak bisa dihapus");
  }

  // Calculate net spent for this month to refund
  const prefix = month || new Date().toISOString().slice(0, 7);

  // 1. Hapus tulisan ': Transaction[]' agar TypeScript menebak tipenya otomatis
  // 2. Ganti kata 'month' di dalam startsWith menjadi 'prefix'
  const txs = await db.transactions
    .filter((t) => t.category === b.category && t.date.startsWith(prefix))
    .toArray();
  const expense = txs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const income = txs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const spent = expense - income;

  if (spent > 0) {
    await db.transactions.add({
      id: uuidv4(),
      type: "expense",
      amount: -spent,
      category: b.category,
      date: new Date().toISOString(),
      note: `Refund Penghapusan Budget ${b.category}`,
      icon: b.icon,
    });
  }

  await db.budgets.delete(id);
  return b;
}

export async function depositBudget(
  id: string,
  amount: number,
  date?: string,
): Promise<void> {
  const b = await db.budgets.get(id);
  if (!b) return;

  await db.transactions.add({
    id: uuidv4(),
    type: "expense",
    amount: amount,
    category: b.category,
    date:
      date && date.length === 10
        ? `${date}T${new Date().toISOString().split("T")[1]}`
        : date || new Date().toISOString(),
    note: `Alokasi Budget ${b.category}`,
    icon: b.icon,
  });
}

export async function withdrawBudget(
  id: string,
  amount: number,
  date?: string,
): Promise<void> {
  const b = await db.budgets.get(id);
  if (!b) return;

  await db.transactions.add({
    id: uuidv4(),
    type: "expense",
    amount: -amount,
    category: b.category,
    date:
      date && date.length === 10
        ? `${date}T${new Date().toISOString().split("T")[1]}`
        : date || new Date().toISOString(),
    note: `Refund Budget ${b.category}`,
    icon: b.icon,
  });
}
