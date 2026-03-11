import api from '../lib/api';

export interface UserSettings {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getSettings(): Promise<UserSettings> {
  const res = await api.get<{ data: UserSettings }>('/settings');
  return res.data.data;
}

export async function updateSettings(data: { notificationsEnabled?: boolean }): Promise<UserSettings> {
  const res = await api.patch<{ data: UserSettings }>('/settings', data);
  return res.data.data;
}
