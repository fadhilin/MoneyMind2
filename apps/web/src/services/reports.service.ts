import { db } from '../lib/db';
import type { ApiMonthlySummary, ApiBudgetDistribution, ApiBreakdownItem } from '../types/finance';

// Helper to filter transactions
async function getFilteredTransactions(month?: string, date?: string, startDate?: string, endDate?: string) {
  let txs = await db.transactions.toArray();

  if (startDate && endDate) {
    const start = new Date(`${startDate}T00:00:00.000Z`).toISOString();
    const end = new Date(new Date(endDate).getFullYear(), new Date(endDate).getMonth(), new Date(endDate).getDate(), 23, 59, 59, 999).toISOString();
    txs = txs.filter(tx => tx.date >= start && tx.date <= end);
  } else if (date) {
    txs = txs.filter(tx => tx.date.startsWith(date));
  } else if (month) {
    const start = new Date(`${month}-01T00:00:00.000Z`).toISOString();
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    txs = txs.filter(tx => tx.date >= start && tx.date <= end);
  }
  return txs;
}

export async function getMonthlySummary(month: string, date?: string, startDate?: string, endDate?: string): Promise<ApiMonthlySummary> {
  const allTxs = await db.transactions.toArray();
  const filteredTxs = await getFilteredTransactions(month, date, startDate, endDate);
  const allSavings = await db.savings.toArray();

  const globalIncome = allTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const globalExpense = allTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const globalBalance = globalIncome - globalExpense;

  const totalIncome = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsTotal = allSavings.reduce((s, t) => s + t.current, 0);

  // Trend grouping: Hourly if single day, else Daily
  const trendData = new Map<string, number>();
  const isSingleDay = date || (startDate && endDate && startDate === endDate);

  filteredTxs.filter(t => t.type === 'expense').forEach(t => {
    let key = t.date.split('T')[0]; // Default Daily
    if (isSingleDay) {
      // Group by hour for single day view
      const hour = t.date.split('T')[1].split(':')[0];
      key = `${hour}:00`;
    }
    trendData.set(key, (trendData.get(key) || 0) + t.amount);
  });

  const dailyExpenses = Array.from(trendData.entries())
    .map(([key, amount]) => ({ date: key, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate Safety Spend: globalBalance / days remaining in target month
  const targetDate = month ? new Date(`${month}-01`) : new Date();
  const now = new Date();
  const isCurrentMonth = targetDate.getFullYear() === now.getFullYear() && targetDate.getMonth() === now.getMonth();
  const isFutureMonth = targetDate > now;

  const totalDaysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  
  let daysRemaining = 1;
  if (isCurrentMonth) {
    daysRemaining = Math.max(1, totalDaysInMonth - now.getDate() + 1);
  } else if (isFutureMonth) {
    daysRemaining = totalDaysInMonth;
  } else {
    daysRemaining = 1;
  }

  // Rounding prevents confusion with decimal points in the UI formatting
  const safetySpend = Math.max(0, Math.floor(globalBalance / daysRemaining));
  const idealDailySpend = Math.floor(totalIncome / totalDaysInMonth);

  return {
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
    realIncome: totalIncome,
    adjustedExpense: totalExpense,
    safetySpend,
    idealDailySpend,
    dailyExpenses,
    globalBalance,
    savingsTotal
  };
}

export async function getBudgetDistribution(month: string, date?: string, startDate?: string, endDate?: string): Promise<ApiBudgetDistribution[]> {
  let budgets = await db.budgets.toArray();
  if (month) {
    budgets = budgets.filter(b => !b.date || b.date.startsWith(month));
  } else if (date) {
    budgets = budgets.filter(b => b.date && b.date.startsWith(date));
  }

  const filteredTxs = await getFilteredTransactions(month, date, startDate, endDate);
  const expenses = filteredTxs.filter(t => t.type === 'expense');

  return budgets.map(b => {
    const spent = expenses.filter(tx => tx.category === b.category).reduce((s, t) => s + t.amount, 0);
    const limit = b.limit || 0;
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    return {
      category: b.category,
      spent,
      limit,
      percent
    };
  });
}

export async function getTransactionBreakdown(month: string, date?: string, startDate?: string, endDate?: string): Promise<ApiBreakdownItem[]> {
  const filteredTxs = await getFilteredTransactions(month, date, startDate, endDate);
  
  const groups = new Map<string, ApiBreakdownItem>();

  filteredTxs.forEach(tx => {
    const key = `${tx.category}-${tx.type}`;
    if (!groups.has(key)) {
      groups.set(key, { category: tx.category, type: tx.type, total: 0, count: 0 });
    }
    const g = groups.get(key)!;
    g.total += tx.amount;
    g.count += 1;
  });

  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

export async function getAvatarStatus(): Promise<{ status: string }> {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTxs = await db.transactions.filter(t => t.date.startsWith(todayStr)).toArray();
  
  const hasBigExpense = todayTxs.some(t => t.type === 'expense' && t.amount >= 1000000);
  const hasDebtPaid = todayTxs.some(t => t.type === 'expense' && t.category.toLowerCase().includes('hutang'));
  
  // Check if any budget category is over budget this month
  const month = todayStr.slice(0, 7);
  const budgets = await db.budgets.toArray();
  let anyOverBudget = false;
  let anyOver50 = false;

  for (const b of budgets) {
    const txs = await db.transactions.filter(tx => tx.category === b.category && tx.date.startsWith(month)).toArray();
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const spent = exp - inc;
    if (b.limit > 0) {
      if (spent >= b.limit) anyOverBudget = true;
      else if (spent >= b.limit * 0.5) anyOver50 = true;
    }
  }

  let status = "neutral";
  if (hasBigExpense) status = "impulse_buy";
  else if (anyOverBudget) status = "OVER_BUDGET";
  else if (hasDebtPaid) status = "debt_paid";
  else if (todayTxs.length === 0) status = "no_transaction";
  else if (anyOver50) status = "BUDGET_OVER_50";
  else if (todayTxs.filter(t => t.type === 'income').length > 0) status = "saved_money";

  return { status };
}
