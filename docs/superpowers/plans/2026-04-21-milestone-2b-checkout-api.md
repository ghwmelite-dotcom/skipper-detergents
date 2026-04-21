# Milestone 2b — Checkout + Payments API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship every public **write-side** API endpoint needed to take an order end-to-end — server-validated cart, atomic order creation with day-scoped order numbers and stock decrement, Paystack transaction init + HMAC-SHA-512-verified webhook, R2 upload for manual-transfer payment proofs, and customer order tracking — all deployed live on Cloudflare Workers.

**Architecture:** Same thin-route / fat-service pattern from 2a. All mutations go through `db.batch(...)` for atomicity. Money is stored as GHS REAL in D1 and converted to pesewas (× 100) only at the Paystack boundary. Webhook handler is idempotent: if `payment_status` is already `paid` it no-ops and returns 200 (Paystack retries on non-200). Payment proofs are uploaded through the worker (POST multipart) rather than S3-presigned — simpler, server-validated MIME + size, and the worker itself writes to R2.

**Tech Stack:** Hono 4 on Cloudflare Workers, D1 (with `ON CONFLICT` / `RETURNING`), R2 (direct PUT from worker), KV (rate limiting), Zod, Vitest 2 + `@cloudflare/vitest-pool-workers`.

**Spec references:** §4.3 data decisions (server-side bulk pricing, money units, customer upsert, order number format), §5.1–5.5 (checkout flows), §6 (webhook signature verification, R2 upload rules), §11 Definition of Done items 2–4.

**Deployment state when this milestone starts:**

- Live worker: `https://skipper-api.ghwmelite.workers.dev` (milestone 2a)
- D1 populated with 12 products, 18 bulk tiers, 2 delivery zones, 13 settings (still valid from M1 seed)
- All 11 read endpoints live and green-smoke-tested
- 117 tests passing on CI
- `@skipper/shared` exports (among others): `Order`, `OrderWithItems`, `OrderItem`, `Customer`, `createOrderSchema`, `CreateOrderInput`, `generateOrderNumber`, `resolveBulkPrice`, `PAYMENT_METHODS`, `ORDER_STATUSES`
- `@skipper/api` has `utils/db.ts` (`first`, `all`, `run`), `services/products.ts` (`getProductBySlug`), `services/settings.ts` (`getPublicSettings`), `middleware/rateLimit.ts`
- `tests/setup.ts` auto-applies D1 migrations; `tests/helpers/db-fixtures.ts` available

---

## File Map

**New source files in `packages/api/src/`:**

| File                   | Responsibility                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/crypto.ts`      | `verifyHmacSha512(body, signatureHex, secret)` using `crypto.subtle`                                                                                                  |
| `services/pricing.ts`  | `validateAndPriceCart(db, items)` — looks up products, applies bulk pricing, computes subtotal + discount + line totals; throws on invalid cart                       |
| `services/orders.ts`   | `createOrder(...)`, `generateOrderNumber(db, now)`, `upsertCustomer(db, email, info)`, `updateOrderProof(db, id, url)`, `getOrderForCustomer(db, orderNumber, email)` |
| `services/paystack.ts` | `initPaystackTransaction(opts)` (POST to Paystack), `verifyPaystackSignature(body, sig, secret)`, `markOrderPaidFromWebhook(db, ref, amountPesewas)`                  |
| `services/uploads.ts`  | `storePaymentProof(r2, orderId, contentType, body)` — validates MIME + size, writes to R2, returns public URL                                                         |
| `routes/orders.ts`     | `POST /api/orders`, `PATCH /api/orders/:id/proof`, `GET /api/track/:order_number`                                                                                     |
| `routes/payments.ts`   | `POST /api/payments/paystack/init`, `POST /api/webhooks/paystack`                                                                                                     |
| `routes/upload.ts`     | `POST /api/upload/payment-proof` (multipart)                                                                                                                          |

**Modified files:**

| File                                    | Change                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/api/src/index.ts`             | Mount three new routers; webhook bypasses CORS + rate limit (Paystack origin)     |
| `packages/api/src/types/env.ts`         | Add `PAYSTACK_PUBLIC_KEY` binding (vars) and `R2_PROOFS_PUBLIC_BASE` optional     |
| `packages/api/wrangler.toml`            | Add `PAYSTACK_PUBLIC_KEY` var, `R2_PROOFS_PUBLIC_BASE` var (workers.dev fallback) |
| `packages/shared/src/schemas.ts`        | Add `orderTrackingQuerySchema`, `uploadProofProofUrlSchema`                       |
| `packages/shared/tests/schemas.test.ts` | Tests for both new schemas                                                        |

**New test files:**

| File                                           | Scope                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/api/tests/utils/crypto.test.ts`      | HMAC-SHA-512 verification                                                           |
| `packages/api/tests/services/pricing.test.ts`  | Cart validation + bulk resolution                                                   |
| `packages/api/tests/services/orders.test.ts`   | Order creation, number gen, customer upsert, tracking lookup                        |
| `packages/api/tests/services/paystack.test.ts` | Signature verify + `markOrderPaidFromWebhook` idempotency (init mocked via `fetch`) |
| `packages/api/tests/services/uploads.test.ts`  | MIME + size enforcement + R2 write                                                  |
| `packages/api/tests/routes/orders.test.ts`     | Integration: POST + PATCH + GET track                                               |
| `packages/api/tests/routes/payments.test.ts`   | Integration: init + webhook (signed + unsigned)                                     |
| `packages/api/tests/routes/upload.test.ts`     | Integration: multipart + MIME reject + size reject                                  |

---

## Shared Principles

1. **Atomic writes via `db.batch([...])`.** Any operation touching multiple rows (create order + items + stock decrement) goes into a single batch.
2. **Money in GHS** everywhere in D1; convert to pesewas (× 100, rounded to integer) **only** in `services/paystack.ts`.
3. **Webhook always returns 200** unless the signature is invalid (401). Never return 500 even on internal errors — Paystack will retry forever.
4. **Idempotency keys:** Paystack webhook → `paystack_reference`. If the order is already `payment_status='paid'`, skip and 200.
5. **Stock decrement guard:** `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?`. Require `meta.changes === 1` per item; if any fails, the whole batch fails and we return 409.
6. **Customer upsert by email.** Insert new or keep the existing row; never overwrite non-null fields with null.
7. **Raw body for webhook signature.** Paystack signs the exact bytes; read with `await c.req.text()` before parsing JSON.
8. **MIME + size allowlists** enforced server-side in `services/uploads.ts`, regardless of client claims.

---

## Task 1: HMAC-SHA-512 utility

**Files:**

- Create: `packages/api/src/utils/crypto.ts`
- Create: `packages/api/tests/utils/crypto.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/utils/crypto.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { verifyHmacSha512, hmacSha512Hex } from '../../src/utils/crypto';

