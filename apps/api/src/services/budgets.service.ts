import { db } from '../db/index.js';
import { budgets, transactions } from '../db/schema.js';
import { eq, and, gte, lte, or, isNull, ilike } from 'drizzle-orm';
import { createTransaction } from './transactions.service.js';
import type { NewBudget } from '../db/schema.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthBounds(month: string) {
  const [yearStr, monStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monStr, 10);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const start = `${year}-${pad(mon)}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${year}-${pad(mon)}-${pad(lastDay)}`;
  return { start, end };
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Returns budgets with dynamically computed `spent` for the given month.
 * `spent` = sum of expense transactions for that category - sum of income transactions for that category
 */
export async function getBudgets(userId: string, month?: string, date?: string, startDate?: string, endDate?: string) {
  console.log(`[getBudgets DB] userId: ${userId}, month: ${month}, date: ${date}, startDate: ${startDate}, endDate: ${endDate}`);
  
  // 1. Fetch budgets for this user (either permanent or belonging to this specific date)
  const conditions: any[] = [eq(budgets.userId, userId)];
  
  if (date) {
    conditions.push(or(isNull(budgets.date), eq(budgets.date, date)));
  } else if (startDate && endDate) {
    conditions.push(or(
      isNull(budgets.date),
      and(gte(budgets.date, startDate), lte(budgets.date, endDate))
    ));
  } else if (month) {
    const { start, end } = getMonthBounds(month);
    conditions.push(or(
      isNull(budgets.date),
      and(gte(budgets.date, start), lte(budgets.date, end))
    ));
  } else {
    conditions.push(isNull(budgets.date));
  }

  const userBudgets = await db
    .select()
    .from(budgets)
    .where(and(...conditions))
    .orderBy(budgets.createdAt);

  const defaultCategories = [
    { name: 'Makan & Minum', icon: 'restaurant', color: 'orange-500' },
    { name: 'Transportasi', icon: 'directions_car', color: 'blue-500' }
  ];

  // Cleanup old default category "Makan" if it exists (both permanent and daily ones, case insensitive)
  const makanBudgets = userBudgets.filter(b => b.category.toLowerCase() === 'makan');
  if (makanBudgets.length > 0) {
    const idsToDelete = makanBudgets.map(b => b.id);
    await db.delete(budgets).where(and(eq(budgets.userId, userId), or(...idsToDelete.map(id => eq(budgets.id, id)))));
    for (let i = userBudgets.length - 1; i >= 0; i--) {
      if (userBudgets[i].category.toLowerCase() === 'makan') {
        userBudgets.splice(i, 1);
      }
    }
  }

  for (const defCat of defaultCategories) {
    if (!userBudgets.find(b => b.category === defCat.name && b.date === null)) {
      const [newBudget] = await db.insert(budgets).values({
        userId,
        category: defCat.name,
        icon: defCat.icon,
        color: defCat.color,
        limitAmount: 0,
        date: null, // Makes it a permanent default
      }).returning();
      userBudgets.push(newBudget);
    }
  }

  if (!month && !date) {
    return userBudgets.map((b) => ({ ...b, spent: 0 }));
  }

  let txConditions = [eq(transactions.userId, userId)];

  if (startDate && endDate) {
    txConditions.push(gte(transactions.date, startDate));
    txConditions.push(lte(transactions.date, endDate));
  } else if (date) {
    txConditions.push(eq(transactions.date, date));
  } else if (month) {
    const { start, end } = getMonthBounds(month);
    txConditions.push(gte(transactions.date, start));
    txConditions.push(lte(transactions.date, end));
  }

  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(and(...txConditions));

  console.log(`[getBudgets] Fetched ${monthTransactions.length} transactions for month`);
  
  return userBudgets.map((b) => {
    const expenses = monthTransactions
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((sum, t) => sum + t.amount, 0);
    const refunds = monthTransactions
      .filter((t) => t.type === 'income' && t.category === b.category)
      .reduce((sum, t) => sum + t.amount, 0);
    const spent = Math.max(0, expenses - refunds);
    return { ...b, spent };
  });
}

export async function createBudget(
  userId: string,
  data: Omit<NewBudget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
) {
  const [created] = await db
    .insert(budgets)
    .values({ ...data, userId })
    .returning();
  return created;
}

export async function updateBudget(
  userId: string,
  id: string,
  data: Partial<Pick<NewBudget, 'category' | 'limitAmount' | 'icon' | 'color' | 'description'>>,
) {
  const [oldBudget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

  if (!oldBudget) throw new Error('Budget not found');

  const [updated] = await db
    .update(budgets)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning();

  // Cascade category rename to transactions so balance is not lost
  if (data.category && data.category !== oldBudget.category) {
    console.log(`[updateBudget] Renaming category from "${oldBudget.category}" to "${data.category}"`);
    const updateResult = await db
      .update(transactions)
      .set({ category: data.category })
      .where(and(eq(transactions.userId, userId), eq(transactions.category, oldBudget.category)))
      .returning();
    console.log(`[updateBudget] Updated ${updateResult.length} transactions`);
  }

  return updated;
}

export async function deleteBudget(userId: string, id: string) {
  const [budgetToDel] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

  if (!budgetToDel) throw new Error('Budget not found');

  const [deleted] = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning();

  // Refund balances strictly assigned to this budget by deleting all its transactions
  await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.category, budgetToDel.category)
      )
    );

  return deleted;
}

/**
 * Records a budget expense — creates an expense transaction for that category.
 */
export async function depositBudget(
  userId: string,
  budgetId: string,
  amount: number,
  date?: string
) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));

  if (!budget) throw new Error('Budget not found');

  return createTransaction(userId, {
    amount,
    type: 'expense',
    category: budget.category,
    note: `Pengeluaran Budget ${budget.category}`,
    icon: budget.icon,
    date: date || new Date().toISOString().split('T')[0],
  });
}

/**
 * Allocates funds to a budget — increases the budget limit and records an expense transaction
 * (allocation comes out of the user's balance).
 */
export async function withdrawBudget(
  userId: string,
  budgetId: string,
  amount: number,
  date?: string
) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));

  if (!budget) throw new Error('Budget not found');

  // Compute spent to ensure they aren't withdrawing more than available logic requires
  const month = date ? date.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const budgetsWithSpent = await getBudgets(userId, month);
  const budgetWithSpent = budgetsWithSpent.find(b => b.id === budgetId);
  const spent = budgetWithSpent?.spent || 0;

  if (amount > spent) {
    throw new Error(`Refund melebihi pengeluaran. Maksimal refund: Rp ${spent.toLocaleString('id-ID')}`);
  }

  // Record refund as negative expense (by recording as income specifically for this budget category)
  // This helps correct the 'spent' calculation without needing complex DB changes.
  return createTransaction(userId, {
    amount,
    type: 'income',
    category: budget.category,
    note: `Refund Budget ${budget.category}`,
    icon: 'sync_alt',
    date: date || new Date().toISOString().split('T')[0],
  });
}
