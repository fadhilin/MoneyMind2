import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as savingsService from '../services/savings.service';
import type { CreateSavingInput, UpdateSavingInput } from '../services/savings.service';

export const SAVINGS_KEY = 'savings';

export function useSavings() {
  return useQuery({
    queryKey: [SAVINGS_KEY],
    queryFn: () => savingsService.getSavings(),
  });
}

export function useCreateSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavingInput) => savingsService.createSaving(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SAVINGS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSavingInput }) =>
      savingsService.updateSaving(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SAVINGS_KEY] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) => savingsService.deleteSaving(id, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SAVINGS_KEY] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDepositSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, date }: { id: string; amount: number; date?: string }) =>
      savingsService.depositSaving(id, amount, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SAVINGS_KEY] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useWithdrawSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, date }: { id: string; amount: number; date?: string }) =>
      savingsService.withdrawSaving(id, amount, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SAVINGS_KEY] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useAutoAllocateSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, month, date, amount }: { id: string; month: string; date?: string; amount?: number }) =>
      savingsService.autoAllocateSaving(id, month, date, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SAVINGS_KEY] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
