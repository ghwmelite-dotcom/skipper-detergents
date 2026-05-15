import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import {
  adminLoginSchema,
  adminForgotPasswordSchema,
  adminResetPasswordSchema,
  type AdminUser,
  type AdminRole,
} from '@skipper/shared';
import { z } from 'zod';
import type { Env } from '../../types/env';
import { ok, fail } from '../../utils/response';
import { first, run } from '../../utils/db';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signJwt } from '../../utils/jwt';
import { logActivity } from '../../services/activity';
import {
  adminAuth,
  type AdminVariables,
  ADMIN_SESSION_COOKIE,
} from '../../middleware/adminAuth';
import { clearRateBucket, consumeRateBucket } from '../../utils/rateBucket';
import type { Context } from 'hono';

/** Apply the admin session cookie. SameSite=None+Secure is required in
 *  production because the admin SPA and API live on different registrable
 *  domains (*.pages.dev vs *.workers.dev). In local dev (http on localhost)
 *  we fall back to Lax so the cookie is accepted without HTTPS. */
function setSessionCookie(c: Context<{ Bindings: Env; Variables: AdminVariables }>, token: string, ttlSeconds: number): void {
  const isProd = c.env.APP_ENV === 'production';
  setCookie(c, ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    path: '/',
    maxAge: ttlSeconds,
  });
}

