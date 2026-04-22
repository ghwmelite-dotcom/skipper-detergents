import { Hono } from 'hono';
import { adminLoginSchema, type AdminUser, type AdminRole } from '@skipper/shared';
import { z } from 'zod';
import type { Env } from '../../types/env';
import { ok, fail } from '../../utils/response';
import { first, run } from '../../utils/db';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signJwt } from '../../utils/jwt';
import { logActivity } from '../../services/activity';
import { adminAuth, type AdminVariables } from '../../middleware/adminAuth';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW = 15 * 60; // 15 minutes

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function ensureMinDelay<T>(promise: Promise<T>, min = 200): Promise<T> {
  const [value] = await Promise.all([promise, new Promise((r) => setTimeout(r, min))]);
  return value;
}

export const adminAuthRouter = new Hono<{ Bindings: Env; Variables: AdminVariables }>();

adminAuthRouter.post('/login', async (c) => {
  const body = adminLoginSchema.parse(await c.req.json());
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const rateKey = `rl:admin_login:${ip}`;
  const currentStr = await c.env.KV_RATE_LIMIT.get(rateKey);
  const current = currentStr ? Number.parseInt(currentStr, 10) : 0;
  if (current >= LOGIN_RATE_LIMIT) {
    return c.json(fail('RATE_LIMITED', 'Too many login attempts — try again later'), 429);
  }
  await c.env.KV_RATE_LIMIT.put(rateKey, String(current + 1), {
    expirationTtl: LOGIN_RATE_WINDOW,
  });

  const email = body.email.toLowerCase();
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json(fail('CONFIG', 'JWT_SECRET is not configured on the worker'), 500);
  }

  const result = await ensureMinDelay(
    (async () => {
      const user = await first<AdminUser>(
        c.env.DB,
        `SELECT * FROM admin_users WHERE LOWER(email) = ? AND is_active = 1`,
        [email],
      );
      if (!user) return null;
      const ok_ = await verifyPassword(body.password, user.password_hash);
      if (!ok_) return null;
      return user;
    })(),
  );

  if (!result) {
    return c.json(fail('UNAUTHORIZED', 'Invalid email or password'), 401);
  }

  const token = await signJwt(
    { sub: result.id, email: result.email, role: result.role as AdminRole },
    secret,
    TOKEN_TTL_SECONDS,
  );

  await run(c.env.DB, `UPDATE admin_users SET last_login = datetime('now') WHERE id = ?`, [
    result.id,
  ]);

  await logActivity(c.env.DB, {
    admin_id: result.id,
    action: 'admin.login',
    entity_type: 'admin_user',
    entity_id: result.id,
    ip_address: ip,
  });

  return c.json(
    ok({
      token,
      expires_in: TOKEN_TTL_SECONDS,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
    }),
  );
});

adminAuthRouter.post('/logout', adminAuth, async (c) => {
  const user = c.get('adminUser');
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  await logActivity(c.env.DB, {
    admin_id: user.id,
    action: 'admin.logout',
    entity_type: 'admin_user',
    entity_id: user.id,
    ip_address: ip,
  });
  return c.json(ok({ success: true }));
});

adminAuthRouter.get('/me', adminAuth, async (c) => {
  const { id } = c.get('adminUser');
  const user = await first<AdminUser>(
    c.env.DB,
    `SELECT id, email, name, role, is_active, last_login, created_at FROM admin_users WHERE id = ?`,
    [id],
  );
  if (!user) return c.json(fail('NOT_FOUND', 'Admin user not found'), 404);
  return c.json(
    ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      last_login: user.last_login,
      created_at: user.created_at,
    }),
  );
});

// Bootstrap route — only succeeds when there are ZERO admin users in the table.
// After the first admin is seeded, it returns 409.
const bootstrapSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(200),
  name: z.string().min(1).max(120),
});

adminAuthRouter.post('/bootstrap', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const rateKey = `rl:admin_bootstrap:${ip}`;
  const currentStr = await c.env.KV_RATE_LIMIT.get(rateKey);
  const current = currentStr ? Number.parseInt(currentStr, 10) : 0;
  if (current >= 5) {
    return c.json(fail('RATE_LIMITED', 'Too many bootstrap attempts'), 429);
  }
  await c.env.KV_RATE_LIMIT.put(rateKey, String(current + 1), { expirationTtl: 3600 });

  const body = bootstrapSchema.parse(await c.req.json());

  const existing = await first<{ n: number }>(
    c.env.DB,
    `SELECT COUNT(*) AS n FROM admin_users`,
    [],
  );
  if ((existing?.n ?? 0) > 0) {
    return c.json(fail('CONFLICT', 'Admin already bootstrapped'), 409);
  }

  const id = idHex();
  const hash = await hashPassword(body.password);
  const email = body.email.toLowerCase();

  await run(
    c.env.DB,
    `INSERT INTO admin_users (id, email, password_hash, name, role, is_active)
     VALUES (?, ?, ?, ?, 'super_admin', 1)`,
    [id, email, hash, body.name],
  );

  await logActivity(c.env.DB, {
    admin_id: id,
    action: 'admin.bootstrap',
    entity_type: 'admin_user',
    entity_id: id,
    ip_address: ip,
  });

  return c.json(
    ok({
      id,
      email,
      name: body.name,
      role: 'super_admin',
    }),
    201,
  );
});
