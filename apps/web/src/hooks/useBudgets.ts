import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as budgetService from '../services/budgets.service';
import type { CreateBudgetInput, UpdateBudgetInput } from '../services/budgets.service';

export const BUDGETS_KEY = 'budgets';

export function useBudgets(month?: string, date?: string) {
  return useQuery({
    queryKey: [BUDGETS_KEY, month, date],
    queryFn: () => budgetService.getBudgets(month, date),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) => budgetService.createBudget(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BUDGETS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['savings'] });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBudgetInput }) =>
      budgetService.updateBudget(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BUDGETS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['savings'] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, month }: { id: string; month?: string }) => budgetService.deleteBudget(id, month),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BUDGETS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['savings'] });
    },
  });
}

export function useDepositBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, date }: { id: string; amount: number; date?: string }) =>
      budgetService.depositBudget(id, amount, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BUDGETS_KEY] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useWithdrawBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, date }: { id: string; amount: number; date?: string }) =>
      budgetService.withdrawBudget(id, amount, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BUDGETS_KEY] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['savings'] });
    },
  });
}
