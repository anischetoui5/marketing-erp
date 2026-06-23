import Cookies from 'js-cookie';
import { api, portalApi } from './api';
import { useAuthStore, usePortalAuthStore } from '@/store/auth.store';

export async function loginInternal(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password });
  const { accessToken, refreshToken, user } = data.data;
  useAuthStore.getState().setAuth(accessToken, user);
  Cookies.set('refreshToken', refreshToken, { expires: 7, sameSite: 'strict' });
  return user;
}

export async function logoutInternal() {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // swallow — token may already be expired
  }
  useAuthStore.getState().clear();
  Cookies.remove('refreshToken');
}

export async function loginPortal(email: string, password: string) {
  const { data } = await portalApi.post('/api/portal/auth/login', { email, password });
  const { accessToken, refreshToken, user } = data.data;
  usePortalAuthStore.getState().setAuth(accessToken, user);
  Cookies.set('portalRefreshToken', refreshToken, { expires: 7, sameSite: 'strict' });
  return user;
}

export async function logoutPortal() {
  try {
    await portalApi.post('/api/portal/auth/logout');
  } catch {
    // swallow
  }
  usePortalAuthStore.getState().clear();
  Cookies.remove('portalRefreshToken');
}

export function getApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string | string[] } } };
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'An unexpected error occurred';
}
