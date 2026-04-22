import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  createOrder,
  getOrderForCustomer,
  updateOrderProof,
  nextOrderNumber,
} from '../../src/services/orders';
import type { PricedCart } from '../../src/services/pricing';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

async function priced(): Promise<PricedCart> {
  return {
    line_items: [
      {
        product_id: 'p1',
        variant_id: null,
        product_name: 'Skipper 2L',
        variant_name: null,
        sku: 'SK-LIQ-2L',
        quantity: 2,
        unit_price: 45,
        is_bulk_order: 0,
        bulk_tier_id: null,
        line_total: 90,
      },
    ],
    subtotal: 90,
    bulk_discount: 0,
  };
}

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
});

describe('nextOrderNumber', () => {
  it('generates SK-YYYYMMDD-0001 for the first order of the day', async () => {
    const now = new Date('2026-04-21T10:00:00Z');
    const n = await nextOrderNumber(env.DB, now);
    expect(n).toBe('SK-20260421-0001');
  });

  it('increments within the same day', async () => {
    const now = new Date('2026-04-21T10:00:00Z');
    const n1 = await nextOrderNumber(env.DB, now);
    const n2 = await nextOrderNumber(env.DB, now);
    const n3 = await nextOrderNumber(env.DB, now);
    expect(n1).toBe('SK-20260421-0001');
    expect(n2).toBe('SK-20260421-0002');
    expect(n3).toBe('SK-20260421-0003');
  });

  it('restarts the sequence on a new day', async () => {
    await nextOrderNumber(env.DB, new Date('2026-04-21T10:00:00Z'));
    const next = await nextOrderNumber(env.DB, new Date('2026-04-22T09:00:00Z'));
    expect(next).toBe('SK-20260422-0001');
  });
});

