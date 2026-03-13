export type TransactionType = 'income' | 'expense';

// ─── Frontend-friendly types (used in components) ─────────────────────────────

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note: string;
  icon: string;
}

/** UI-facing budget type (uses 'limit'/'spent' for backward compat with existing components) */
export interface Budget {
  id: string;
  category: string;
  limit: number;       // maps to API `limitAmount`
  spent: number;       // computed: sum of expenses in that category this month
  icon: string;
  color: string;
  description?: string;
  date?: string | null;
}

/** UI-facing saving type (uses 'target'/'current' for backward compat) */
export interface Saving {
  id: string;
  name: string;
  target: number;      // maps to API `targetAmount`
  current: number;     // maps to API `currentAmount`
  icon: string;
  color: string;
}

// ─── API response shapes ───────────────────────────────────────────────────────

/** Raw budget record from the API */
export interface ApiBudget {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
  spent: number;
  icon: string;
  color: string;
  description?: string | null;
  date: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Raw saving record from the API */
export interface ApiSaving {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

/** Monthly summary returned by GET /reports/summary */
export interface ApiMonthlySummary {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  realIncome: number;
  adjustedExpense: number;
  safetySpend: number;
  dailyExpenses?: { date: string; amount: number }[];
  cumulativeIncome?: number;
  cumulativeBalance?: number;
  globalBalance: number;
  savingsTotal: number;
  idealDailySpend?: number;
}

/** Budget distribution item from GET /reports/budget-distribution */
export interface ApiBudgetDistribution {
  category: string;
  spent: number;
  limit: number;
  percent: number;
}

/** Transaction breakdown item from GET /reports/breakdown */
export interface ApiBreakdownItem {
  category: string;
  type: TransactionType;
  total: number;
  count: number;
}

/** Transaction meta summary from GET /transactions */
export interface ApiTransactionMeta {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
}

export interface FinanceState {
  transactions: Transaction[];
  budgets: Budget[];
  savings: Saving[];
  selectedMonth: Date;
}
