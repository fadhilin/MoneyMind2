import api from '../lib/api';
import type { Budget, ApiBudget } from '../types/finance';

/** Map API budget shape → UI Budget shape */
function mapBudget(b: ApiBudget): Budget {
  return {
    id: b.id,
    category: b.category,
    limit: b.limitAmount,
    spent: b.spent ?? 0,
    icon: b.icon,
    color: b.color,
    description: b.description ?? undefined,
    date: b.date,
  };
}

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

export async function getBudgets(month?: string, date?: string): Promise<Budget[]> {
  const res = await api.get<{ data: ApiBudget[] }>('/budgets', { params: { month, date } });
  return res.data.data.map(mapBudget);
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const res = await api.post<{ data: ApiBudget }>('/budgets', input);
  return mapBudget(res.data.data);
}

export async function updateBudget(id: string, input: UpdateBudgetInput): Promise<Budget> {
  const res = await api.patch<{ data: ApiBudget }>(`/budgets/${id}`, input);
  return mapBudget(res.data.data);
}

export async function deleteBudget(id: string): Promise<Budget> {
  const res = await api.delete<{ data: ApiBudget }>(`/budgets/${id}`);
  return mapBudget(res.data.data);
}

export async function depositBudget(id: string, amount: number, date?: string): Promise<void> {
  await api.post(`/budgets/${id}/deposit`, { amount, date });
}

export async function withdrawBudget(id: string, amount: number, date?: string): Promise<void> {
  await api.post(`/budgets/${id}/withdraw`, { amount, date });
}
