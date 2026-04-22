import { Hono } from 'hono';
import { z } from 'zod';
import {
  updateOrderStatusSchema,
  confirmManualPaymentSchema,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '@skipper/shared';
import type { Env } from '../../types/env';
import { ok, fail } from '../../utils/response';
import { adminAuth, type AdminVariables } from '../../middleware/adminAuth';
import {
  adminListOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
  adminConfirmManualPayment,
  adminAppendOrderNote,
} from '../../services/adminOrders';
import { logActivity } from '../../services/activity';
import { first } from '../../utils/db';

const numericFromString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((v) => !Number.isNaN(v), { message: 'must be a number' });

const listQuerySchema = z.object({
  page: numericFromString.pipe(z.number().int().positive()).default(1),
  per_page: numericFromString.pipe(z.number().int().positive().max(200)).default(25),
  status: z.enum(ORDER_STATUSES).optional(),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
  payment_status: z.enum(PAYMENT_STATUSES).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
});

const addNoteSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export const adminOrdersRouter = new Hono<{ Bindings: Env; Variables: AdminVariables }>();
adminOrdersRouter.use('*', adminAuth);

adminOrdersRouter.get('/', async (c) => {
  const query = listQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const { orders, total } = await adminListOrders(c.env.DB, query);
  return c.json(ok(orders, { page: query.page, per_page: query.per_page, total }));
});

adminOrdersRouter.get('/:id', async (c) => {
  const order = await adminGetOrder(c.env.DB, c.req.param('id'));
  if (!order) return c.json(fail('NOT_FOUND', 'Order not found'), 404);
  return c.json(ok(order));
});

adminOrdersRouter.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = updateOrderStatusSchema.parse(await c.req.json());

  if (body.status === 'shipped' && !body.tracking_number && !body.tracking_url) {
    return c.json(
      fail('VALIDATION_ERROR', 'tracking_number or tracking_url required when marking as shipped'),
      400,
    );
  }

  const updated = await adminUpdateOrderStatus(
    c.env.DB,
    id,
    body.status,
    body.tracking_number,
    body.tracking_url,
  );
  if (!updated) return c.json(fail('NOT_FOUND', 'Order not found'), 404);

  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'order.status_changed',
    entity_type: 'order',
    entity_id: id,
    details: {
      status: body.status,
      ...(body.tracking_number ? { tracking_number: body.tracking_number } : {}),
      ...(body.tracking_url ? { tracking_url: body.tracking_url } : {}),
    },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });

  return c.json(ok(updated));
});

adminOrdersRouter.patch('/:id/payment', async (c) => {
  const id = c.req.param('id');
  const body = confirmManualPaymentSchema.parse(await c.req.json());
  const admin = c.get('adminUser');

  if (body.action === 'confirm') {
    const updated = await adminConfirmManualPayment(c.env.DB, id, admin.id);
    if (!updated) return c.json(fail('NOT_FOUND', 'Order not found'), 404);
    await logActivity(c.env.DB, {
      admin_id: admin.id,
      action: 'order.payment_confirmed',
      entity_type: 'order',
      entity_id: id,
      details: { reason: body.reason ?? null },
      ip_address: c.req.header('cf-connecting-ip') ?? null,
    });
    return c.json(ok(updated));
  }

  // reject
  const existing = await first<{ id: string }>(c.env.DB, `SELECT id FROM orders WHERE id = ?`, [id]);
  if (!existing) return c.json(fail('NOT_FOUND', 'Order not found'), 404);
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'order.payment_rejected',
    entity_type: 'order',
    entity_id: id,
    details: { reason: body.reason ?? null },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok({ id, rejected: true, reason: body.reason ?? null }));
});

adminOrdersRouter.post('/:id/notes', async (c) => {
  const id = c.req.param('id');
  const body = addNoteSchema.parse(await c.req.json());
  const admin = c.get('adminUser');

  // Look up admin name for the prepended tag
  const adminRow = await first<{ name: string }>(
    c.env.DB,
    `SELECT name FROM admin_users WHERE id = ?`,
    [admin.id],
  );
  const adminName = adminRow?.name ?? admin.email;

  const updated = await adminAppendOrderNote(c.env.DB, id, body.text, adminName);
  if (!updated) return c.json(fail('NOT_FOUND', 'Order not found'), 404);

  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'order.note_added',
    entity_type: 'order',
    entity_id: id,
    details: { text: body.text },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });

  return c.json(ok(updated));
});
