import type { MiddlewareHandler } from 'hono';
import type { AdminRole } from '@skipper/shared';
import type { Env } from '../types/env';
import { fail } from '../utils/response';
import { verifyJwt } from '../utils/jwt';

export interface AdminAuthContext {
  id: string;
  email: string;
  role: AdminRole;
}

interface AdminJwtPayload {
  sub: string;
  email: string;
  role: AdminRole;
}

export type AdminVariables = {
  adminUser: AdminAuthContext;
};

function extractToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

export const adminAuth: MiddlewareHandler<{ Bindings: Env; Variables: AdminVariables }> = async (
  c,
  next,
) => {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) {
    return c.json(fail('UNAUTHORIZED', 'Invalid or missing admin token'), 401);
  }
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json(fail('CONFIG', 'JWT_SECRET is not configured'), 500);
  }
  const payload = await verifyJwt<AdminJwtPayload>(token, secret);
  if (!payload?.sub || !payload.email || !payload.role) {
    return c.json(fail('UNAUTHORIZED', 'Invalid or missing admin token'), 401);
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
