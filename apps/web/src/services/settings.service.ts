import { Preferences } from '@capacitor/preferences';

export interface UserSettings {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getSettings(): Promise<UserSettings> {
  const { value: saved } = await Preferences.get({ key: 'user_settings' });
  if (saved) return JSON.parse(saved);
  return {
    id: 'local',
    userId: 'local',
    notificationsEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function updateSettings(data: { notificationsEnabled?: boolean }): Promise<UserSettings> {
  const current = await getSettings();
  if (data.notificationsEnabled !== undefined) {
    current.notificationsEnabled = data.notificationsEnabled;
  }
  current.updatedAt = new Date().toISOString();
  await Preferences.set({
    key: 'user_settings',
    value: JSON.stringify(current)
  });
  return current;
}
