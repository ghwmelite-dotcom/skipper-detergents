import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import {
  verifyPaystackSignature,
  initPaystackTransaction,
  markOrderPaidFromWebhook,
} from '../../src/services/paystack';
import { hmacSha512Hex } from '../../src/utils/crypto';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

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
  vi.restoreAllMocks();
});

describe('verifyPaystackSignature', () => {
  it('returns true for a valid signature', async () => {
    const body = JSON.stringify({ event: 'charge.success' });
    const sig = await hmacSha512Hex(body, 'sk_test_123');
    expect(await verifyPaystackSignature(body, sig, 'sk_test_123')).toBe(true);
  });

  it('returns false for a tampered body', async () => {
    const sig = await hmacSha512Hex('original', 'sk_test_123');
    expect(await verifyPaystackSignature('tampered', sig, 'sk_test_123')).toBe(false);
  });

  it('returns false for missing signature', async () => {
    expect(await verifyPaystackSignature('body', '', 'sk_test_123')).toBe(false);
  });
});

describe('initPaystackTransaction', () => {
  it('POSTs to Paystack with pesewas amount and returns access_code + reference', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          data: {
            access_code: 'AC123',
            authorization_url: 'https://checkout.paystack.com/AC123',
            reference: 'ref_abc',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await initPaystackTransaction({
      amountGhs: 105,
      email: 'ama@example.com',
      reference: 'ref_abc',
      callback_url: 'https://storefront.example/order/SK-123',
      secretKey: 'sk_test_123',
      metadata: { order_id: 'o1' },
    });

    expect(result).toEqual({
      access_code: 'AC123',
      authorization_url: 'https://checkout.paystack.com/AC123',
      reference: 'ref_abc',
    });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://api.paystack.co/transaction/initialize');
    expect((init as RequestInit).method).toBe('POST');
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get('Authorization')).toBe('Bearer sk_test_123');
    expect(headers.get('Content-Type')).toBe('application/json');
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload.amount).toBe(10500);
    expect(payload.email).toBe('ama@example.com');
    expect(payload.reference).toBe('ref_abc');
    expect(payload.channels).toEqual(['card', 'mobile_money', 'bank']);
  });

  it('throws when Paystack responds with status:false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: false, message: 'Invalid key' }), { status: 400 }),
    );
    await expect(
      initPaystackTransaction({
        amountGhs: 10,
        email: 'a@example.com',
        reference: 'r',
        callback_url: 'https://cb',
        secretKey: 'sk_bad',
      }),
    ).rejects.toThrow(/Invalid key|Paystack/);
  });
});

describe('markOrderPaidFromWebhook', () => {
  async function seedOrder(payment_status = 'unpaid', reference = 'ref_abc') {
    await env.DB.prepare(
      `INSERT INTO orders (
        id, order_number, payment_method, payment_status, paystack_reference,
        subtotal, bulk_discount, delivery_fee, tax_amount, total_amount,
        delivery_method, delivery_name, delivery_email, delivery_phone
      ) VALUES (
        'o1', 'SK-20260421-0001', 'paystack', ?, ?,
        90, 0, 15, 0, 105,
        'delivery', 'Ama', 'ama@example.com', '+233200000000'
      )`,
    )
      .bind(payment_status, reference)
      .run();
  }

  it('marks unpaid order as paid when amount matches', async () => {
    await seedOrder();
    const result = await markOrderPaidFromWebhook(env.DB, 'ref_abc', 10500);
    expect(result.action).toBe('marked_paid');

    const order = await env.DB.prepare(
      `SELECT payment_status, status FROM orders WHERE id = 'o1'`,
    ).first<{
      payment_status: string;
      status: string;
    }>();
    expect(order?.payment_status).toBe('paid');
    expect(order?.status).toBe('confirmed');
  });

  it('is idempotent: second call on same order returns already_paid', async () => {
    await seedOrder();
    await markOrderPaidFromWebhook(env.DB, 'ref_abc', 10500);
    const result = await markOrderPaidFromWebhook(env.DB, 'ref_abc', 10500);
    expect(result.action).toBe('already_paid');
  });

  it('returns unknown when reference does not match any order', async () => {
    const result = await markOrderPaidFromWebhook(env.DB, 'ref_zzz', 10500);
    expect(result.action).toBe('unknown');
  });

  it('returns amount_mismatch (without paying) when amount is wrong', async () => {
    await seedOrder();
    const result = await markOrderPaidFromWebhook(env.DB, 'ref_abc', 999);
    expect(result.action).toBe('amount_mismatch');
    const order = await env.DB.prepare(`SELECT payment_status FROM orders WHERE id = 'o1'`).first<{
      payment_status: string;
    }>();
    expect(order?.payment_status).toBe('unpaid');
  });
});