describe('createOrder', () => {
  it('creates an order, order_items, upserts customer, decrements stock — all atomically', async () => {
    const cart = await priced();
    const order = await createOrder(env.DB, {
      cart,
      payment_method: 'paystack',
      delivery_method: 'delivery',
      delivery_name: 'Ama Owusu',
      delivery_email: 'ama@example.com',
      delivery_phone: '+233241234567',
      delivery_address: '14 Independence Ave',
      delivery_city: 'Accra',
      delivery_region: 'Greater Accra',
      delivery_fee: 15,
      now: new Date('2026-04-21T10:00:00Z'),
      ip_address: '1.2.3.4',
      user_agent: 'test',
    });

    expect(order.order_number).toBe('SK-20260421-0001');
    expect(order.status).toBe('pending');
    expect(order.payment_status).toBe('unpaid');
    expect(order.subtotal).toBe(90);
    expect(order.delivery_fee).toBe(15);
    expect(order.total_amount).toBe(105);
    expect(order.delivery_email).toBe('ama@example.com');

    const items = await env.DB.prepare(
      `SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = ?`,
    )
      .bind(order.id)
      .all<{ product_id: string; quantity: number; unit_price: number }>();
    expect(items.results).toEqual([{ product_id: 'p1', quantity: 2, unit_price: 45 }]);

    const stock = await env.DB.prepare(`SELECT stock_quantity FROM products WHERE id = ?`)
      .bind('p1')
      .first<{ stock_quantity: number }>();
    expect(stock?.stock_quantity).toBe(8);

    const customer = await env.DB.prepare(`SELECT email FROM customers WHERE email = ?`)
      .bind('ama@example.com')
      .first<{ email: string }>();
    expect(customer?.email).toBe('ama@example.com');
  });

  it('fails when stock is insufficient (simulated race)', async () => {
    await env.DB.prepare(`UPDATE products SET stock_quantity = 1 WHERE id = ?`).bind('p1').run();
    const cart = await priced();
    await expect(
      createOrder(env.DB, {
        cart,
        payment_method: 'paystack',
        delivery_method: 'delivery',
        delivery_name: 'A',
        delivery_email: 'a@example.com',
        delivery_phone: '+233200000000',
        delivery_address: 'x',
        delivery_city: 'Accra',
        delivery_region: 'Greater Accra',
        delivery_fee: 15,
        now: new Date('2026-04-21T10:00:00Z'),
      }),
    ).rejects.toThrow();
    const stock = await env.DB.prepare(`SELECT stock_quantity FROM products WHERE id = ?`)
      .bind('p1')
      .first<{ stock_quantity: number }>();
    expect(stock?.stock_quantity).toBe(1);
  });

  it('reuses the customer row on second order with same email', async () => {
    const cart = await priced();
    await createOrder(env.DB, {
      cart,
      payment_method: 'paystack',
      delivery_method: 'delivery',
      delivery_name: 'Ama',
      delivery_email: 'ama@example.com',
      delivery_phone: '+233200000000',
      delivery_address: 'x',
      delivery_city: 'Accra',
      delivery_region: 'Greater Accra',
      delivery_fee: 15,
      now: new Date('2026-04-21T10:00:00Z'),
    });
    await createOrder(env.DB, {
      cart,
      payment_method: 'paystack',
      delivery_method: 'delivery',
      delivery_name: 'Ama',
      delivery_email: 'ama@example.com',
      delivery_phone: '+233200000000',
      delivery_address: 'x',
      delivery_city: 'Accra',
      delivery_region: 'Greater Accra',
      delivery_fee: 15,
      now: new Date('2026-04-21T10:00:00Z'),
    });
    const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM customers`).first<{
      n: number;
    }>();
    expect(count?.n).toBe(1);
  });
});

describe('getOrderForCustomer', () => {
  it('returns order + items when email matches (case insensitive)', async () => {
    const cart = await priced();
    const created = await createOrder(env.DB, {
      cart,
      payment_method: 'paystack',
      delivery_method: 'delivery',
      delivery_name: 'A',
      delivery_email: 'ama@example.com',
      delivery_phone: '+233200000000',
      delivery_address: 'x',
      delivery_city: 'Accra',
      delivery_region: 'Greater Accra',
      delivery_fee: 15,
      now: new Date('2026-04-21T10:00:00Z'),
    });
    const looked = await getOrderForCustomer(env.DB, created.order_number, { email: "ama@example.com" });
    expect(looked).not.toBeNull();
    expect(looked!.id).toBe(created.id);
    expect(looked!.items).toHaveLength(1);
  });

  it('returns null when email does not match', async () => {
    const cart = await priced();
    const created = await createOrder(env.DB, {
      cart,
      payment_method: 'paystack',
      delivery_method: 'delivery',
      delivery_name: 'A',
      delivery_email: 'real@example.com',
      delivery_phone: '+233200000000',
      delivery_address: 'x',
      delivery_city: 'Accra',
      delivery_region: 'Greater Accra',
      delivery_fee: 15,
      now: new Date('2026-04-21T10:00:00Z'),
    });
    const looked = await getOrderForCustomer(env.DB, created.order_number, { email: "other@example.com" });
    expect(looked).toBeNull();
  });

  it('returns null for unknown order number', async () => {
    const looked = await getOrderForCustomer(env.DB, "SK-99999999-9999", { email: "any@example.com" });
    expect(looked).toBeNull();
  });
});

describe('updateOrderProof', () => {
  it('writes proof_url to the order and returns true', async () => {
    const cart = await priced();
    const order = await createOrder(env.DB, {
      cart,
      payment_method: 'manual_transfer',
      delivery_method: 'pickup',
      delivery_name: 'A',
      delivery_email: 'a@example.com',
      delivery_phone: '+233200000000',
      delivery_fee: 0,
      now: new Date('2026-04-21T10:00:00Z'),
    });
    const ok = await updateOrderProof(env.DB, order.id, 'https://example/proof.jpg');
    expect(ok).toBe(true);

    const row = await env.DB.prepare(`SELECT manual_payment_proof_url FROM orders WHERE id = ?`)
      .bind(order.id)
      .first<{ manual_payment_proof_url: string }>();
    expect(row?.manual_payment_proof_url).toBe('https://example/proof.jpg');
  });

  it('returns false for unknown order', async () => {
    const ok = await updateOrderProof(env.DB, 'nope', 'https://example/proof.jpg');
    expect(ok).toBe(false);
  });
});
