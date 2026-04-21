import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { hmacSha512Hex } from '../../src/utils/crypto';
import {
  resetDatabase,
  seedCategories,
  seedProducts,
  seedSetting,
} from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [{ id: 'c1', name: 'D', slug: 'd' }]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'Skipper 2L',
      slug: 'p1',
      description: 'x',
      category_id: 'c1',
      brand: 'Skipper',
      unit_price: 45,
      stock_quantity: 10,
    },
  ]);
  await seedSetting(env.DB, 'delivery_fee_accra', '15');
  vi.restoreAllMocks();
});

async function placePaystackOrder(): Promise<{ id: string; order_number: string; total: number }> {
  const res = await app.request(
    '/api/orders',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ product_id: 'p1', quantity: 1 }],
        delivery_method: 'delivery',
        delivery_name: 'Ama',
        delivery_email: 'ama@example.com',
        delivery_phone: '+233',
        delivery_address: 'x',
        delivery_city: 'Accra',
        delivery_region: 'Greater Accra',
        payment_method: 'paystack',
      }),
    },
    env,
  );
  const body = await res.json<{
    data: { order: { id: string; order_number: string; total_amount: number } };
  }>();
  return {
    id: body.data.order.id,
    order_number: body.data.order.order_number,
    total: body.data.order.total_amount,
  };
}

describe('POST /api/payments/paystack/init', () => {
  it('returns access_code + authorization_url + reference', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          data: {
            access_code: 'ACX',
            authorization_url: 'https://checkout.paystack.com/ACX',
            reference: 'auto_ref',
          },
        }),
        { status: 200 },
      ),
    );
    const order = await placePaystackOrder();
    const res = await app.request(
      '/api/payments/paystack/init',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      },
      { ...env, PAYSTACK_SECRET_KEY: 'sk_test_stub' } as typeof env,
    );
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: { access_code: string; authorization_url: string; reference: string };
    }>();
    expect(body.data.access_code).toBe('ACX');
    expect(body.data.reference).toBe('auto_ref');
  });

  it('returns 404 for unknown order', async () => {
    const res = await app.request(
      '/api/payments/paystack/init',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'nope' }),
      },
      { ...env, PAYSTACK_SECRET_KEY: 'sk_test_stub' } as typeof env,
    );
    expect(res.status).toBe(404);
  });
});

describe('POST /webhooks/paystack', () => {
  it('rejects unsigned payload with 401', async () => {
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'x', amount: 0 } });
    const res = await app.request(
      '/webhooks/paystack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
      { ...env, PAYSTACK_WEBHOOK_SECRET: 'wh_secret' } as typeof env,
    );
    expect(res.status).toBe(401);
  });

  it('marks paystack order as paid when signature + amount match', async () => {
    const order = await placePaystackOrder();
    await env.DB.prepare(`UPDATE orders SET paystack_reference = ? WHERE id = ?`)
      .bind('ref_abc', order.id)
      .run();

    const payload = {
      event: 'charge.success',
      data: { reference: 'ref_abc', amount: Math.round(order.total * 100), status: 'success' },
    };
    const rawBody = JSON.stringify(payload);
    const sig = await hmacSha512Hex(rawBody, 'wh_secret');

    const res = await app.request(
      '/webhooks/paystack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig },
        body: rawBody,
      },
      { ...env, PAYSTACK_WEBHOOK_SECRET: 'wh_secret' } as typeof env,
    );
    expect(res.status).toBe(200);

    const updated = await env.DB.prepare(`SELECT payment_status, status FROM orders WHERE id = ?`)
      .bind(order.id)
      .first<{ payment_status: string; status: string }>();
    expect(updated?.payment_status).toBe('paid');
    expect(updated?.status).toBe('confirmed');
  });

  it('is idempotent — second valid webhook returns 200 without double-paying', async () => {
    const order = await placePaystackOrder();
    await env.DB.prepare(`UPDATE orders SET paystack_reference = ? WHERE id = ?`)
      .bind('ref_abc', order.id)
      .run();
    const payload = {
      event: 'charge.success',
      data: { reference: 'ref_abc', amount: Math.round(order.total * 100) },
    };
    const rawBody = JSON.stringify(payload);
    const sig = await hmacSha512Hex(rawBody, 'wh_secret');

    const first = await app.request(
      '/webhooks/paystack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig },
        body: rawBody,
      },
      { ...env, PAYSTACK_WEBHOOK_SECRET: 'wh_secret' } as typeof env,
    );
    const second = await app.request(
      '/webhooks/paystack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig },
        body: rawBody,
      },
      { ...env, PAYSTACK_WEBHOOK_SECRET: 'wh_secret' } as typeof env,
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it('ignores non-success events and returns 200', async () => {
    const payload = { event: 'charge.failed', data: { reference: 'x' } };
    const rawBody = JSON.stringify(payload);
    const sig = await hmacSha512Hex(rawBody, 'wh_secret');
    const res = await app.request(
      '/webhooks/paystack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig },
        body: rawBody,
      },
      { ...env, PAYSTACK_WEBHOOK_SECRET: 'wh_secret' } as typeof env,
    );
    expect(res.status).toBe(200);
  });
});
