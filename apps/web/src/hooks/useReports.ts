import { useQuery } from '@tanstack/react-query';
import * as reportsService from '../services/reports.service';

export const REPORTS_KEY = 'reports';

export function useMonthlySummary(params: { month: string; date?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'summary', params.month, params.date, params.startDate, params.endDate],
    queryFn: () => reportsService.getMonthlySummary(params.month, params.date, params.startDate, params.endDate),
    enabled: !!params.month,
  });
}

export function useBudgetDistribution(params: { month: string; date?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'budget-distribution', params.month, params.date, params.startDate, params.endDate],
    queryFn: () => reportsService.getBudgetDistribution(params.month, params.date, params.startDate, params.endDate),
    enabled: !!params.month,
  });
}

export function useTransactionBreakdown(params: { month: string; date?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'breakdown', params.month, params.date, params.startDate, params.endDate],
    queryFn: () => reportsService.getTransactionBreakdown(params.month, params.date, params.startDate, params.endDate),
    enabled: !!params.month,
  });
}

export function useAvatarStatus() {
  return useQuery({
    queryKey: [REPORTS_KEY, 'avatar-status'],
    queryFn: () => reportsService.getAvatarStatus(),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time feel
  });
}
