import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({ baseURL: BASE_URL, withCredentials: true });
export const portalApi = axios.create({ baseURL: BASE_URL, withCredentials: true });

// ── Internal API interceptors ──────────────────────────────────────────────

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const { useAuthStore } = require('@/store/auth.store');
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        const newAccess = data.data.accessToken;
        const newRefresh = data.data.refreshToken;
        const { useAuthStore } = require('@/store/auth.store');
        useAuthStore.getState().setAccessToken(newAccess);
        Cookies.set('refreshToken', newRefresh, { expires: 7, sameSite: 'strict' });
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        const { useAuthStore } = require('@/store/auth.store');
        useAuthStore.getState().clear();
        Cookies.remove('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── Portal API interceptors ────────────────────────────────────────────────

portalApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const { usePortalAuthStore } = require('@/store/auth.store');
    const token = usePortalAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = Cookies.get('portalRefreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/api/portal/auth/refresh`, { refreshToken });
        const newAccess = data.data.accessToken;
        const newRefresh = data.data.refreshToken;
        const { usePortalAuthStore } = require('@/store/auth.store');
        usePortalAuthStore.getState().setAccessToken(newAccess);
        Cookies.set('portalRefreshToken', newRefresh, { expires: 7, sameSite: 'strict' });
        original.headers.Authorization = `Bearer ${newAccess}`;
        return portalApi(original);
      } catch {
        const { usePortalAuthStore } = require('@/store/auth.store');
        usePortalAuthStore.getState().clear();
        Cookies.remove('portalRefreshToken');
        window.location.href = '/portal/login';
      }
    }
    return Promise.reject(error);
  },
);
