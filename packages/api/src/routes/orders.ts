import { Hono } from 'hono';
import { createOrderSchema, orderTrackingQuerySchema, uploadProofUrlSchema } from '@skipper/shared';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { validateAndPriceCart } from '../services/pricing';
import { createOrder, getOrderForCustomer, updateOrderProof } from '../services/orders';
import { getPublicSettings } from '../services/settings';

export const ordersRouter = new Hono<{ Bindings: Env }>();

async function resolveDeliveryFee(
  db: D1Database,
  method: 'pickup' | 'delivery',
  region: string | undefined,
): Promise<number> {
  if (method === 'pickup') return 0;
  const settings = await getPublicSettings(db);
  const accra = Number.parseFloat(settings.delivery_fee_accra ?? '15');
  const other = Number.parseFloat(settings.delivery_fee_other ?? '35');
  return region === 'Greater Accra' ? accra : other;
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
    delivery_email: body.delivery_email,
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
  return c.json(ok({ updated: true }));
});

export const trackRouter = new Hono<{ Bindings: Env }>();

trackRouter.get('/:order_number', async (c) => {
  const { email } = orderTrackingQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  const order = await getOrderForCustomer(c.env.DB, c.req.param('order_number'), email);
  if (!order) {
    return c.json(fail('NOT_FOUND', 'Order not found or email mismatch'), 404);
  }
  return c.json(ok(order));
});
