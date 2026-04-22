import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../../types/env';
import { ok } from '../../utils/response';
import { adminAuth, type AdminVariables } from '../../middleware/adminAuth';
import { all, run } from '../../utils/db';
import { PUBLIC_SETTING_KEYS } from '../../services/settings';
import { logActivity } from '../../services/activity';

const PRIVATE_SETTING_KEYS = [
  'paystack_secret_key',
  'paystack_webhook_secret',
  'paystack_public_key',
  'shipping_api_key',
  'admin_notification_email',
] as const;

const ALLOWED_KEYS = new Set<string>([...PUBLIC_SETTING_KEYS, ...PRIVATE_SETTING_KEYS]);

const patchSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export const adminSettingsRouter = new Hono<{ Bindings: Env; Variables: { adminUser: { id: string; email: string; role: 'admin' | 'super_admin' } } }>();
adminSettingsRouter.use('*', adminAuth);

adminSettingsRouter.get('/', async (c) => {
  const rows = await all<{ key: string; value: string; updated_at: string }>(
    c.env.DB,
    `SELECT key, value, updated_at FROM store_settings ORDER BY key ASC`,
    [],
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return c.json(
    ok({
      settings: map,
      allowed_keys: Array.from(ALLOWED_KEYS).sort(),
      public_keys: [...PUBLIC_SETTING_KEYS],
      private_keys: [...PRIVATE_SETTING_KEYS],
    }),
  );
});

adminSettingsRouter.patch('/', async (c) => {
  const body = patchSchema.parse(await c.req.json());
  const admin = c.get('adminUser');
  const keys = Object.keys(body.settings);
  const rejected: string[] = [];
  const accepted: string[] = [];

  const statements: D1PreparedStatement[] = [];
  for (const key of keys) {
    if (!ALLOWED_KEYS.has(key)) {
      rejected.push(key);
      continue;
    }
    const value = body.settings[key] ?? '';
    statements.push(
      c.env.DB
        .prepare(
          `INSERT INTO store_settings (key, value, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        )
        .bind(key, value),
    );
    accepted.push(key);
  }

  if (statements.length) {
    await c.env.DB.batch(statements);
  }

  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'settings.updated',
    entity_type: 'settings',
    details: { accepted, rejected },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });

  return c.json(ok({ accepted, rejected }));
});
