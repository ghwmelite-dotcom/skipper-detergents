import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { AdminRole } from '@skipper/shared';

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

interface PersistedAuth {
  user: AdminSessionUser | null;
}

interface AuthState extends PersistedAuth {
  /** True once the bootstrap /me check has resolved (success or 401). */
  ready: boolean;
  setUser: (user: AdminSessionUser | null, remember?: boolean) => void;
  setReady: (ready: boolean) => void;
  logout: () => void;
}

// The admin JWT itself lives in an httpOnly cookie set by the API. We only
// persist display info about the user — it's not sensitive, and persisting it
// avoids the login-flash on hard refresh while we revalidate against /me.
const STORAGE_KEY = 'skipper-admin-user';
const SESSION_FLAG = 'skipper-admin-session-only';

function isSessionOnly(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SESSION_FLAG) === '1';
}

const dynamicStorage: PersistStorage<PersistedAuth> = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    const store = isSessionOnly() ? window.sessionStorage : window.localStorage;
    const raw = store.getItem(name);
    return raw ? (JSON.parse(raw) as StorageValue<PersistedAuth>) : null;
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    const store = isSessionOnly() ? window.sessionStorage : window.localStorage;
    store.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      ready: false,
      setUser: (user, remember = true) => {
        if (typeof window !== 'undefined') {
          if (remember) {
            window.localStorage.removeItem(SESSION_FLAG);
            window.sessionStorage.removeItem(STORAGE_KEY);
          } else {
            window.localStorage.setItem(SESSION_FLAG, '1');
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
        set({ user });
      },
      setReady: (ready) => set({ ready }),
      logout: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(SESSION_FLAG);
          window.localStorage.removeItem(STORAGE_KEY);
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
        set({ user: null });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: dynamicStorage,
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
