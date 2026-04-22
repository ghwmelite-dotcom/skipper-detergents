import { Hono } from 'hono';
import {
  adminUserCreateSchema,
  adminUserUpdateSchema,
  adminUserResetPasswordSchema,
  adminChangePasswordSchema,
  type AdminUser,
} from '@skipper/shared';
import type { Env } from '../../types/env';
import { ok, fail } from '../../utils/response';
import { all, first, run } from '../../utils/db';
import { hashPassword, verifyPassword } from '../../utils/password';
import { logActivity } from '../../services/activity';
import { adminAuth, requireSuperAdmin, type AdminVariables } from '../../middleware/adminAuth';

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type AdminUserPublic = Omit<AdminUser, 'password_hash'>;

function toPublic(u: AdminUser): AdminUserPublic {
  const { password_hash: _pw, ...rest } = u;
  return rest;
}

export const adminUsersRouter = new Hono<{ Bindings: Env; Variables: AdminVariables }>();
adminUsersRouter.use('*', adminAuth);

// Self: change own password. Any admin role can call.
adminUsersRouter.post('/me/change-password', async (c) => {
  const body = adminChangePasswordSchema.parse(await c.req.json());
  const me = c.get('adminUser');
  const user = await first<AdminUser>(
    c.env.DB,
    `SELECT * FROM admin_users WHERE id = ? AND is_active = 1`,
    [me.id],
  );
  if (!user) return c.json(fail('NOT_FOUND', 'User not found'), 404);
  const ok_ = await verifyPassword(body.current_password, user.password_hash);
  if (!ok_) return c.json(fail('UNAUTHORIZED', 'Current password is incorrect'), 401);
  const hash = await hashPassword(body.new_password);
  await run(c.env.DB, `UPDATE admin_users SET password_hash = ? WHERE id = ?`, [hash, me.id]);
  await logActivity(c.env.DB, {
    admin_id: me.id,
    action: 'admin_user.password_changed',
    entity_type: 'admin_user',
    entity_id: me.id,
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok({ success: true }));
});

// Everything below is super_admin only.
adminUsersRouter.use('*', requireSuperAdmin);

adminUsersRouter.get('/', async (c) => {
  const rows = await all<AdminUser>(
    c.env.DB,
    `SELECT id, email, name, role, is_active, last_login, created_at
       FROM admin_users
       ORDER BY created_at DESC`,
    [],
  );
  return c.json(ok(rows.map((r) => ({ ...r, is_active: Boolean(r.is_active) }))));
});

adminUsersRouter.post('/', async (c) => {
  const body = adminUserCreateSchema.parse(await c.req.json());
  const existing = await first<{ id: string }>(
    c.env.DB,
    `SELECT id FROM admin_users WHERE LOWER(email) = ?`,
    [body.email],
  );
  if (existing) return c.json(fail('CONFLICT', 'Email already in use'), 409);

  const id = idHex();
  const hash = await hashPassword(body.password);
  await run(
    c.env.DB,
    `INSERT INTO admin_users (id, email, password_hash, name, role, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [id, body.email, hash, body.name, body.role],
  );

  const me = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: me.id,
    action: 'admin_user.created',
    entity_type: 'admin_user',
    entity_id: id,
    details: { email: body.email, role: body.role },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });

  const created = await first<AdminUser>(
    c.env.DB,
    `SELECT id, email, name, role, is_active, last_login, created_at FROM admin_users WHERE id = ?`,
    [id],
  );
  if (!created) return c.json(fail('INTERNAL', 'Failed to read created user'), 500);
  return c.json(ok({ ...toPublic(created), is_active: Boolean(created.is_active) }), 201);
});

adminUsersRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = adminUserUpdateSchema.parse(await c.req.json());
  const me = c.get('adminUser');

  const target = await first<AdminUser>(
    c.env.DB,
    `SELECT id, email, name, role, is_active FROM admin_users WHERE id = ?`,
    [id],
  );
  if (!target) return c.json(fail('NOT_FOUND', 'User not found'), 404);

  // Safety: prevent self-lockout. A super_admin can't demote themselves or deactivate self.
  if (id === me.id) {
    if (body.role && body.role !== 'super_admin') {
      return c.json(fail('FORBIDDEN', 'Cannot change your own role'), 403);
    }
    if (body.is_active === false) {
      return c.json(fail('FORBIDDEN', 'Cannot deactivate your own account'), 403);
    }
  }

  // Safety: don't allow demoting or deactivating the last active super_admin.
  if (target.role === 'super_admin' && (body.role !== undefined || body.is_active === false)) {
    const changingRole = body.role !== undefined && body.role !== 'super_admin';
    const deactivating = body.is_active === false;
    if (changingRole || deactivating) {
      const other = await first<{ n: number }>(
        c.env.DB,
        `SELECT COUNT(*) AS n FROM admin_users
          WHERE role = 'super_admin' AND is_active = 1 AND id != ?`,
        [id],
      );
      if ((other?.n ?? 0) === 0) {
        return c.json(
          fail('FORBIDDEN', 'Cannot demote or deactivate the last super admin'),
          403,
        );
      }
    }
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  if (body.name !== undefined) {
    sets.push('name = ?');
    params.push(body.name);
  }
  if (body.role !== undefined) {
    sets.push('role = ?');
    params.push(body.role);
  }
  if (body.is_active !== undefined) {
    sets.push('is_active = ?');
    params.push(body.is_active ? 1 : 0);
  }
  if (sets.length === 0) {
    return c.json(ok({ ...toPublic(target), is_active: Boolean(target.is_active) }));
  }
  await run(c.env.DB, `UPDATE admin_users SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);

  await logActivity(c.env.DB, {
    admin_id: me.id,
    action: 'admin_user.updated',
    entity_type: 'admin_user',
    entity_id: id,
    details: { fields: Object.keys(body) },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });

  const updated = await first<AdminUser>(
    c.env.DB,
    `SELECT id, email, name, role, is_active, last_login, created_at FROM admin_users WHERE id = ?`,
    [id],
  );
  if (!updated) return c.json(fail('NOT_FOUND', 'User not found'), 404);
  return c.json(ok({ ...toPublic(updated), is_active: Boolean(updated.is_active) }));
});

adminUsersRouter.post('/:id/reset-password', async (c) => {
  const id = c.req.param('id');
  const body = adminUserResetPasswordSchema.parse(await c.req.json());
  const me = c.get('adminUser');

  const target = await first<{ id: string }>(c.env.DB, `SELECT id FROM admin_users WHERE id = ?`, [
    id,
  ]);
  if (!target) return c.json(fail('NOT_FOUND', 'User not found'), 404);

  const hash = await hashPassword(body.password);
  await run(c.env.DB, `UPDATE admin_users SET password_hash = ? WHERE id = ?`, [hash, id]);

  await logActivity(c.env.DB, {
    admin_id: me.id,
    action: 'admin_user.password_reset',
    entity_type: 'admin_user',
    entity_id: id,
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok({ success: true }));
});
