import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { first, run } from '../utils/db';
import {
  initPaystackTransaction,
  markOrderPaidFromWebhook,
  verifyPaystackSignature,
} from '../services/paystack';
import { createAdminNotification } from '../services/notifications';

const paystackInitBodySchema = z.object({ order_id: z.string().min(1) });

export const paymentsRouter = new Hono<{ Bindings: Env }>();

paymentsRouter.post('/paystack/init', async (c) => {
  const { order_id } = paystackInitBodySchema.parse(await c.req.json());
  const order = await first<{
    id: string;
    order_number: string;
    total_amount: number;
    payment_method: string;
    payment_status: string;
    delivery_email: string;
    paystack_reference: string | null;
  }>(
    c.env.DB,
    `SELECT id, order_number, total_amount, payment_method, payment_status, delivery_email, paystack_reference
     FROM orders WHERE id = ?`,
    [order_id],
  );
  if (!order) {
    return c.json(fail('NOT_FOUND', 'Order not found'), 404);
  }
  if (order.payment_method !== 'paystack') {
    return c.json(fail('BAD_REQUEST', 'Order is not a paystack order'), 400);
  }
  if (order.payment_status === 'paid') {
    return c.json(fail('CONFLICT', 'Order is already paid'), 409);
  }

  const reference = order.paystack_reference ?? `SK-${order.order_number}-${Date.now()}`;
  const secretKey = c.env.PAYSTACK_SECRET_KEY ?? '';
  const callbackUrl = `${c.env.STOREFRONT_ORIGIN}/order/${order.order_number}`;

  const result = await initPaystackTransaction({
    amountGhs: order.total_amount,
    email: order.delivery_email,
    reference,
    callback_url: callbackUrl,
    secretKey,
    metadata: { order_id: order.id, order_number: order.order_number },
  });

  await run(
    c.env.DB,
    `UPDATE orders SET paystack_reference = ?, paystack_access_code = ? WHERE id = ?`,
    [result.reference, result.access_code, order.id],
  );

  return c.json(ok(result));
});

export const webhooksRouter = new Hono<{ Bindings: Env }>();

webhooksRouter.post('/paystack', async (c) => {
  const secret = c.env.PAYSTACK_WEBHOOK_SECRET ?? '';
  const sig = c.req.header('x-paystack-signature') ?? '';
  const rawBody = await c.req.text();

  const valid = await verifyPaystackSignature(rawBody, sig, secret);
  if (!valid) {
    return c.json(fail('UNAUTHORIZED', 'Invalid signature'), 401);
  }

  let payload: { event?: string; data?: { reference?: string; amount?: number } };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return c.json(ok({ received: false }));
  }

  if (payload.event !== 'charge.success') {
    return c.json(ok({ received: true, handled: false, event: payload.event }));
  }

  const ref = payload.data?.reference;
  const amount = payload.data?.amount;
  if (!ref || typeof amount !== 'number') {
    return c.json(ok({ received: true, handled: false, reason: 'missing fields' }));
  }

  const result = await markOrderPaidFromWebhook(c.env.DB, ref, amount);

  if (result.action === 'marked_paid') {
    const order = await first<{ id: string; order_number: string; total_amount: number; delivery_name: string }>(
      c.env.DB,
      `SELECT id, order_number, total_amount, delivery_name FROM orders WHERE paystack_reference = ?`,
      [ref],
    );
    if (order) {
      await createAdminNotification(c.env.DB, {
        type: 'order.paystack_paid',
        title: `Paystack payment received · ${order.order_number}`,
        body: `${order.delivery_name} paid in full via Paystack.`,
        entity_type: 'order',
        entity_id: order.id,
        metadata: { order_number: order.order_number, total_amount: order.total_amount },
      });
    }
  }

  return c.json(ok({ received: true, handled: true, action: result.action }));
});
