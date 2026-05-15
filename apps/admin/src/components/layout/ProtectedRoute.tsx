import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore, type AdminSessionUser } from '@/stores/authStore';

/**
 * Gates the admin shell behind a valid session. On boot we revalidate against
 * /api/admin/auth/me — the httpOnly cookie auto-attaches via credentials:
 * 'include'. While the check is in flight we render the cached user (or a
 * blank shell), so legitimate users don't see a login flash on refresh.
 */
export function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const setUser = useAuthStore((s) => s.setUser);
  const setReady = useAuthStore((s) => s.setReady);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get<AdminSessionUser>('/api/admin/auth/me');
        if (!cancelled) setUser(me);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          if (!cancelled) logout();
        }
        // Network errors leave the cached user in place so the admin doesn't
        // get bounced offline; the next real request will surface the issue.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, setUser, setReady, logout]);

  if (!user) {
    if (!ready) {
      // Brief loading state while /me resolves. Empty fragment is cheap and
      // avoids the login flash on a legit refresh.
      return <></>;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
