import { Hono } from 'hono';
import { createOrderSchema, orderTrackingQuerySchema, uploadProofUrlSchema } from '@skipper/shared';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { validateAndPriceCart } from '../services/pricing';
import { createOrder, getOrderForCustomer, updateOrderProof } from '../services/orders';
import { getPublicSettings } from '../services/settings';
import { sendOrderCreatedEmails } from '../services/orderEmails';
import { createAdminNotification } from '../services/notifications';
import { first } from '../utils/db';

export const ordersRouter = new Hono<{ Bindings: Env }>();

async function resolveDeliveryFee(
  _db: D1Database,
  method: 'pickup' | 'delivery',
  _region: string | undefined,
): Promise<number> {
  // We no longer ask for an address at checkout — the store owner calls the
  // customer to agree on the drop point and the final fee, then updates the
  // order via PATCH /api/admin/orders/:id/delivery-fee. So every order starts
  // with no delivery fee and the admin sets the real number before payment.
  // Pickup is free either way.
  if (method === 'pickup') return 0;
  return 0;
}

ordersRouter.post('/', async (c) => {
  const body = createOrderSchema.parse(await c.req.json());
  const cart = await validateAndPriceCart(c.env.DB, body.items);
  const delivery_fee = await resolveDeliveryFee(
    c.env.DB,
    body.delivery_method,
    body.delivery_region,
  );
  const ip = c.req.header('cf-connecting-ip') ?? undefined;
  const ua = c.req.header('user-agent') ?? undefined;

  const orderInput = {
    cart,
    payment_method: body.payment_method,
    delivery_method: body.delivery_method,
    delivery_name: body.delivery_name,
    ...(body.delivery_email !== undefined && { delivery_email: body.delivery_email }),
    delivery_phone: body.delivery_phone,
    delivery_fee,
    now: new Date(),
    ...(body.delivery_address !== undefined && { delivery_address: body.delivery_address }),
    ...(body.delivery_city !== undefined && { delivery_city: body.delivery_city }),
    ...(body.delivery_region !== undefined && { delivery_region: body.delivery_region }),
    ...(body.delivery_gps !== undefined && { delivery_gps: body.delivery_gps }),
    ...(body.delivery_notes !== undefined && { delivery_notes: body.delivery_notes }),
    ...(ip !== undefined && { ip_address: ip }),
    ...(ua !== undefined && { user_agent: ua }),
  };
  const order = await createOrder(c.env.DB, orderInput);

  await createAdminNotification(c.env.DB, {
    type: 'order.created',
    title: `New order · ${order.order_number}`,
    body: `${order.delivery_name} · ${order.payment_method === 'paystack' ? 'Paystack' : 'Bank / MoMo transfer'}`,
    entity_type: 'order',
    entity_id: order.id,
    metadata: {
      order_number: order.order_number,
      customer_name: order.delivery_name,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
    },
  });

  // Notification emails (customer confirmation + admin alert) run after the
  // response so a slow Resend call can't block the order acknowledgement.
  c.executionCtx.waitUntil(sendOrderCreatedEmails(c.env, order));

  if (body.payment_method === 'paystack') {
    return c.json(ok({ order, next: { action: 'paystack_init' as const } }), 201);
  }

  const settings = await getPublicSettings(c.env.DB);
  return c.json(
    ok({
      order,
      next: {
        action: 'upload_proof' as const,
        manual_payment_details:
          settings.manual_payment_details ?? 'Bank / MoMo details will be provided after launch',
        upload_endpoint: `/api/upload/payment-proof?order_id=${order.id}`,
      },
    }),
    201,
  );
});

ordersRouter.patch('/:id/proof', async (c) => {
  const id = c.req.param('id');
  const body = uploadProofUrlSchema.parse(await c.req.json());
  const updated = await updateOrderProof(c.env.DB, id, body.proof_url);
  if (!updated) {
    return c.json(fail('NOT_FOUND', 'Order not found'), 404);
  }

  const meta = await first<{ order_number: string; delivery_name: string }>(
    c.env.DB,
    `SELECT order_number, delivery_name FROM orders WHERE id = ?`,
    [id],
  );
  if (meta) {
    await createAdminNotification(c.env.DB, {
      type: 'order.payment_proof_uploaded',
      title: `Payment proof uploaded · ${meta.order_number}`,
      body: `${meta.delivery_name} uploaded proof — review and confirm.`,
      entity_type: 'order',
      entity_id: id,
      metadata: { order_number: meta.order_number },
    });
  }
  return c.json(ok({ updated: true }));
});

export const trackRouter = new Hono<{ Bindings: Env }>();

trackRouter.get('/:order_number', async (c) => {
  const parsed = orderTrackingQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  const by = {
    ...(parsed.email !== undefined && { email: parsed.email }),
    ...(parsed.phone !== undefined && { phone: parsed.phone }),
  };
  const order = await getOrderForCustomer(c.env.DB, c.req.param('order_number'), by);
  if (!order) {
    return c.json(fail('NOT_FOUND', 'Order not found or details did not match'), 404);
  }
  return c.json(ok(order));
});
