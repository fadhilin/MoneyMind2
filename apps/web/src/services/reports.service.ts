import api from '../lib/api';
import type { ApiMonthlySummary, ApiBudgetDistribution, ApiBreakdownItem, ApiBudget } from '../types/finance';

export async function getMonthlySummary(month: string, date?: string, startDate?: string, endDate?: string): Promise<ApiMonthlySummary> {
  const res = await api.get<{ data: ApiMonthlySummary; month: string; date?: string; startDate?: string; endDate?: string }>('/reports/summary', {
    params: { month, date, startDate, endDate },
  });
  return res.data.data;
}

export async function getBudgetDistribution(month: string, date?: string, startDate?: string, endDate?: string): Promise<ApiBudgetDistribution[]> {
  const res = await api.get<{ data: { budgets: (ApiBudget & { percentage: number })[] }; month: string; date?: string; startDate?: string; endDate?: string }>(
    '/reports/budget-distribution',
    { params: { month, date, startDate, endDate } }
  );
  
  if (!res.data.data || !res.data.data.budgets) return [];
  
  return res.data.data.budgets.map(b => ({
    category: b.category,
    spent: b.spent,
    limit: b.limitAmount,
    percent: b.percentage,
  }));
}

export async function getTransactionBreakdown(month: string, date?: string, startDate?: string, endDate?: string): Promise<ApiBreakdownItem[]> {
  const res = await api.get<{ data: ApiBreakdownItem[]; month: string; date?: string; startDate?: string; endDate?: string }>('/reports/breakdown', {
    params: { month, date, startDate, endDate },
  });
  return res.data.data;
}

export async function getAvatarStatus(): Promise<{ status: string }> {
  const res = await api.get<{ data: { status: string } }>('/reports/avatar-status');
  return res.data.data;
}
