'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole =
  | 'admin'
  | 'marketing_manager'
  | 'marketing_agent'
  | 'production_manager'
  | 'production_agent';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (token) => set({ accessToken: token }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    { name: 'auth' },
  ),
);

export interface PortalUser {
  id: string;
  email: string;
  fullName: string;
  clientId: string;
}

interface PortalAuthState {
  accessToken: string | null;
  user: PortalUser | null;
  setAuth: (accessToken: string, user: PortalUser) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (token) => set({ accessToken: token }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    { name: 'portal-auth' },
  ),
);
