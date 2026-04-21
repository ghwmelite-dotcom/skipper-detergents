import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
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
  await seedSetting(env.DB, 'delivery_fee_other', '35');
  await seedSetting(
    env.DB,
    'manual_payment_details',
    'MTN MoMo: 024 000 0000 / GCB: 1234567890',
  );
});

describe('POST /api/orders — paystack', () => {
  it('creates an order and returns next=paystack_init', async () => {
    const res = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: 'p1', quantity: 2 }],
          delivery_method: 'delivery',
          delivery_name: 'Ama Owusu',
          delivery_email: 'ama@example.com',
          delivery_phone: '+233241234567',
          delivery_address: '14 Independence Ave',
          delivery_city: 'Accra',
          delivery_region: 'Greater Accra',
          payment_method: 'paystack',
        }),
      },
      env,
    );

    expect(res.status).toBe(201);
    const body = await res.json<{
      success: boolean;
      data: {
        order: { order_number: string; total_amount: number };
        next: { action: string };
      };
    }>();
    expect(body.success).toBe(true);
    expect(body.data.order.order_number).toMatch(/^SK-\d{8}-\d{4}$/);
    expect(body.data.order.total_amount).toBe(105);
    expect(body.data.next.action).toBe('paystack_init');
  });

  it('uses other-region delivery fee', async () => {
    const res = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: 'p1', quantity: 1 }],
          delivery_method: 'delivery',
          delivery_name: 'A',
          delivery_email: 'a@example.com',
          delivery_phone: '+233',
          delivery_address: 'x',
          delivery_city: 'Kumasi',
          delivery_region: 'Ashanti',
          payment_method: 'paystack',
        }),
      },
      env,
    );
    const body = await res.json<{ data: { order: { delivery_fee: number; total_amount: number } } }>();
    expect(body.data.order.delivery_fee).toBe(35);
    expect(body.data.order.total_amount).toBe(80);
  });

  it('zero delivery fee for pickup', async () => {
    const res = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: 'p1', quantity: 1 }],
          delivery_method: 'pickup',
          delivery_name: 'A',
          delivery_email: 'a@example.com',
          delivery_phone: '+233',
          payment_method: 'paystack',
        }),
      },
      env,
    );
    const body = await res.json<{ data: { order: { delivery_fee: number } } }>();
    expect(body.data.order.delivery_fee).toBe(0);
  });

  it('rejects missing address on delivery method', async () => {
    const res = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: 'p1', quantity: 1 }],
          delivery_method: 'delivery',
          delivery_name: 'A',
          delivery_email: 'a@example.com',
          delivery_phone: '+233',
          payment_method: 'paystack',
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/orders — manual_transfer', () => {
  it('returns manual_payment_details in next', async () => {
    const res = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: 'p1', quantity: 1 }],
          delivery_method: 'pickup',
          delivery_name: 'A',
          delivery_email: 'a@example.com',
          delivery_phone: '+233',
          payment_method: 'manual_transfer',
        }),
      },
      env,
    );
    const body = await res.json<{
      data: { next: { action: string; manual_payment_details: string } };
    }>();
    expect(body.data.next.action).toBe('upload_proof');
    expect(body.data.next.manual_payment_details).toContain('MTN');
  });
});

describe('PATCH /api/orders/:id/proof', () => {
  async function placeManualOrder(): Promise<string> {
    const res = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: 'p1', quantity: 1 }],
          delivery_method: 'pickup',
          delivery_name: 'A',
          delivery_email: 'a@example.com',
          delivery_phone: '+233',
          payment_method: 'manual_transfer',
        }),
      },
      env,
    );
    const body = await res.json<{ data: { order: { id: string } } }>();
    return body.data.order.id;
  }

  it('updates the proof URL', async () => {
    const id = await placeManualOrder();
    const res = await app.request(
      `/api/orders/${id}/proof`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_url: 'https://proofs.example/ab.jpg' }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown order', async () => {
    const res = await app.request(
      '/api/orders/nope/proof',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_url: 'https://proofs.example/ab.jpg' }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it('rejects non-https proof URL', async () => {
    const id = await placeManualOrder();
    const res = await app.request(
      `/api/orders/${id}/proof`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_url: 'http://proofs.example/ab.jpg' }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/track/:order_number', () => {
  async function placeOrder(email: string): Promise<string> {
    const res = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: 'p1', quantity: 1 }],
          delivery_method: 'pickup',
          delivery_name: 'A',
          delivery_email: email,
          delivery_phone: '+233',
          payment_method: 'paystack',
        }),
      },
      env,
    );
    const body = await res.json<{ data: { order: { order_number: string } } }>();
    return body.data.order.order_number;
  }

  it('returns order + items when email matches', async () => {
    const num = await placeOrder('ama@example.com');
    const res = await app.request(`/api/track/${num}?email=ama@example.com`, {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { order_number: string; items: unknown[] } }>();
    expect(body.data.order_number).toBe(num);
    expect(body.data.items).toHaveLength(1);
  });

  it('returns 404 when email does not match', async () => {
    const num = await placeOrder('ama@example.com');
    const res = await app.request(`/api/track/${num}?email=other@example.com`, {}, env);
    expect(res.status).toBe(404);
  });

  it('returns 400 when email query is missing', async () => {
    const res = await app.request(`/api/track/SK-20260421-0001`, {}, env);
    expect(res.status).toBe(400);
  });
});
