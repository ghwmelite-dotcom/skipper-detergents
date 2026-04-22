import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminRole } from '@skipper/shared';

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

interface AuthState {
  token: string | null;
  user: AdminSessionUser | null;
  login: (token: string, user: AdminSessionUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'skipper-admin-auth',
    },
  ),
);