function clearSessionCookie(c: Context<{ Bindings: Env; Variables: AdminVariables }>): void {
  const isProd = c.env.APP_ENV === 'production';
  deleteCookie(c, ADMIN_SESSION_COOKIE, {
    path: '/',
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
  });
}
import {
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_TTL_MS,
  sendResetConfirmationEmail,
  sendResetEmail,
} from '../../services/passwordReset';

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

  const email = body.email.toLowerCase();
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json(fail('CONFIG', 'JWT_SECRET is not configured on the worker'), 500);
  }

  const result = await ensureMinDelay(
    (async () => {
      const user = await first<AdminUser & { token_version: number }>(
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
    // Only failed attempts consume rate budget. Successful logins don't lock
    // legitimate users out of their own account.
    const bucket = await consumeRateBucket(c.env.KV_RATE_LIMIT, rateKey, {
      limit: LOGIN_RATE_LIMIT,
      windowSeconds: LOGIN_RATE_WINDOW,
    });
    if (!bucket.allowed) {
      return c.json(fail('RATE_LIMITED', 'Too many login attempts — try again later'), 429);
    }
    return c.json(fail('UNAUTHORIZED', 'Invalid email or password'), 401);
  }

  // Successful login clears the failure counter for this IP.
  await clearRateBucket(c.env.KV_RATE_LIMIT, rateKey);

  const token = await signJwt(
    {
      sub: result.id,
      email: result.email,
      role: result.role as AdminRole,
      tv: result.token_version,
    },
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

  setSessionCookie(c, token, TOKEN_TTL_SECONDS);

  return c.json(
    ok({
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

/**
 * Issue a password-reset email. Always returns 200 so callers can't enumerate
 * which addresses are registered. Rate-limited per IP to slow down abuse.
 */
adminAuthRouter.post('/forgot-password', async (c) => {
  const body = adminForgotPasswordSchema.parse(await c.req.json());
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';

  const rateBucket = await consumeRateBucket(c.env.KV_RATE_LIMIT, `rl:admin_forgot:${ip}`, {
    limit: 5,
    windowSeconds: 15 * 60,
  });
  if (!rateBucket.allowed) {
    return c.json(fail('RATE_LIMITED', 'Too many reset requests — try again later'), 429);
  }

  const email = body.email.toLowerCase();
  const user = await first<AdminUser>(
    c.env.DB,
    `SELECT * FROM admin_users WHERE LOWER(email) = ? AND is_active = 1`,
    [email],
  );

  // We always succeed publicly to avoid leaking whether an address exists.
  // If the user does exist, issue a token + send mail.
  if (user) {
    const token = generateResetToken();
    const tokenHash = await hashResetToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    await run(
      c.env.DB,
      `INSERT INTO admin_password_resets (id, admin_user_id, token_hash, expires_at, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [idHex(), user.id, tokenHash, expiresAt, ip],
    );

    const adminUrl = c.env.ADMIN_URL ?? 'https://skipper-admin.pages.dev';
    const resetUrl = `${adminUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const storeName = 'Skipper CleanCare';
    const expiresInMinutes = Math.round(RESET_TOKEN_TTL_MS / 60000);

    c.executionCtx.waitUntil(
      sendResetEmail(c.env, {
        toEmail: user.email,
        toName: user.name,
        resetUrl,
        storeName,
        expiresInMinutes,
      }).catch((err) => console.error('[forgot-password] email failed', err)),
    );

    await logActivity(c.env.DB, {
      admin_id: user.id,
      action: 'admin_user.password_reset_requested',
      entity_type: 'admin_user',
      entity_id: user.id,
      ip_address: ip,
    });
  }

  return c.json(
    ok({
      success: true,
      message: 'If an account exists for that email, a reset link is on its way.',
    }),
  );
});

/**
 * Consume a reset token and set a new password. Rate-limited per IP. Tokens
 * are one-shot — marked used_at on success.
 */
adminAuthRouter.post('/reset-password', async (c) => {
  const body = adminResetPasswordSchema.parse(await c.req.json());
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';

  const rateBucket = await consumeRateBucket(c.env.KV_RATE_LIMIT, `rl:admin_reset:${ip}`, {
    limit: 10,
    windowSeconds: 15 * 60,
  });
  if (!rateBucket.allowed) {
    return c.json(fail('RATE_LIMITED', 'Too many reset attempts — try again later'), 429);
  }

  const tokenHash = await hashResetToken(body.token);
  const reset = await first<{
    id: string;
    admin_user_id: string;
    expires_at: string;
    used_at: string | null;
  }>(
    c.env.DB,
    `SELECT id, admin_user_id, expires_at, used_at FROM admin_password_resets WHERE token_hash = ?`,
    [tokenHash],
  );

  if (!reset || reset.used_at !== null || new Date(reset.expires_at).getTime() < Date.now()) {
    return c.json(fail('INVALID_TOKEN', 'This reset link is invalid or has expired'), 400);
  }

  const user = await first<AdminUser>(
    c.env.DB,
    `SELECT * FROM admin_users WHERE id = ? AND is_active = 1`,
    [reset.admin_user_id],
  );
  if (!user) {
    return c.json(fail('NOT_FOUND', 'Account not found'), 404);
  }

  const newHash = await hashPassword(body.new_password);
  // Bump token_version so any session JWTs from before the reset stop working.
  await run(
    c.env.DB,
    `UPDATE admin_users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?`,
    [newHash, user.id],
  );
  await run(
    c.env.DB,
    `UPDATE admin_password_resets SET used_at = datetime('now') WHERE id = ?`,
    [reset.id],
  );
  // Clear any failed-login rate-limit counter so the user can sign in
  // immediately with their new password.
  await clearRateBucket(c.env.KV_RATE_LIMIT, `rl:admin_login:${ip}`);

  await logActivity(c.env.DB, {
    admin_id: user.id,
    action: 'admin_user.password_reset_completed',
    entity_type: 'admin_user',
    entity_id: user.id,
    ip_address: ip,
  });

  c.executionCtx.waitUntil(
    sendResetConfirmationEmail(c.env, {
      toEmail: user.email,
      toName: user.name,
      storeName: 'Skipper CleanCare',
    }).catch((err) => console.error('[reset-password] confirm email failed', err)),
  );

  return c.json(ok({ success: true }));
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
  clearSessionCookie(c);
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

  // Bootstrap MUST present the operator-owned secret. Without this guard, the
  // "no admins exist" check is racy and any internet caller can mint a
  // super_admin if the table ever empties (truncated DB, fresh migration).
  const expectedToken = c.env.BOOTSTRAP_TOKEN;
  if (!expectedToken) {
    return c.json(fail('CONFIG', 'Bootstrap is disabled — BOOTSTRAP_TOKEN not set'), 503);
  }
  const presented = c.req.header('x-bootstrap-token')?.trim();
  if (!presented || presented !== expectedToken) {
    return c.json(fail('UNAUTHORIZED', 'Bootstrap token invalid or missing'), 401);
  }

  const rateBucket = await consumeRateBucket(c.env.KV_RATE_LIMIT, `rl:admin_bootstrap:${ip}`, {
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rateBucket.allowed) {
    return c.json(fail('RATE_LIMITED', 'Too many bootstrap attempts'), 429);
  }

  const body = bootstrapSchema.parse(await c.req.json());

  const id = idHex();
  const hash = await hashPassword(body.password);
  const email = body.email.toLowerCase();

  // Atomic claim: the row is only inserted if no admin currently exists. Two
  // racing callers cannot both succeed because D1 serializes the statement.
  const inserted = await first<{ id: string }>(
    c.env.DB,
    `INSERT INTO admin_users (id, email, password_hash, name, role, is_active)
     SELECT ?, ?, ?, ?, 'super_admin', 1
     WHERE NOT EXISTS (SELECT 1 FROM admin_users)
     RETURNING id`,
    [id, email, hash, body.name],
  );

  if (!inserted) {
    return c.json(fail('CONFLICT', 'Admin already bootstrapped'), 409);
  }

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