describe('hmacSha512Hex', () => {
  it('produces a 128-char lowercase hex digest', async () => {
    const digest = await hmacSha512Hex('hello', 'key');
    expect(digest).toMatch(/^[0-9a-f]{128}$/);
  });

  it('matches a known-answer vector', async () => {
    // Generated via: echo -n "The quick brown fox" | openssl dgst -sha512 -hmac "secret"
    const digest = await hmacSha512Hex('The quick brown fox', 'secret');
    expect(digest).toBe(
      '6a9f63e3307a541b99fb45ea73f415d9e93e5048c32d14400f7a4b9b7f81eae84e78fd9935b19ec04807eb4feba53a65af1b2cf32f5628ccdc27c88c94f22a2a',
    );
  });

  it('differs for different keys', async () => {
    const a = await hmacSha512Hex('body', 'k1');
    const b = await hmacSha512Hex('body', 'k2');
    expect(a).not.toBe(b);
  });
});

describe('verifyHmacSha512', () => {
  it('returns true for matching signature', async () => {
    const sig = await hmacSha512Hex('payload', 'secret');
    expect(await verifyHmacSha512('payload', sig, 'secret')).toBe(true);
  });

  it('returns false for tampered body', async () => {
    const sig = await hmacSha512Hex('payload', 'secret');
    expect(await verifyHmacSha512('payload_tampered', sig, 'secret')).toBe(false);
  });

  it('returns false for wrong signature', async () => {
    expect(await verifyHmacSha512('payload', 'deadbeef', 'secret')).toBe(false);
  });

  it('returns false for wrong secret', async () => {
    const sig = await hmacSha512Hex('payload', 'secret1');
    expect(await verifyHmacSha512('payload', sig, 'secret2')).toBe(false);
  });

  it('is case-insensitive on the signature hex', async () => {
    const sig = await hmacSha512Hex('payload', 'secret');
    expect(await verifyHmacSha512('payload', sig.toUpperCase(), 'secret')).toBe(true);
  });
});
```

- [ ] **Step 2: Run and see it FAIL**

Run: `pnpm --filter @skipper/api test tests/utils/crypto.test.ts` (Linux CI). Expected: "Cannot find module '../../src/utils/crypto'".

- [ ] **Step 3: Implement `packages/api/src/utils/crypto.ts`**

```typescript
const encoder = new TextEncoder();

export async function hmacSha512Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyHmacSha512(
  message: string,
  signatureHex: string,
  secret: string,
): Promise<boolean> {
  if (!signatureHex || !/^[0-9a-fA-F]+$/.test(signatureHex)) return false;
  const expected = await hmacSha512Hex(message, secret);
  const a = expected.toLowerCase();
  const b = signatureHex.toLowerCase();
  if (a.length !== b.length) return false;
  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
```

- [ ] **Step 4: Run and see all 8 pass**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/utils/crypto.ts packages/api/tests/utils/crypto.test.ts
git commit -m "feat(api): add HMAC-SHA-512 verify helper for Paystack webhooks"
```

---

## Task 2: Tracking + upload Zod schemas (shared)

**Files:**

- Modify: `packages/shared/src/schemas.ts` (append at end)
- Modify: `packages/shared/tests/schemas.test.ts` (append at end)

- [ ] **Step 1: Append failing tests to `packages/shared/tests/schemas.test.ts`**

Add `orderTrackingQuerySchema, uploadProofUrlSchema` to the existing `import` line from `../src/schemas`, then append:

```typescript
describe('orderTrackingQuerySchema', () => {
  it('accepts a valid tracking request', () => {
    expect(() => orderTrackingQuerySchema.parse({ email: 'ama@example.com' })).not.toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => orderTrackingQuerySchema.parse({ email: 'not-email' })).toThrow();
  });

  it('requires email', () => {
    expect(() => orderTrackingQuerySchema.parse({})).toThrow();
  });

  it('lowercases the email', () => {
    const parsed = orderTrackingQuerySchema.parse({ email: 'Ama@EXAMPLE.com' });
    expect(parsed.email).toBe('ama@example.com');
  });
});

describe('uploadProofUrlSchema', () => {
  it('accepts a valid https url', () => {
    expect(() =>
      uploadProofUrlSchema.parse({ proof_url: 'https://proofs.example/abc.jpg' }),
    ).not.toThrow();
  });

  it('rejects non-url strings', () => {
    expect(() => uploadProofUrlSchema.parse({ proof_url: 'not a url' })).toThrow();
  });

  it('rejects http (http-only not allowed)', () => {
    expect(() =>
      uploadProofUrlSchema.parse({ proof_url: 'http://proofs.example/abc.jpg' }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run shared tests and see the new blocks FAIL**

Run: `pnpm --filter @skipper/shared test` — the two new schemas are undefined.

- [ ] **Step 3: Append to `packages/shared/src/schemas.ts`**

```typescript
export const orderTrackingQuerySchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
});
export type OrderTrackingQuery = z.infer<typeof orderTrackingQuerySchema>;

