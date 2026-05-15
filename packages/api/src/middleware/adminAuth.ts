import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AdminRole } from '@skipper/shared';
import type { Env } from '../types/env';
import { fail } from '../utils/response';
import { verifyJwt } from '../utils/jwt';
import { first } from '../utils/db';

export interface AdminAuthContext {
  id: string;
  email: string;
  role: AdminRole;
}

interface AdminJwtPayload {
  sub: string;
  email: string;
  role: AdminRole;
  /** token_version snapshot. Bumped on password change/reset to invalidate
   *  all previously-issued JWTs for that user. */
  tv?: number;
}

export type AdminVariables = {
  adminUser: AdminAuthContext;
};

/** Name of the httpOnly cookie that carries the admin session JWT. */
export const ADMIN_SESSION_COOKIE = 'skipper_admin_session';

export const adminAuth: MiddlewareHandler<{ Bindings: Env; Variables: AdminVariables }> = async (
  c,
  next,
) => {
  // Cookie-only auth: the admin JWT is httpOnly so it can never be exfiltrated
  // by an XSS payload. (Previous Bearer-header flow let localStorage XSS leak
  // the full token — closed in audit fix 2026-05-15.)
  const token = getCookie(c, ADMIN_SESSION_COOKIE);
  if (!token) {
    return c.json(fail('UNAUTHORIZED', 'Admin session required'), 401);
  }
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json(fail('CONFIG', 'JWT_SECRET is not configured'), 500);
  }
  const payload = await verifyJwt<AdminJwtPayload>(token, secret);
  if (!payload?.sub || !payload.email || !payload.role) {
    return c.json(fail('UNAUTHORIZED', 'Admin session expired or invalid'), 401);
  }

  // Stale-token check: a password change increments admin_users.token_version,
  // so older JWTs (which still carry the pre-change `tv`) are rejected. Costs
  // one D1 lookup per admin request — acceptable for the security guarantee.
  const row = await first<{ token_version: number; is_active: number }>(
    c.env.DB,
    `SELECT token_version, is_active FROM admin_users WHERE id = ?`,
    [payload.sub],
  );
  if (!row || !row.is_active) {
    return c.json(fail('UNAUTHORIZED', 'Account is no longer active'), 401);
  }
  if ((payload.tv ?? 0) !== row.token_version) {
    return c.json(fail('UNAUTHORIZED', 'Session was invalidated — sign in again'), 401);
  }

  c.set('adminUser', { id: payload.sub, email: payload.email, role: payload.role });
  await next();
  return;
};

export const requireSuperAdmin: MiddlewareHandler<{
  Bindings: Env;
  Variables: AdminVariables;
}> = async (c, next) => {
  const user = c.get('adminUser');
  if (!user || user.role !== 'super_admin') {
    return c.json(fail('FORBIDDEN', 'Super admin access required'), 403);
  }
  await next();
  return;
};
