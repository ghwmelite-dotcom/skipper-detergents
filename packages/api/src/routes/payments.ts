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

  const secretKey = c.env.PAYSTACK_SECRET_KEY ?? '';
  const callbackUrl = `${c.env.STOREFRONT_ORIGIN}/order/${order.order_number}`;

  // If a reference already exists on the order, we MUST reuse it — calling
  // Paystack with a new reference and writing it back unconditionally was a
  // race: two concurrent init calls each minted a reference, the second
  // overwrote the first, and the first webhook landed as "unknown".
  if (order.paystack_reference) {
    const result = await initPaystackTransaction({
      amountGhs: order.total_amount,
      email: order.delivery_email,
      reference: order.paystack_reference,
      callback_url: callbackUrl,
      secretKey,
      metadata: { order_id: order.id, order_number: order.order_number },
    });
    return c.json(ok(result));
  }

  // No reference yet — atomically claim one. UPDATE ... WHERE paystack_reference
  // IS NULL ensures only one concurrent caller wins; the other will read the
  // row again on retry and reuse the winning reference.
  const candidate = `SK-${order.order_number}-${Date.now()}`;
  const claimed = await first<{ paystack_reference: string }>(
    c.env.DB,
    `UPDATE orders SET paystack_reference = ?
     WHERE id = ? AND paystack_reference IS NULL
     RETURNING paystack_reference`,
    [candidate, order.id],
  );

  // If we lost the race, re-read the row and use whichever reference was written.
  const reference =
    claimed?.paystack_reference ??
    (
      await first<{ paystack_reference: string | null }>(
        c.env.DB,
        `SELECT paystack_reference FROM orders WHERE id = ?`,
        [order.id],
      )
    )?.paystack_reference ??
    candidate;

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
    `UPDATE orders SET paystack_access_code = ? WHERE id = ?`,
    [result.access_code, order.id],
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

  let payload: {
    event?: string;
    id?: string | number;
    data?: { id?: string | number; reference?: string; amount?: number };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    // Signature was valid but body is malformed — surface as a real error so
    // Paystack retries / our logs flag it, instead of silently returning 200.
    return c.json(fail('BAD_REQUEST', 'Malformed webhook payload'), 400);
  }

  if (payload.event !== 'charge.success') {
    return c.json(ok({ received: true, handled: false, event: payload.event }));
  }

  // Idempotency / replay protection: every Paystack webhook event carries a
  // unique id. Persist it before we apply the side-effect; if it's already
  // there, the previous delivery already won and a replayed `charge.success`
  // cannot re-flip a refunded/cancelled order back to paid.
  const eventId = String(payload.id ?? payload.data?.id ?? '');
  if (!eventId) {
    return c.json(ok({ received: true, handled: false, reason: 'missing event id' }));
  }
  const claim = await first<{ event_id: string }>(
    c.env.DB,
    `INSERT INTO processed_webhook_events (event_id, source, processed_at)
     VALUES (?, 'paystack', strftime('%s', 'now') * 1000)
     ON CONFLICT(event_id) DO NOTHING
     RETURNING event_id`,
    [eventId],
  );
  if (!claim) {
    return c.json(ok({ received: true, handled: false, reason: 'duplicate event' }));
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
