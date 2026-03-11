import { computeMonthlySummary, getTransactions } from './transactions.service.js';
import { getBudgets } from './budgets.service.js';
import { db } from '../db/index.js';
import { transactions, savings } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function getMonthlySummary(userId: string, month: string, date?: string, startDate?: string, endDate?: string) {
  return computeMonthlySummary(userId, month, date, startDate, endDate);
}

export async function getBudgetDistribution(userId: string, month: string, date?: string, startDate?: string, endDate?: string) {
  const budgetsWithSpent = await getBudgets(userId, month, date, startDate, endDate);
  const summary = await computeMonthlySummary(userId, month, date, startDate, endDate);

  return {
    budgets: budgetsWithSpent.map((b) => ({
      id: b.id,
      category: b.category,
      icon: b.icon,
      color: b.color,
      limitAmount: b.limitAmount,
      spent: b.spent,
      percentage: b.limitAmount > 0 ? Math.round((b.spent / b.limitAmount) * 100) : 0,
    })),
    totals: {
      totalBudgetLimit: budgetsWithSpent.reduce((sum, b) => sum + b.limitAmount, 0),
      totalBudgetSpent: budgetsWithSpent.reduce((sum, b) => sum + b.spent, 0),
    },
    summary,
  };
}

export async function getTransactionBreakdown(userId: string, month: string, date?: string, startDate?: string, endDate?: string) {
  const txs = await getTransactions(userId, { month, date, startDate, endDate });
  const breakdownMap = new Map<string, { category: string; total: number; count: number; type: 'income' | 'expense' }>();

  for (const t of txs) {
    const key = `${t.type}-${t.category}`;
    const existing = breakdownMap.get(key);
    if (existing) {
      existing.total += t.amount;
      existing.count += 1;
    } else {
      breakdownMap.set(key, { category: t.category, total: t.amount, count: 1, type: t.type });
    }
  }

  return Array.from(breakdownMap.values());
}

export async function getAvatarStatus(userId: string) {
  const getLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const dateStrs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return getLocalDate(d);
  });

  const todayStr = dateStrs[0];
  const last3Days = dateStrs.slice(0, 3);

  const todayTxs = await db.select().from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.date, todayStr)));

  // Group transactions first
  const debtTxCondition = (t: any) => 
    t.category.toLowerCase().includes('hutang') || 
    t.category.toLowerCase().includes('cicilan') || 
    t.note?.toLowerCase().includes('bayar hutang') ||
    t.note?.toLowerCase().includes('pelunasan') ||
    t.note?.toLowerCase().includes('cicilan') ||
    t.note?.toLowerCase().includes('hutang');

  const debtTxs = todayTxs.filter(debtTxCondition);
  const regularTxs = todayTxs.filter(t => !debtTxCondition(t));

  // 1. Critical Negative: Impulse Buy >= 1jt (Priority 1)
  // Only regular expenses (not debt payments) count towards impulse buys
  const todayRegularExpensesRaw = regularTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const todayRegularRefunds = regularTxs.filter(t => t.type === 'income' && (
    t.note?.toLowerCase().includes('refund') || 
    t.category.toLowerCase().includes('refund') || 
    t.category.toLowerCase().includes('tarik')
  )).reduce((sum, t) => sum + t.amount, 0);
  
  const netTodayExpense = todayRegularExpensesRaw - todayRegularRefunds;
  
  if (netTodayExpense >= 1000000) return { status: 'IMPULSE_BUY' };

  // 2. High Priority Negative: Over-budget 3 days (Priority 2)
  const month = todayStr.slice(0, 7);
  const userBudgets = await getBudgets(userId, month);
  const totalLimit = userBudgets.reduce((sum, b) => sum + b.limitAmount, 0);
  
  if (totalLimit > 0) {
    const dailyLimit = totalLimit / 30;
    const threeDaysTxs = await db.select().from(transactions).where(and(
      eq(transactions.userId, userId),
      gte(transactions.date, last3Days[2]),
      lte(transactions.date, last3Days[0])
    ));

    const dailySpending = last3Days.map(d => 
      threeDaysTxs.filter(t => t.date === d && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    );

    const overBudgetConsecutive = dailySpending.every(s => s > dailyLimit);
    if (overBudgetConsecutive) return { status: 'OVER_BUDGET' };
  }

  // 3. Reward: Savings Goal Reached (Priority 3 - Only if updated in last 24h)
  const allSavings = await db.select().from(savings).where(eq(savings.userId, userId));
  const reachedSavingRecent = allSavings.some(s => 
    s.currentAmount >= s.targetAmount && 
    s.targetAmount > 0 && 
    (new Date().getTime() - new Date(s.updatedAt).getTime()) < 24 * 60 * 60 * 1000
  );
  if (reachedSavingRecent) return { status: 'SAVINGS_REACHED' };

  // 5. Idle: No transaction today (Priority 5)
  if (todayTxs.length === 0) return { status: 'NO_TRANSACTION' };

  return { status: 'NORMAL' };
}