export const uploadProofUrlSchema = z.object({
  proof_url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), {
      message: 'proof_url must use https',
    }),
});
export type UploadProofUrl = z.infer<typeof uploadProofUrlSchema>;
```

- [ ] **Step 4: Run and see all pass**

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas.ts packages/shared/tests/schemas.test.ts
git commit -m "feat(shared): add order tracking query + proof URL schemas"
```

---

## Task 3: Pricing service — validate and price cart

**Files:**

- Create: `packages/api/src/services/pricing.ts`
- Create: `packages/api/tests/services/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/services/pricing.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { HTTPException } from 'hono/http-exception';
import { validateAndPriceCart } from '../../src/services/pricing';
import { resetDatabase, seedCategories, seedProducts, seedBulkTiers } from '../helpers/db-fixtures';

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
      stock_quantity: 100,
      is_bulk_available: 1,
    },
    {
      id: 'p2',
      name: 'Tissue',
      slug: 'p2',
      description: 'x',
      category_id: 'c1',
      brand: 'Premier',
      unit_price: 12,
      stock_quantity: 50,
    },
    {
      id: 'p3',
      name: 'Out of stock',
      slug: 'p3',
      description: 'x',
      category_id: 'c1',
      brand: 'X',
      unit_price: 10,
      stock_quantity: 0,
    },
    {
      id: 'p4',
      name: 'Inactive',
      slug: 'p4',
      description: 'x',
      category_id: 'c1',
      brand: 'X',
      unit_price: 5,
      stock_quantity: 100,
      is_active: 0,
    },
  ]);
  await seedBulkTiers(env.DB, [
    { id: 'b1', product_id: 'p1', min_quantity: 10, max_quantity: 49, unit_price: 38 },
    { id: 'b2', product_id: 'p1', min_quantity: 50, max_quantity: null, unit_price: 33 },
  ]);
});

describe('validateAndPriceCart', () => {
  it('prices a single non-bulk item at unit_price', async () => {
    const result = await validateAndPriceCart(env.DB, [{ product_id: 'p2', quantity: 3 }]);
    expect(result.subtotal).toBe(36);
    expect(result.bulk_discount).toBe(0);
    expect(result.line_items).toHaveLength(1);
    expect(result.line_items[0]).toMatchObject({
      product_id: 'p2',
      quantity: 3,
      unit_price: 12,
      line_total: 36,
      is_bulk_order: 0,
      bulk_tier_id: null,
    });
  });

  it('applies bulk pricing when quantity hits a tier', async () => {
    const result = await validateAndPriceCart(env.DB, [{ product_id: 'p1', quantity: 20 }]);
    // base: 20 * 45 = 900; bulk: 20 * 38 = 760; discount = 140
    expect(result.subtotal).toBe(760);
    expect(result.bulk_discount).toBe(140);
    expect(result.line_items[0]).toMatchObject({
      unit_price: 38,
      is_bulk_order: 1,
      bulk_tier_id: 'b1',
    });
  });

  it('uses the unbounded tier for quantities above all max_quantity', async () => {
    const result = await validateAndPriceCart(env.DB, [{ product_id: 'p1', quantity: 60 }]);
    expect(result.line_items[0]?.unit_price).toBe(33);
    expect(result.line_items[0]?.bulk_tier_id).toBe('b2');
  });

  it('sums across multiple items', async () => {
    const result = await validateAndPriceCart(env.DB, [
      { product_id: 'p1', quantity: 2 },
      { product_id: 'p2', quantity: 5 },
    ]);
    // p1: 2*45 = 90 (below tier); p2: 5*12 = 60
    expect(result.subtotal).toBe(150);
    expect(result.line_items).toHaveLength(2);
  });

  it('throws when product does not exist', async () => {
    await expect(
      validateAndPriceCart(env.DB, [{ product_id: 'nope', quantity: 1 }]),
    ).rejects.toThrow(HTTPException);
  });

  it('throws when product is inactive', async () => {
    await expect(validateAndPriceCart(env.DB, [{ product_id: 'p4', quantity: 1 }])).rejects.toThrow(
      HTTPException,
    );
  });

  it('throws when stock is insufficient', async () => {
    await expect(validateAndPriceCart(env.DB, [{ product_id: 'p3', quantity: 1 }])).rejects.toThrow(
      HTTPException,
    );
    await expect(
      validateAndPriceCart(env.DB, [{ product_id: 'p2', quantity: 999 }]),
    ).rejects.toThrow(HTTPException);
  });

  it('throws when items is empty', async () => {
    await expect(validateAndPriceCart(env.DB, [])).rejects.toThrow(HTTPException);
  });
});
```

- [ ] **Step 2: Run and see FAIL** (module not found).

- [ ] **Step 3: Implement `packages/api/src/services/pricing.ts`**

```typescript
import type { BulkPricingTier, CartItemInput, Product } from '@skipper/shared';
import { resolveBulkPrice } from '@skipper/shared';
import { HTTPException } from 'hono/http-exception';
import { all, first } from '../utils/db';

export interface PricedLineItem {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  is_bulk_order: 0 | 1;
  bulk_tier_id: string | null;
  line_total: number;
}

export interface PricedCart {
  line_items: PricedLineItem[];
  subtotal: number;
  bulk_discount: number;
}

export async function validateAndPriceCart(
  db: D1Database,
  items: CartItemInput[],
): Promise<PricedCart> {
  if (items.length === 0) {
    throw new HTTPException(400, { message: 'Cart is empty' });
  }

  const line_items: PricedLineItem[] = [];
  let subtotal = 0;
  let bulk_discount = 0;

  for (const item of items) {
    const product = await first<Product>(
      db,
      `SELECT * FROM products WHERE id = ? AND is_active = 1`,
      [item.product_id],
    );
    if (!product) {
      throw new HTTPException(400, {
        message: `Product ${item.product_id} is not available`,
      });
    }
    if (product.stock_quantity < item.quantity) {
      throw new HTTPException(400, {
        message: `Only ${product.stock_quantity} of ${product.name} in stock`,
      });
    }

    const tiers = await all<BulkPricingTier>(
      db,
      `SELECT * FROM bulk_pricing_tiers WHERE product_id = ? ORDER BY min_quantity ASC`,
      [product.id],
    );
    const resolved = resolveBulkPrice(item.quantity, product.unit_price, tiers);
    const unit_price = resolved.unit_price;
    const line_total = unit_price * item.quantity;
    const base_total = product.unit_price * item.quantity;

    line_items.push({
      product_id: product.id,
      variant_id: item.variant_id ?? null,
      product_name: product.name,
      variant_name: null,
      sku: product.sku,
      quantity: item.quantity,
      unit_price,
      is_bulk_order: resolved.tier ? 1 : 0,
      bulk_tier_id: resolved.tier?.id ?? null,
      line_total,
    });
    subtotal += line_total;
    bulk_discount += base_total - line_total;
  }

  return { line_items, subtotal, bulk_discount };
}
```

