import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as settingsService from '../services/settings.service';

export const SETTINGS_KEY = 'settings';

export function useSettings() {
  return useQuery({
    queryKey: [SETTINGS_KEY],
    queryFn: () => settingsService.getSettings(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { notificationsEnabled?: boolean }) =>
      settingsService.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SETTINGS_KEY] }),
  });
}
