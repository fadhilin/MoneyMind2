import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { eq, and, gte, lte, ilike, or } from 'drizzle-orm';
import type { NewTransaction } from '../db/schema.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionFilters {
  month?: string; // "YYYY-MM"
  date?: string;  // "YYYY-MM-DD"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
  type?: 'income' | 'expense';
  search?: string;
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  realIncome: number;
  adjustedExpense: number;
  safetySpend: number;
  dailyExpenses?: { date: string, amount: number }[];
  cumulativeIncome?: number;
  cumulativeBalance?: number;
  globalBalance: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthBounds(month: string): { start: string; end: string } {
  const [yearStr, monStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monStr, 10);

  // Fungsi kecil untuk memastikan angka bulan/hari selalu 2 digit (misal: 2 jadi "02")
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Tanggal awal pasti "01"
  const start = `${year}-${pad(mon)}-01`;

  // Cari tanggal terakhir di bulan tersebut (28, 29, 30, atau 31)
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${year}-${pad(mon)}-${pad(lastDay)}`;

  return { start, end };
}
// ─── Service Functions ────────────────────────────────────────────────────────

export async function getTransactions(userId: string, filters: TransactionFilters) {
  console.log(`[getTransactions DB] filters:`, filters);
  const conditions = [eq(transactions.userId, userId)];

  if (filters.startDate && filters.endDate) {
    conditions.push(gte(transactions.date, filters.startDate));
    conditions.push(lte(transactions.date, filters.endDate));
  } else if (filters.date) {
    conditions.push(eq(transactions.date, filters.date));
  } else if (filters.month) {
    const { start, end } = getMonthBounds(filters.month);
    conditions.push(gte(transactions.date, start));
    conditions.push(lte(transactions.date, end));
  }

  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type));
  }

  const rows = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(transactions.date);

  // Apply search filter in JS (simpler for note+category combo)
  const filtered = filters.search
    ? rows.filter(
        (t) =>
          t.note?.toLowerCase().includes(filters.search!.toLowerCase()) ||
          t.category.toLowerCase().includes(filters.search!.toLowerCase()),
      )
    : rows;

  // Sort newest first
  return filtered.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function computeMonthlySummary(
  userId: string,
  month: string,
  date?: string,
  startDate?: string,
  endDate?: string
): Promise<MonthlySummary> {
  const allForMonth = await getTransactions(userId, { month, date, startDate, endDate });

  const totalIncome = allForMonth
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = allForMonth
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Exclude Budget Refunds from inflating Income (since they reverse an expense from the same month)
  const budgetRefunds = allForMonth
    .filter((t) => t.type === 'income' && t.note?.startsWith('Refund Budget'))
    .reduce((sum, t) => sum + t.amount, 0);

  // Identify savings withdrawals and deletion refunds (recorded as incomes).
  // These return money to our wallet but are not "new" monthly paycheck income.
  const savingsWithdrawals = allForMonth
    .filter((t) => t.type === 'income' && ['Tarik Tabungan', 'Refund Tabungan'].includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  // Saldo Masuk (Real Income) = Total Uang Masuk - (Uang balik dari celengan) - (Uang balik dari sisa budget) 
  const realIncome = Math.max(0, totalIncome - savingsWithdrawals - budgetRefunds);
  
  // Total Terpakai (Adjusted Expense) = Total Uang Keluar - (Uang balik dari celengan) - (Uang balik dari sisa budget)
  const adjustedExpense = Math.max(0, totalExpense - savingsWithdrawals - budgetRefunds);
  
  // Sisa Saldo Bulan Ini
  const totalBalance = totalIncome - totalExpense;

  // Track daily history for aesthetic trends frontend
  // A true "Expense" on a given day = (Raw expenses that day) - (Withdrawals/Refunds on that day)
  const dailyMap = new Map<string, number>();
  
  // 1. Add all standard expenses
  for (const t of allForMonth.filter((tx) => tx.type === 'expense')) {
    dailyMap.set(t.date, (dailyMap.get(t.date) || 0) + t.amount);
  }

  // 2. Subtract budget refunds and savings withdrawals (since they offset the expenses)
  const offsetTxns = allForMonth.filter((t) => 
    t.type === 'income' && (
      t.note?.startsWith('Refund Budget') || 
      ['Tarik Tabungan', 'Refund Tabungan'].includes(t.category)
    )
  );
  
  for (const t of offsetTxns) {
    // If a refund happens on a day with no expenses, it might drop below 0; floor at 0 for charting purposes
    const newTotal = Math.max(0, (dailyMap.get(t.date) || 0) - t.amount);
    dailyMap.set(t.date, newTotal);
  }

  const dailyExpenses = Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount })).sort((a,b) => a.date.localeCompare(b.date));

  // Safety Spend = max(0, balance - 10% of real income)
  const safetySpend = Math.max(0, totalBalance - Math.round(realIncome * 0.1));

  // --- Calculate Baseline History up to PREVIOUS DAY ---
  // If the user selected a specific date, baseline is up to date - 1.
  // If they selected month, baseline is up to the last day of previous month.
  let baselineDateStr = '';
  if (date) {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    baselineDateStr = d.toISOString().split('T')[0];
  } else if (startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 1);
    baselineDateStr = d.toISOString().split('T')[0];
  } else if (month) {
    const [year, mon] = month.split('-');
    const d = new Date(parseInt(year, 10), parseInt(mon, 10) - 1, 0);
    baselineDateStr = d.toISOString().split('T')[0];
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    baselineDateStr = d.toISOString().split('T')[0];
  }

  // --- Calculate Global Balance ---
  const globalTxs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId));

  const globalBalance = globalTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) -
    globalTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const baselineTxs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), lte(transactions.date, baselineDateStr)));

  const baselineIncome = baselineTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // We explicitly fetch ALL time expenses because committing to future budgets reduces currently owned global boundaries
  const allTimeTxs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId));

  const allTimeExpense = allTimeTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const baselineBalance = baselineIncome - allTimeExpense;

  return {
    totalIncome,
    totalExpense,
    totalBalance,
    realIncome,
    adjustedExpense,
    safetySpend,
    dailyExpenses,
    cumulativeIncome: baselineIncome,
    cumulativeBalance: baselineBalance,
    globalBalance,
  };
}

export async function createTransaction(
  userId: string,
  data: Omit<NewTransaction, 'id' | 'userId' | 'createdAt'>,
) {
  // Use raw SQL to avoid Drizzle ORM column-mapping issues with the existing table
  const { pool } = await import('../db/index.js');
  const result = await pool.query(
    `INSERT INTO transactions (user_id, amount, type, category, note, icon, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, data.amount, data.type, data.category, data.note ?? null, data.icon ?? 'payments', data.date],
  );
  return result.rows[0] as NewTransaction & { id: string; createdAt: Date };
}



export async function deleteTransaction(userId: string, id: string) {
  const [deleted] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();

  if (!deleted) {
    throw new Error('Transaction not found');
  }
  return deleted;
}

export async function deleteTransactionsByMonth(userId: string, month: string) {
  const { start, end } = getMonthBounds(month);
  const deleted = await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    )
    .returning();
  return deleted;
}

export async function deleteTransactionsByDate(userId: string, date: string) {
  const deleted = await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.date, date)
      )
    )
    .returning();
  return deleted;
}
