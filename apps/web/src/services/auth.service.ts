import api from '../lib/api';

export async function sendOtp(email: string): Promise<void> {
  const res = await api.post('/auth-custom/send-otp', { email });
  if (res.data?.error) throw new Error(res.data.error);
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  const res = await api.post('/auth-custom/verify-otp', { email, code });
  if (res.data?.error) throw new Error(res.data.error);
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const res = await api.post('/auth-custom/reset-password', { email, code, newPassword });
  if (res.data?.error) throw new Error(res.data.error);
}
