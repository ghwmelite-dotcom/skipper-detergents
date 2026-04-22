import { Hono } from 'hono';
import { customerUpdateSchema, type CustomerStatus } from '@skipper/shared';
import type { Env } from '../../types/env';
import { ok, fail } from '../../utils/response';
import { all, first, run } from '../../utils/db';
import { adminAuth, type AdminVariables } from '../../middleware/adminAuth';
import { logActivity } from '../../services/activity';

export const adminCustomersRouter = new Hono<{ Bindings: Env; Variables: AdminVariables }>();
adminCustomersRouter.use('*', adminAuth);

// List customers aggregated from orders, LEFT JOINed to the customers table for
// status/notes. Email is the natural key — orders always carry delivery_email.
adminCustomersRouter.get('/', async (c) => {
  const q = c.req.query('q')?.trim().toLowerCase() ?? '';
  const status = c.req.query('status')?.trim() ?? '';
  const hasQ = q.length > 0;
  const hasStatus = status.length > 0;

  const whereParts: string[] = [];
  const params: unknown[] = [];
  if (hasQ) {
    whereParts.push(
      '(LOWER(o.delivery_email) LIKE ? OR LOWER(o.delivery_name) LIKE ? OR o.delivery_phone LIKE ?)',
    );
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  // Aggregate orders by lower(email) — that's the one field guaranteed to be present.
  const rows = await all<{
    email: string;
    name: string;
    phone: string;
    city: string | null;
    region: string | null;
    total_orders: number;
    total_spent: number;
    paid_spent: number;
    last_order_at: string;
    first_order_at: string;
    status: CustomerStatus | null;
    notes: string | null;
  }>(
    c.env.DB,
    `SELECT
        LOWER(o.delivery_email) AS email,
        MAX(o.delivery_name)    AS name,
        MAX(o.delivery_phone)   AS phone,
        MAX(o.delivery_city)    AS city,
        MAX(o.delivery_region)  AS region,
        COUNT(o.id)             AS total_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_spent,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) AS paid_spent,
        MAX(o.created_at)       AS last_order_at,
        MIN(o.created_at)       AS first_order_at,
        c.status                AS status,
        c.notes                 AS notes
       FROM orders o
       LEFT JOIN customers c ON LOWER(c.email) = LOWER(o.delivery_email)
       ${where}
       GROUP BY LOWER(o.delivery_email)
       ORDER BY MAX(o.created_at) DESC`,
    params,
  );

  const filtered = hasStatus ? rows.filter((r) => (r.status ?? 'regular') === status) : rows;

  return c.json(
    ok(
      filtered.map((r) => ({
        ...r,
        status: (r.status ?? 'regular') as CustomerStatus,
      })),
    ),
  );
});

adminCustomersRouter.get('/:email', async (c) => {
  const email = decodeURIComponent(c.req.param('email')).toLowerCase();

  const summary = await first<{
    email: string;
    name: string;
    phone: string;
    city: string | null;
    region: string | null;
    total_orders: number;
    total_spent: number;
    paid_spent: number;
    last_order_at: string;
    first_order_at: string;
  }>(
    c.env.DB,
    `SELECT
        LOWER(o.delivery_email) AS email,
        MAX(o.delivery_name)    AS name,
        MAX(o.delivery_phone)   AS phone,
        MAX(o.delivery_city)    AS city,
        MAX(o.delivery_region)  AS region,
        COUNT(o.id)             AS total_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_spent,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) AS paid_spent,
        MAX(o.created_at)       AS last_order_at,
        MIN(o.created_at)       AS first_order_at
       FROM orders o
       WHERE LOWER(o.delivery_email) = ?
       GROUP BY LOWER(o.delivery_email)`,
    [email],
  );

  if (!summary) return c.json(fail('NOT_FOUND', 'Customer not found'), 404);

  const customerRow = await first<{ status: CustomerStatus | null; notes: string | null }>(
    c.env.DB,
    `SELECT status, notes FROM customers WHERE LOWER(email) = ?`,
    [email],
  );

  const orders = await all<{
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
  }>(
    c.env.DB,
    `SELECT id, order_number, status, payment_status, total_amount, created_at
       FROM orders
       WHERE LOWER(delivery_email) = ?
       ORDER BY created_at DESC
       LIMIT 200`,
    [email],
  );

  return c.json(
    ok({
      ...summary,
      status: (customerRow?.status ?? 'regular') as CustomerStatus,
      notes: customerRow?.notes ?? null,
      orders,
    }),
  );
});

adminCustomersRouter.patch('/:email', async (c) => {
  const email = decodeURIComponent(c.req.param('email')).toLowerCase();
  const body = customerUpdateSchema.parse(await c.req.json());
  const me = c.get('adminUser');

  // Make sure this email actually has orders — otherwise 404.
  const existing = await first<{ n: number }>(
    c.env.DB,
    `SELECT COUNT(*) AS n FROM orders WHERE LOWER(delivery_email) = ?`,
    [email],
  );
  if ((existing?.n ?? 0) === 0) {
    return c.json(fail('NOT_FOUND', 'Customer not found'), 404);
  }

  // Pull a representative name/phone from the orders so the customers row has something
  // useful if this is the first time we're creating it.
  const ref = await first<{ name: string; phone: string }>(
    c.env.DB,
    `SELECT delivery_name AS name, delivery_phone AS phone
       FROM orders
       WHERE LOWER(delivery_email) = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    [email],
  );

  const status = body.status ?? null;
  const notes = body.notes ?? null;

  // Upsert by email.
  await run(
    c.env.DB,
    `INSERT INTO customers (email, first_name, phone, status, notes)
     VALUES (?, ?, ?, COALESCE(?, 'regular'), ?)
     ON CONFLICT(email) DO UPDATE SET
       status     = COALESCE(excluded.status, customers.status),
       notes      = COALESCE(excluded.notes,  customers.notes),
       updated_at = datetime('now')`,
    [email, ref?.name ?? null, ref?.phone ?? null, status, notes],
  );

  await logActivity(c.env.DB, {
    admin_id: me.id,
    action: 'customer.updated',
    entity_type: 'customer',
    entity_id: email,
    details: { fields: Object.keys(body), status: body.status ?? null },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });

  const updated = await first<{ status: CustomerStatus | null; notes: string | null }>(
    c.env.DB,
    `SELECT status, notes FROM customers WHERE LOWER(email) = ?`,
    [email],
  );
  return c.json(
    ok({
      email,
      status: (updated?.status ?? 'regular') as CustomerStatus,
      notes: updated?.notes ?? null,
    }),
  );
});
