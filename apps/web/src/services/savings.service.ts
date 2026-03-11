import api from '../lib/api';
import type { Saving, ApiSaving } from '../types/finance';

/** Map API saving shape → UI Saving shape */
function mapSaving(s: ApiSaving): Saving {
  return {
    id: s.id,
    name: s.name,
    target: s.targetAmount,
    current: s.currentAmount,
    icon: s.icon,
    color: s.color,
  };
}

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
  const res = await api.get<{ data: ApiSaving[] }>('/savings');
  return res.data.data.map(mapSaving);
}

export async function createSaving(input: CreateSavingInput): Promise<Saving> {
  const res = await api.post<{ data: ApiSaving }>('/savings', input);
  return mapSaving(res.data.data);
}

export async function updateSaving(id: string, input: UpdateSavingInput): Promise<Saving> {
  const res = await api.patch<{ data: ApiSaving }>(`/savings/${id}`, input);
  return mapSaving(res.data.data);
}

export async function deleteSaving(id: string, date?: string): Promise<Saving> {
  const res = await api.delete<{ data: ApiSaving }>(`/savings/${id}`, { params: { date } });
  return mapSaving(res.data.data);
}

export async function depositSaving(id: string, amount: number, date?: string): Promise<void> {
  await api.post(`/savings/${id}/deposit`, { amount, date });
}

export async function withdrawSaving(id: string, amount: number, date?: string): Promise<void> {
  await api.post(`/savings/${id}/withdraw`, { amount, date });
}

export async function autoAllocateSaving(id: string, month: string, date?: string): Promise<void> {
  await api.post(`/savings/${id}/auto-allocate`, null, { params: { month, date } });
}