- [ ] **Step 4: Run and see all 8 pass**.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/pricing.ts packages/api/tests/services/pricing.test.ts
git commit -m "feat(api): add pricing service (cart validation + bulk resolution)"
```

---

## Task 4: Orders service — create, number, customer upsert, track

**Files:**

- Create: `packages/api/src/services/orders.ts`
- Create: `packages/api/tests/services/orders.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/services/orders.test.ts`:

```typescript
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
    // Drain stock to 1
    await env.DB.prepare(`UPDATE products SET stock_quantity = 1 WHERE id = ?`).bind('p1').run();
    const cart = await priced();
    await expect(
      createOrder(env.DB, {
        cart,
        payment_method: 'paystack',
        delivery_method: 'delivery',
        delivery_name: 'A',
        delivery_email: 'a@example.com',
        delivery_phone: '+233',
        delivery_address: 'x',
        delivery_city: 'Accra',
        delivery_region: 'Greater Accra',
        delivery_fee: 15,
        now: new Date('2026-04-21T10:00:00Z'),
      }),
    ).rejects.toThrow();
    // Stock should still be 1 — no partial update
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
      delivery_phone: '+233',
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
      delivery_phone: '+233',
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
      delivery_phone: '+233',
      delivery_address: 'x',
      delivery_city: 'Accra',
      delivery_region: 'Greater Accra',
      delivery_fee: 15,
      now: new Date('2026-04-21T10:00:00Z'),
    });

    const looked = await getOrderForCustomer(env.DB, created.order_number, 'AMA@EXAMPLE.COM');
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
      delivery_phone: '+233',
      delivery_address: 'x',
      delivery_city: 'Accra',
      delivery_region: 'Greater Accra',
      delivery_fee: 15,
      now: new Date('2026-04-21T10:00:00Z'),
    });
    const looked = await getOrderForCustomer(env.DB, created.order_number, 'other@example.com');
    expect(looked).toBeNull();
  });

  it('returns null for unknown order number', async () => {
    const looked = await getOrderForCustomer(env.DB, 'SK-99999999-9999', 'any@example.com');
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
      delivery_phone: '+233',
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
```

- [ ] **Step 2: Run and see FAIL** (module not found).

- [ ] **Step 3: Implement `packages/api/src/services/orders.ts`**

```typescript
import type {
  Order,
  OrderItem,
  OrderWithItems,
  PaymentMethod,
  DeliveryMethod,
} from '@skipper/shared';
import { generateOrderNumber } from '@skipper/shared';
import { HTTPException } from 'hono/http-exception';
import { first, all } from '../utils/db';
import type { PricedCart } from './pricing';

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function dayKey(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export async function nextOrderNumber(db: D1Database, now: Date): Promise<string> {
  const day = dayKey(now);
  const results = await db.batch([
    db
      .prepare(`INSERT OR IGNORE INTO order_number_sequence (day, next_seq) VALUES (?, 1)`)
      .bind(day),
    db
      .prepare(
        `UPDATE order_number_sequence SET next_seq = next_seq + 1 WHERE day = ? RETURNING next_seq - 1 AS seq`,
      )
      .bind(day),
  ]);
  const seqRow = results[1]?.results?.[0] as { seq: number } | undefined;
  const seq = seqRow?.seq ?? 1;
  return generateOrderNumber(now, seq);
}

export interface CreateOrderInput {
  cart: PricedCart;
  payment_method: PaymentMethod;
  delivery_method: DeliveryMethod;
  delivery_name: string;
  delivery_email: string;
  delivery_phone: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_region?: string;
  delivery_gps?: string;
  delivery_notes?: string;
  delivery_fee: number;
  now: Date;
  ip_address?: string;
  user_agent?: string;
}

async function upsertCustomerId(
  db: D1Database,
  email: string,
  name: string,
  phone: string,
): Promise<string> {
  const existing = await first<{ id: string }>(db, `SELECT id FROM customers WHERE email = ?`, [
    email,
  ]);
  if (existing) return existing.id;
  const id = idHex();
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');
  await db
    .prepare(
      `INSERT INTO customers (id, email, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, email, firstName ?? name, lastName || null, phone)
    .run();
  return id;
}

export async function createOrder(db: D1Database, input: CreateOrderInput): Promise<Order> {
  const email = input.delivery_email.toLowerCase();
  const customer_id = await upsertCustomerId(db, email, input.delivery_name, input.delivery_phone);

  const order_number = await nextOrderNumber(db, input.now);
  const order_id = idHex();

  const total_amount = input.cart.subtotal + input.delivery_fee;

  const statements: D1PreparedStatement[] = [];

  statements.push(
    db
      .prepare(
        `INSERT INTO orders (
          id, order_number, customer_id, status, payment_method, payment_status,
          subtotal, bulk_discount, delivery_fee, tax_amount, total_amount,
          delivery_method, delivery_name, delivery_email, delivery_phone,
          delivery_address, delivery_city, delivery_region, delivery_gps, delivery_notes,
          ip_address, user_agent
        ) VALUES (?, ?, ?, 'pending', ?, 'unpaid', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        order_id,
        order_number,
        customer_id,
        input.payment_method,
        input.cart.subtotal,
        input.cart.bulk_discount,
        input.delivery_fee,
        total_amount,
        input.delivery_method,
        input.delivery_name,
        email,
        input.delivery_phone,
        input.delivery_address ?? null,
        input.delivery_city ?? null,
        input.delivery_region ?? null,
        input.delivery_gps ?? null,
        input.delivery_notes ?? null,
        input.ip_address ?? null,
        input.user_agent ?? null,
      ),
  );

  for (const li of input.cart.line_items) {
    statements.push(
      db
        .prepare(
          `INSERT INTO order_items (
            id, order_id, product_id, variant_id, product_name, variant_name, sku,
            quantity, unit_price, is_bulk_order, bulk_tier_id, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          idHex(),
          order_id,
          li.product_id,
          li.variant_id,
          li.product_name,
          li.variant_name,
          li.sku,
          li.quantity,
          li.unit_price,
          li.is_bulk_order,
          li.bulk_tier_id,
          li.line_total,
        ),
    );
    statements.push(
      db
        .prepare(
          `UPDATE products SET stock_quantity = stock_quantity - ?, total_sold = total_sold + ?
           WHERE id = ? AND stock_quantity >= ?`,
        )
        .bind(li.quantity, li.quantity, li.product_id, li.quantity),
    );
  }

  const results = await db.batch(statements);

  // Every statement should have succeeded; stock updates must have changes=1.
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.success) {
      throw new HTTPException(409, { message: 'Failed to place order' });
    }
  }
  // Verify all stock updates actually decremented (changes=1 each).
  for (let i = 0; i < input.cart.line_items.length; i++) {
    const stockUpdateIdx = 1 + i * 2 + 1; // order + (item + stock)*i + stock
    const r = results[stockUpdateIdx];
    if ((r?.meta?.changes ?? 0) !== 1) {
      throw new HTTPException(409, { message: 'Insufficient stock' });
    }
  }

  const order = await first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [order_id]);
  if (!order) {
    throw new HTTPException(500, { message: 'Order vanished after insert' });
  }
  return order;
}

export async function getOrderForCustomer(
  db: D1Database,
  orderNumber: string,
  email: string,
): Promise<OrderWithItems | null> {
  const order = await first<Order>(
    db,
    `SELECT * FROM orders WHERE order_number = ? AND LOWER(delivery_email) = LOWER(?)`,
    [orderNumber, email],
  );
  if (!order) return null;
  const items = await all<OrderItem>(
    db,
    `SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC`,
    [order.id],
  );
  return { ...order, items };
}

export async function updateOrderProof(
  db: D1Database,
  orderId: string,
  proofUrl: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE orders SET manual_payment_proof_url = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(proofUrl, orderId)
    .run();
  return (result.meta?.changes ?? 0) === 1;
}
```

- [ ] **Step 4: Run and see all pass**.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/orders.ts packages/api/tests/services/orders.test.ts
git commit -m "feat(api): add orders service (atomic create, number gen, tracking, proof)"
```

---

## Task 5: Paystack service — init + signature verify + markOrderPaid

**Files:**

- Create: `packages/api/src/services/paystack.ts`
- Create: `packages/api/tests/services/paystack.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/services/paystack.test.ts`:

```typescript
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
    expect(payload.amount).toBe(10500); // 105 GHS → 10_500 pesewas
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
        'delivery', 'Ama', 'ama@example.com', '+233'
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
```

- [ ] **Step 2: Run and see FAIL** (module not found).

- [ ] **Step 3: Implement `packages/api/src/services/paystack.ts`**

```typescript
import { first, run } from '../utils/db';
import { verifyHmacSha512 } from '../utils/crypto';

const PAYSTACK_BASE = 'https://api.paystack.co';

export async function verifyPaystackSignature(
  rawBody: string,
  signatureHex: string,
  secretKey: string,
): Promise<boolean> {
  if (!signatureHex) return false;
  return verifyHmacSha512(rawBody, signatureHex, secretKey);
}

export interface InitPaystackOptions {
  amountGhs: number;
  email: string;
  reference: string;
  callback_url: string;
  secretKey: string;
  metadata?: Record<string, unknown>;
}

export interface InitPaystackResult {
  access_code: string;
  authorization_url: string;
  reference: string;
}

export async function initPaystackTransaction(
  opts: InitPaystackOptions,
): Promise<InitPaystackResult> {
  const body = {
    amount: Math.round(opts.amountGhs * 100),
    email: opts.email,
    reference: opts.reference,
    callback_url: opts.callback_url,
    channels: ['card', 'mobile_money', 'bank'] as const,
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  };
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: InitPaystackResult;
  };
  if (!payload.status || !payload.data) {
    throw new Error(`Paystack init failed: ${payload.message ?? 'unknown'}`);
  }
  return payload.data;
}

export type MarkPaidAction = 'marked_paid' | 'already_paid' | 'unknown' | 'amount_mismatch';

export async function markOrderPaidFromWebhook(
  db: D1Database,
  paystackReference: string,
  amountPesewas: number,
): Promise<{ action: MarkPaidAction }> {
  const order = await first<{ id: string; payment_status: string; total_amount: number }>(
    db,
    `SELECT id, payment_status, total_amount FROM orders WHERE paystack_reference = ?`,
    [paystackReference],
  );
  if (!order) return { action: 'unknown' };
  if (order.payment_status === 'paid') return { action: 'already_paid' };

  const expectedPesewas = Math.round(order.total_amount * 100);
  if (expectedPesewas !== amountPesewas) return { action: 'amount_mismatch' };

  await run(
    db,
    `UPDATE orders SET payment_status = 'paid', status = 'confirmed', updated_at = datetime('now') WHERE id = ?`,
    [order.id],
  );
  return { action: 'marked_paid' };
}
```

- [ ] **Step 4: Run and see all pass**.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/paystack.ts packages/api/tests/services/paystack.test.ts
git commit -m "feat(api): add paystack service (init, signature verify, idempotent mark-paid)"
```

---

## Task 6: Uploads service — R2 write with MIME + size guards

**Files:**

- Create: `packages/api/src/services/uploads.ts`
- Create: `packages/api/tests/services/uploads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/services/uploads.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { HTTPException } from 'hono/http-exception';
import { storePaymentProof } from '../../src/services/uploads';

beforeEach(async () => {
  // Drain the bucket between tests
  const list = await env.R2_PROOFS.list();
  for (const obj of list.objects) {
    await env.R2_PROOFS.delete(obj.key);
  }
});

describe('storePaymentProof', () => {
  it('stores an image/jpeg under payment-proofs/{order_id}/{uuid}.jpg and returns key + url', async () => {
    const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
    const result = await storePaymentProof(env.R2_PROOFS, {
      orderId: 'o1',
      contentType: 'image/jpeg',
      bodyBytes: body,
      sizeBytes: body.byteLength,
      publicBase: 'https://proofs.example',
    });
    expect(result.key.startsWith('payment-proofs/o1/')).toBe(true);
    expect(result.key.endsWith('.jpg')).toBe(true);
    expect(result.url).toBe(`https://proofs.example/${result.key}`);

    const stored = await env.R2_PROOFS.get(result.key);
    expect(stored).not.toBeNull();
  });

  it('rejects unknown MIME types', async () => {
    await expect(
      storePaymentProof(env.R2_PROOFS, {
        orderId: 'o1',
        contentType: 'application/pdf',
        bodyBytes: new Uint8Array([1, 2]),
        sizeBytes: 2,
        publicBase: 'https://proofs.example',
      }),
    ).rejects.toThrow(HTTPException);
  });

  it('rejects files over 3 MB', async () => {
    await expect(
      storePaymentProof(env.R2_PROOFS, {
        orderId: 'o1',
        contentType: 'image/jpeg',
        bodyBytes: new Uint8Array([1, 2]),
        sizeBytes: 4 * 1024 * 1024,
        publicBase: 'https://proofs.example',
      }),
    ).rejects.toThrow(HTTPException);
  });

  it('picks the right extension per MIME', async () => {
    const png = await storePaymentProof(env.R2_PROOFS, {
      orderId: 'o1',
      contentType: 'image/png',
      bodyBytes: new Uint8Array([1]),
      sizeBytes: 1,
      publicBase: 'https://proofs.example',
    });
    expect(png.key.endsWith('.png')).toBe(true);

    const webp = await storePaymentProof(env.R2_PROOFS, {
      orderId: 'o1',
      contentType: 'image/webp',
      bodyBytes: new Uint8Array([1]),
      sizeBytes: 1,
      publicBase: 'https://proofs.example',
    });
    expect(webp.key.endsWith('.webp')).toBe(true);
  });
});
```

- [ ] **Step 2: Run and see FAIL**.

- [ ] **Step 3: Implement `packages/api/src/services/uploads.ts`**

```typescript
import { HTTPException } from 'hono/http-exception';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_PROOF_BYTES = 3 * 1024 * 1024;

export interface StoreProofInput {
  orderId: string;
  contentType: string;
  bodyBytes: Uint8Array | ArrayBuffer;
  sizeBytes: number;
  publicBase: string;
}

export interface StoreProofResult {
  key: string;
  url: string;
}

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function storePaymentProof(
  bucket: R2Bucket,
  input: StoreProofInput,
): Promise<StoreProofResult> {
  const ext = MIME_EXT[input.contentType];
  if (!ext) {
    throw new HTTPException(415, {
      message: 'Only image/jpeg, image/png, and image/webp are allowed',
    });
  }
  if (input.sizeBytes > MAX_PROOF_BYTES) {
    throw new HTTPException(413, { message: 'File exceeds 3 MB limit' });
  }

  const key = `payment-proofs/${input.orderId}/${idHex()}.${ext}`;
  await bucket.put(key, input.bodyBytes, {
    httpMetadata: { contentType: input.contentType },
  });

  return {
    key,
    url: `${input.publicBase.replace(/\/$/, '')}/${key}`,
  };
}
```

- [ ] **Step 4: Run and see all pass**.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/uploads.ts packages/api/tests/services/uploads.test.ts
git commit -m "feat(api): add uploads service (payment-proof R2 write with MIME/size guards)"
```

---

## Task 7: Orders routes

**Files:**

- Create: `packages/api/src/routes/orders.ts`
- Create: `packages/api/tests/routes/orders.test.ts`
- Modify: `packages/api/src/index.ts`

`POST /api/orders` is the single entry point. It:

1. Zod-validates via `createOrderSchema`
2. Re-prices the cart server-side
3. Resolves delivery fee from `store_settings` (Accra vs Other, or 0 for pickup)
4. Calls `createOrder`
5. Returns `{ order, next }` where `next.action` is `paystack_init` or `upload_proof` and `next.manual_payment_details` is included for manual transfers

- [ ] **Step 1: Failing test** — create `packages/api/tests/routes/orders.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase, seedCategories, seedProducts, seedSetting } from '../helpers/db-fixtures';

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
  await seedSetting(env.DB, 'manual_payment_details', 'MTN MoMo: 024 000 0000 / GCB: 1234567890');
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
    expect(body.data.order.total_amount).toBe(105); // 90 + 15 Accra
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
    const body = await res.json<{
      data: { order: { delivery_fee: number; total_amount: number } };
    }>();
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
```

- [ ] **Step 2: Run and see FAIL**.

- [ ] **Step 3: Implement `packages/api/src/routes/orders.ts`**

```typescript
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

  const order = await createOrder(c.env.DB, {
    cart,
    payment_method: body.payment_method,
    delivery_method: body.delivery_method,
    delivery_name: body.delivery_name,
    delivery_email: body.delivery_email,
    delivery_phone: body.delivery_phone,
    delivery_address: body.delivery_address,
    delivery_city: body.delivery_city,
    delivery_region: body.delivery_region,
    delivery_gps: body.delivery_gps,
    delivery_notes: body.delivery_notes,
    delivery_fee,
    now: new Date(),
    ip_address: ip,
    user_agent: ua,
  });

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
  const ok_ = await updateOrderProof(c.env.DB, id, body.proof_url);
  if (!ok_) {
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
```

- [ ] **Step 4: Wire into `packages/api/src/index.ts`**

Add these imports with the others:

```typescript
import { ordersRouter, trackRouter } from './routes/orders';
```

Add these `app.route(...)` lines after existing route mounts:

```typescript
app.route('/api/orders', ordersRouter);
app.route('/api/track', trackRouter);
```

- [ ] **Step 5: Run and see all pass**.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/orders.ts packages/api/src/index.ts packages/api/tests/routes/orders.test.ts
git commit -m "feat(api): wire /api/orders POST/PATCH and /api/track GET"
```

---

## Task 8: Payments routes — init + webhook

**Files:**

- Create: `packages/api/src/routes/payments.ts`
- Create: `packages/api/tests/routes/payments.test.ts`
- Modify: `packages/api/src/index.ts`

The webhook MUST skip rate limiting (Paystack origin). Mount it OUTSIDE `/api/*` under `/webhooks/paystack`, OR mount the rate limit to a different prefix. We mount the webhook at `/webhooks/paystack` (top-level) so the `/api/*` rate limit doesn't apply.

- [ ] **Step 1: Failing test** — create `packages/api/tests/routes/payments.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { hmacSha512Hex } from '../../src/utils/crypto';
import { resetDatabase, seedCategories, seedProducts, seedSetting } from '../helpers/db-fixtures';

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
    // Set the reference on the order so markOrderPaidFromWebhook can find it
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
```

- [ ] **Step 2: Run and see FAIL**.

- [ ] **Step 3: Implement `packages/api/src/routes/payments.ts`**

```typescript
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

// Webhook lives outside /api/* so it's not rate-limited.
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
    // Paystack will retry; return 200 anyway per their docs? No — 400 is fine for malformed.
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
  return c.json(ok({ received: true, handled: true, action: result.action }));
});
```

- [ ] **Step 4: Wire into `packages/api/src/index.ts`**

Add imports:

```typescript
import { paymentsRouter, webhooksRouter } from './routes/payments';
```

Add mounts — the webhook MUST be mounted OUTSIDE `/api/*` so it bypasses rate limiting:

```typescript
app.route('/api/payments', paymentsRouter);
app.route('/webhooks', webhooksRouter);
```

- [ ] **Step 5: Run and see all pass**.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/payments.ts packages/api/src/index.ts packages/api/tests/routes/payments.test.ts
git commit -m "feat(api): wire /api/payments/paystack/init and /webhooks/paystack"
```

---

## Task 9: Upload route — multipart payment proof

**Files:**

- Create: `packages/api/src/routes/upload.ts`
- Create: `packages/api/tests/routes/upload.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Failing test** — create `packages/api/tests/routes/upload.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  const list = await env.R2_PROOFS.list();
  for (const obj of list.objects) {
    await env.R2_PROOFS.delete(obj.key);
  }
});

describe('POST /api/upload/payment-proof', () => {
  it('stores a valid image and returns { url, key }', async () => {
    const form = new FormData();
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' });
    form.append('file', blob, 'proof.jpg');
    form.append('order_id', 'o1');

    const res = await app.request('/api/upload/payment-proof', { method: 'POST', body: form }, env);
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { url: string; key: string } }>();
    expect(body.data.key.startsWith('payment-proofs/o1/')).toBe(true);
    expect(body.data.url).toContain('payment-proofs/o1/');
  });

  it('rejects missing order_id', async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1])], { type: 'image/jpeg' }), 'x.jpg');
    const res = await app.request('/api/upload/payment-proof', { method: 'POST', body: form }, env);
    expect(res.status).toBe(400);
  });

  it('rejects missing file', async () => {
    const form = new FormData();
    form.append('order_id', 'o1');
    const res = await app.request('/api/upload/payment-proof', { method: 'POST', body: form }, env);
    expect(res.status).toBe(400);
  });

  it('rejects non-image MIME with 415', async () => {
    const form = new FormData();
    form.append('file', new Blob(['%PDF'], { type: 'application/pdf' }), 'x.pdf');
    form.append('order_id', 'o1');
    const res = await app.request('/api/upload/payment-proof', { method: 'POST', body: form }, env);
    expect(res.status).toBe(415);
  });
});
```

- [ ] **Step 2: Run and see FAIL**.

- [ ] **Step 3: Implement `packages/api/src/routes/upload.ts`**

```typescript
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { storePaymentProof } from '../services/uploads';

export const uploadRouter = new Hono<{ Bindings: Env }>();

uploadRouter.post('/payment-proof', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const orderId = form.get('order_id');

  if (typeof orderId !== 'string' || !orderId) {
    return c.json(fail('BAD_REQUEST', 'order_id is required'), 400);
  }
  if (!(file instanceof File)) {
    return c.json(fail('BAD_REQUEST', 'file is required'), 400);
  }

  const publicBase =
    c.env.R2_PROOFS_PUBLIC_BASE ?? `${new URL(c.req.url).origin}/r2/payment-proofs`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await storePaymentProof(c.env.R2_PROOFS, {
    orderId,
    contentType: file.type,
    bodyBytes: bytes,
    sizeBytes: bytes.byteLength,
    publicBase,
  });
  return c.json(ok(result));
});
```

- [ ] **Step 4: Update `packages/api/src/types/env.ts`**

Add `R2_PROOFS_PUBLIC_BASE?: string;` to the `Env` interface:

```typescript
export interface Env {
  DB: D1Database;
  R2_PRODUCTS: R2Bucket;
  R2_PROOFS: R2Bucket;
  KV_SESSIONS: KVNamespace;
  KV_RATE_LIMIT: KVNamespace;
  KV_CACHE: KVNamespace;
  APP_ENV: string;
  STOREFRONT_ORIGIN: string;
  ADMIN_ORIGIN: string;
  JWT_SECRET?: string;
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_WEBHOOK_SECRET?: string;
  R2_PROOFS_PUBLIC_BASE?: string;
}
```

- [ ] **Step 5: Wire into `packages/api/src/index.ts`**

```typescript
import { uploadRouter } from './routes/upload';
// ...
app.route('/api/upload', uploadRouter);
```

- [ ] **Step 6: Run and see all pass**.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routes/upload.ts packages/api/src/types/env.ts packages/api/src/index.ts packages/api/tests/routes/upload.test.ts
git commit -m "feat(api): wire /api/upload/payment-proof multipart route"
```

---

## Task 10: Deploy, set secrets, extend smoke test

**Files:**

- Modify: `scripts/smoke-test.sh`

- [ ] **Step 1: Deploy**

Run:

```bash
pnpm --filter @skipper/api exec wrangler deploy
```

Expected: ends with `https://skipper-api.ghwmelite.workers.dev` and a new Version ID.

- [ ] **Step 2: Set Paystack test secrets on the deployed worker**

These are for real Paystack integration testing later; for now we set placeholder values so the worker doesn't throw on missing env vars. When you have real test keys from Paystack's dashboard, repeat these commands with the real values.

Run:

```bash
echo "pk_test_placeholder_replace_with_real" | pnpm --filter @skipper/api exec wrangler secret put PAYSTACK_PUBLIC_KEY
echo "sk_test_placeholder_replace_with_real" | pnpm --filter @skipper/api exec wrangler secret put PAYSTACK_SECRET_KEY
echo "wh_secret_placeholder_replace_with_real" | pnpm --filter @skipper/api exec wrangler secret put PAYSTACK_WEBHOOK_SECRET
```

- [ ] **Step 3: Extend `scripts/smoke-test.sh` with the new endpoints**

Open `scripts/smoke-test.sh`. Just before the `echo "---"` line that prints the pass/fail totals, append these new checks:

```bash
# --- Milestone 2b: checkout API ---
order_payload='{"items":[{"product_id":"prod_skipper_2l","quantity":1}],"delivery_method":"pickup","delivery_name":"Smoke Tester","delivery_email":"smoke@example.com","delivery_phone":"+233200000000","payment_method":"paystack"}'

# Place an order and capture order_id + order_number
order_response=$(curl -s -X POST "$BASE_URL/api/orders" -H "Content-Type: application/json" -d "$order_payload")
order_id=$(echo "$order_response" | sed -n 's/.*"id":"\([a-f0-9]\{16\}\)".*/\1/p')
order_number=$(echo "$order_response" | sed -n 's/.*"order_number":"\(SK-[0-9-]*\)".*/\1/p')

if [ -n "$order_id" ] && [ -n "$order_number" ]; then
  echo "PASS  POST /api/orders (created $order_number)"
  pass=$((pass + 1))
else
  echo "FAIL  POST /api/orders (response: $order_response)"
  fail=$((fail + 1))
fi

check "GET /api/track/:order_number" 200 "$BASE_URL/api/track/$order_number?email=smoke@example.com" "$order_number"
check "GET /api/track 404 on wrong email" 404 "$BASE_URL/api/track/$order_number?email=other@example.com"
check "GET /api/track 400 on missing email" 400 "$BASE_URL/api/track/$order_number"

# Webhook rejection when unsigned
webhook_status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/webhooks/paystack" -H "Content-Type: application/json" -d '{"event":"charge.success"}')
if [ "$webhook_status" = "401" ]; then
  echo "PASS  POST /webhooks/paystack rejects unsigned"
  pass=$((pass + 1))
else
  echo "FAIL  POST /webhooks/paystack expected 401 got $webhook_status"
  fail=$((fail + 1))
fi
```

- [ ] **Step 4: Run smoke tests against the live worker**

```bash
./scripts/smoke-test.sh
```

Expected: all previous checks still pass + 4 new checks pass (15 total).

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke-test.sh
git commit -m "test: extend smoke-test suite with checkout API end-to-end checks"
```

- [ ] **Step 6: Merge to main**

```bash
git push -u origin feat/milestone-2b-checkout-api
git checkout main
git merge feat/milestone-2b-checkout-api
git push
git branch -d feat/milestone-2b-checkout-api
```

CI must go green.

---

## Definition of Done — Milestone 2b

- [ ] `pnpm test` on Linux CI: all previous tests + new 2b tests pass (~160+ tests total).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm format:check` green.
- [ ] Smoke test suite: 11 (2a) + 4 (2b) = 15 checks, all pass live.
- [ ] `POST /api/orders` validates cart server-side, re-prices bulk tiers from DB, decrements stock atomically, creates customer row, generates `SK-YYYYMMDD-NNNN` order number.
- [ ] `POST /api/payments/paystack/init` calls Paystack with `amount` in pesewas and stores reference + access_code.
- [ ] `POST /webhooks/paystack` rejects unsigned requests with 401; verifies HMAC-SHA-512 against `PAYSTACK_WEBHOOK_SECRET`; idempotent on repeat; verifies amount matches `total_amount * 100`.
- [ ] `POST /api/upload/payment-proof` enforces MIME allowlist (jpeg/png/webp) and 3 MB size limit; stores under `payment-proofs/{order_id}/{uuid}.{ext}`.
- [ ] `PATCH /api/orders/:id/proof` stores an https proof URL on the order.
- [ ] `GET /api/track/:order_number` requires email query param, returns order + items if email matches, 404 otherwise.
- [ ] Webhook route is mounted outside `/api/*` so it bypasses rate limiting.
- [ ] No `any` types introduced; no string-concatenated SQL; all mutations use `db.batch` where they span multiple rows.

## What follow-on work does 2b unblock

- **Milestone 3 (Storefront shell)** can now fully exercise the checkout flow in its component tests and dev environment — every endpoint the React app needs is live.
- **Milestone 5 (Admin CMS)** will add admin-only endpoints (`PATCH /api/admin/orders/:id/payment`, list orders, confirm manual payments) on top of 2b's schema.
