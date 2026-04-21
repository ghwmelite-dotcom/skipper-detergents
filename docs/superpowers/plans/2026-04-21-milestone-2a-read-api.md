# Milestone 2a — Read API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship every public **read-only** API endpoint the storefront needs — product listing/detail/search/featured, category browsing, public settings, and the dynamic XML sitemap — all backed by D1 queries, behind a KV rate limit, and verified end-to-end against the live Cloudflare worker.

**Architecture:** Thin Hono route handlers → service modules (pure functions over typed D1 helpers) → shared Zod schemas for query validation and response shaping. No mocks in unit tests for DB access; route handlers are integration-tested against Miniflare's in-memory D1 (Linux CI) and a lightweight curl smoke-test suite against the deployed worker (all platforms). Pagination uses cursor-less `page + per_page` (simple enough for this scale). Search hits the pre-wired FTS5 virtual table from milestone 1.

**Tech Stack:** Hono 4, Cloudflare Workers D1, Cloudflare KV, Zod, Vitest 2, `@cloudflare/vitest-pool-workers` (dormant on Windows — used in Linux CI only).

**Spec reference:** `docs/superpowers/specs/2026-04-21-skipper-detergents-design.md` — §3.3 (tech stack), §4 (data model), §5.5 (tracking flow — read half), §6.8 (rate limiting), §7 (SEO targets).

**Deployment state when this milestone starts:**

- Live worker: `https://skipper-api.ghwmelite.workers.dev`
- D1 `skipper-detergents-db` (`4d774420-93b4-45cf-905d-e9313006aafc`) — schema applied, seeded with 6 categories / 12 products / 18 bulk tiers / 12 images / 4 variants / 2 delivery zones / 13 settings
- All three KV namespaces bound (`KV_SESSIONS`, `KV_RATE_LIMIT`, `KV_CACHE`)
- Both R2 buckets bound (`R2_PRODUCTS`, `R2_PROOFS`)
- CI: green, deploy: manual dispatch
- 50 tests passing (35 shared + 15 api)

---

## File Map

**New files in `packages/api/src/`:**

| File                                 | Responsibility                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `utils/db.ts`                        | Typed D1 helpers: `first<T>`, `all<T>`, `run`, `many<T>`, with `.bind()` enforced   |
| `middleware/rateLimit.ts`            | KV-based rate limiter factory; `rateLimit(kv, { limit, windowSeconds, keyPrefix })` |
| `services/products.ts`               | Pure-function queries: list, featured, bySlug, withRelations                        |
| `services/categories.ts`             | Pure-function queries: list with product counts, productsBySlug                     |
| `services/search.ts`                 | FTS5 search query builder + sanitizer                                               |
| `services/settings.ts`               | Read `store_settings` as a typed map; pick the public subset                        |
| `services/sitemap.ts`                | Assemble URL list for sitemap.xml (products + categories + static)                  |
| `routes/products.ts`                 | Hono router with 4 routes: `/`, `/featured`, `/search`, `/:slug`                    |
| `routes/categories.ts`               | Hono router: `/`, `/:slug/products`                                                 |
| `routes/settings.ts`                 | Hono router: `/public`                                                              |
| `routes/sitemap.ts`                  | Hono router: `/` (returns `application/xml`)                                        |
| `tests/services/products.test.ts`    | Unit tests for product service (Miniflare-pool, Linux CI)                           |
| `tests/services/categories.test.ts`  | Unit tests for category service                                                     |
| `tests/services/search.test.ts`      | FTS5 search tests                                                                   |
| `tests/services/settings.test.ts`    | Settings read/shape tests                                                           |
| `tests/services/sitemap.test.ts`     | Sitemap URL-set assembly tests                                                      |
| `tests/utils/db.test.ts`             | D1 helper unit tests                                                                |
| `tests/middleware/rateLimit.test.ts` | Rate-limit middleware tests                                                         |
| `tests/routes/products.test.ts`      | Product route integration tests                                                     |
| `tests/routes/categories.test.ts`    | Category route integration tests                                                    |
| `tests/routes/settings.test.ts`      | Settings route tests                                                                |
| `tests/routes/sitemap.test.ts`       | Sitemap route tests                                                                 |
| `tests/helpers/db-fixtures.ts`       | Reusable D1 seeding helper for integration tests                                    |
| `scripts/smoke-test.sh`              | curl-driven smoke test against a live base URL                                      |

**Modified files:**

| File                                    | Change                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `packages/api/src/index.ts`             | Register all route modules, attach rate limit middleware to public `/api/*` |
| `packages/api/vitest.config.ts`         | Include new test directories; Linux-CI workers pool picks them up           |
| `packages/shared/src/schemas.ts`        | Add `productListQuerySchema`, `productSearchQuerySchema`                    |
| `packages/shared/src/index.ts`          | Re-export the new schemas (automatic via `export *`)                        |
| `packages/shared/tests/schemas.test.ts` | Add tests for the two new query schemas                                     |

**Route URL conventions (all prefixed with `/api`):**

```
GET  /api/products                    # list + filters + sort + pagination
GET  /api/products/featured           # is_featured = 1
GET  /api/products/search?q=...       # FTS5 match
GET  /api/products/:slug              # single w/ images + variants + bulk_tiers
GET  /api/categories                  # all active cats w/ product_count
GET  /api/categories/:slug/products   # category page listing
GET  /api/settings/public             # whitelisted store_settings subset
GET  /api/sitemap.xml                 # dynamic XML (content-type application/xml)
```

Existing `GET /health` and `GET /` stay unprefixed (operational endpoints).

---

## Shared Principles for Every Task

1. **Never string-concatenate SQL.** Every query uses `db.prepare(sql).bind(params...)`.
2. **Route handlers stay thin.** All logic lives in `services/*`. Handlers: validate input (Zod) → call service → shape response (`ok()` or `fail()`).
3. **Response shape is always the `ok()` / `fail()` envelope** from `@skipper/api`'s `utils/response.ts`.
4. **Money in GHS.** No pesewa conversions in the read path.
5. **`is_active = 1` is always filtered** on public endpoints (products, categories).
6. **Pagination defaults:** `page = 1`, `per_page = 20`, `per_page_max = 100`.
7. **FTS5 queries sanitize user input** to avoid syntax errors from raw user queries (escape unmatched quotes, strip control chars, append `*` for prefix search).

---

## Task 1: D1 query helpers

**Files:**

- Create: `packages/api/src/utils/db.ts`
- Create: `packages/api/tests/utils/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/utils/db.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { first, all, run } from '../../src/utils/db';

interface FakePreparedStatement {
  bind: (...args: unknown[]) => FakePreparedStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[]; success: boolean }>;
  run: () => Promise<{ success: boolean; meta: { changes: number } }>;
}

function makeDb(mockRows: unknown[]) {
  const bindings: unknown[][] = [];
  const stmt: FakePreparedStatement = {
    bind(...args) {
      bindings.push(args);
      return stmt;
    },
    async first<T>() {
      return (mockRows[0] ?? null) as T | null;
    },
    async all<T>() {
      return { results: mockRows as T[], success: true };
    },
    async run() {
      return { success: true, meta: { changes: mockRows.length } };
    },
  };
  const db = {
    prepare: () => stmt,
  } as unknown as D1Database;
  return { db, bindings };
}

describe('first', () => {
  it('returns the single row when the statement has one result', async () => {
    const { db } = makeDb([{ id: 'x', name: 'Skipper' }]);
    const row = await first<{ id: string; name: string }>(
      db,
      'SELECT * FROM products WHERE id = ?',
      ['x'],
    );
    expect(row).toEqual({ id: 'x', name: 'Skipper' });
  });

  it('returns null when no row matches', async () => {
    const { db } = makeDb([]);
    const row = await first<{ id: string }>(db, 'SELECT * FROM products WHERE id = ?', ['y']);
    expect(row).toBeNull();
  });

  it('passes bindings to the statement', async () => {
    const { db, bindings } = makeDb([]);
    await first(db, 'SELECT * FROM products WHERE id = ?', ['abc']);
    expect(bindings).toEqual([['abc']]);
  });
});

describe('all', () => {
  it('returns the results array', async () => {
    const { db } = makeDb([{ id: '1' }, { id: '2' }]);
    const rows = await all<{ id: string }>(db, 'SELECT id FROM products', []);
    expect(rows).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns an empty array when no rows match', async () => {
    const { db } = makeDb([]);
    const rows = await all(db, 'SELECT * FROM products WHERE 0', []);
    expect(rows).toEqual([]);
  });
});

describe('run', () => {
  it('returns meta with changes count', async () => {
    const { db } = makeDb([{ any: 'thing' }]);
    const result = await run(db, 'DELETE FROM products WHERE id = ?', ['x']);
    expect(result.success).toBe(true);
    expect(result.meta.changes).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @skipper/api test tests/utils/db.test.ts
```

Expected: FAIL — "Cannot find module '../../src/utils/db'".

- [ ] **Step 3: Implement `packages/api/src/utils/db.ts`**

```typescript
export async function first<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const stmt = db.prepare(sql).bind(...params);
  return (await stmt.first<T>()) ?? null;
}

export async function all<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.all<T>();
  return result.results ?? [];
}

export async function run(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<{ success: boolean; meta: { changes: number } }> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.run();
  return { success: result.success, meta: { changes: result.meta?.changes ?? 0 } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @skipper/api test tests/utils/db.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/utils/db.ts packages/api/tests/utils/db.test.ts
git commit -m "feat(api): add typed D1 helpers (first, all, run) with bind enforcement"
```

---

## Task 2: Rate-limit middleware

**Files:**

- Create: `packages/api/src/middleware/rateLimit.ts`
- Create: `packages/api/tests/middleware/rateLimit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/middleware/rateLimit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimit } from '../../src/middleware/rateLimit';
import type { Env } from '../../src/types/env';

function makeKV() {
  const store = new Map<string, { value: string; expiresAt: number }>();
  return {
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      const ttlMs = (options?.expirationTtl ?? 60) * 1000;
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    async delete(key: string) {
      store.delete(key);
    },
    _store: store,
  } as unknown as KVNamespace & { _store: Map<string, { value: string; expiresAt: number }> };
}

function buildApp(kv: KVNamespace, options: { limit: number; windowSeconds: number }) {
  const app = new Hono<{ Bindings: Env }>();
  app.use(
    '*',
    rateLimit({ limit: options.limit, windowSeconds: options.windowSeconds, keyPrefix: 'test' }),
  );
  app.get('/ping', (c) => c.json({ pong: true }));
  return app;
}

function envWith(kv: KVNamespace): Env {
  return { KV_RATE_LIMIT: kv } as unknown as Env;
}

describe('rateLimit', () => {
  let kv: KVNamespace & { _store: Map<string, { value: string; expiresAt: number }> };
  beforeEach(() => {
    kv = makeKV() as KVNamespace & { _store: Map<string, { value: string; expiresAt: number }> };
  });

  it('allows requests up to the limit', async () => {
    const app = buildApp(kv, { limit: 3, windowSeconds: 60 });
    const env = envWith(kv);
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/ping', { headers: { 'cf-connecting-ip': '1.2.3.4' } }, env);
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 when the limit is exceeded', async () => {
    const app = buildApp(kv, { limit: 2, windowSeconds: 60 });
    const env = envWith(kv);
    for (let i = 0; i < 2; i++) {
      await app.request('/ping', { headers: { 'cf-connecting-ip': '9.9.9.9' } }, env);
    }
    const res = await app.request('/ping', { headers: { 'cf-connecting-ip': '9.9.9.9' } }, env);
    expect(res.status).toBe(429);
    const body = await res.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('isolates by IP address', async () => {
    const app = buildApp(kv, { limit: 1, windowSeconds: 60 });
    const env = envWith(kv);
    const a = await app.request('/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } }, env);
    const b = await app.request('/ping', { headers: { 'cf-connecting-ip': '2.2.2.2' } }, env);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  it('falls back to "unknown" IP when cf-connecting-ip is absent', async () => {
    const app = buildApp(kv, { limit: 1, windowSeconds: 60 });
    const env = envWith(kv);
    const first = await app.request('/ping', {}, env);
    const second = await app.request('/ping', {}, env);
    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });

  it('includes X-RateLimit headers on allowed responses', async () => {
    const app = buildApp(kv, { limit: 5, windowSeconds: 60 });
    const env = envWith(kv);
    const res = await app.request('/ping', { headers: { 'cf-connecting-ip': '3.3.3.3' } }, env);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @skipper/api test tests/middleware/rateLimit.test.ts
```

Expected: FAIL — "Cannot find module '../../src/middleware/rateLimit'".

- [ ] **Step 3: Implement `packages/api/src/middleware/rateLimit.ts`**

```typescript
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { fail } from '../utils/response';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const currentStr = await c.env.KV_RATE_LIMIT.get(key);
    const current = currentStr ? Number.parseInt(currentStr, 10) : 0;

    if (current >= options.limit) {
      return c.json(fail('RATE_LIMITED', 'Too many requests — slow down'), 429);
    }

    const next_ = current + 1;
    await c.env.KV_RATE_LIMIT.put(key, String(next_), {
      expirationTtl: options.windowSeconds,
    });

    await next();

    c.res.headers.set('X-RateLimit-Limit', String(options.limit));
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, options.limit - next_)));
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @skipper/api test tests/middleware/rateLimit.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/middleware/rateLimit.ts packages/api/tests/middleware/rateLimit.test.ts
git commit -m "feat(api): add KV-backed rate-limit middleware with IP isolation"
```

---

## Task 3: DB fixtures helper

**Files:**

- Create: `packages/api/tests/helpers/db-fixtures.ts`

No dedicated test — this helper is exercised by every subsequent service/route test.

- [ ] **Step 1: Create the helper**

```typescript
export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  sort_order?: number;
  is_active?: number;
}

export interface SeedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  brand?: string | null;
  unit_price: number;
  stock_quantity?: number;
  is_active?: number;
  is_featured?: number;
  is_bulk_available?: number;
  tags?: string | null;
}

export interface SeedBulkTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  label?: string;
}

export interface SeedImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  is_primary?: number;
}

export async function resetDatabase(db: D1Database): Promise<void> {
  const tables = [
    'activity_log',
    'order_items',
    'orders',
    'customers',
    'bulk_pricing_tiers',
    'product_variants',
    'product_images',
    'products',
    'categories',
    'admin_users',
    'delivery_zones',
    'store_settings',
    'order_number_sequence',
  ];
  for (const t of tables) {
    await db.prepare(`DELETE FROM ${t}`).run();
  }
}

export async function seedCategories(db: D1Database, categories: SeedCategory[]): Promise<void> {
  for (const c of categories) {
    await db
      .prepare(
        `INSERT INTO categories (id, name, slug, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(c.id, c.name, c.slug, c.sort_order ?? 0, c.is_active ?? 1)
      .run();
  }
}

export async function seedProducts(db: D1Database, products: SeedProduct[]): Promise<void> {
  for (const p of products) {
    await db
      .prepare(
        `INSERT INTO products (
          id, name, slug, description, category_id, brand,
          unit_price, stock_quantity, is_active, is_featured, is_bulk_available, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        p.id,
        p.name,
        p.slug,
        p.description,
        p.category_id,
        p.brand ?? null,
        p.unit_price,
        p.stock_quantity ?? 0,
        p.is_active ?? 1,
        p.is_featured ?? 0,
        p.is_bulk_available ?? 0,
        p.tags ?? null,
      )
      .run();
  }
}

export async function seedBulkTiers(db: D1Database, tiers: SeedBulkTier[]): Promise<void> {
  for (const t of tiers) {
    await db
      .prepare(
        `INSERT INTO bulk_pricing_tiers (id, product_id, min_quantity, max_quantity, unit_price, label)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(t.id, t.product_id, t.min_quantity, t.max_quantity, t.unit_price, t.label ?? null)
      .run();
  }
}

export async function seedImages(db: D1Database, images: SeedImage[]): Promise<void> {
  for (const i of images) {
    await db
      .prepare(
        `INSERT INTO product_images (id, product_id, url, alt_text, is_primary)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(i.id, i.product_id, i.url, i.alt_text ?? null, i.is_primary ?? 0)
      .run();
  }
}

export async function seedSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(`INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)`)
    .bind(key, value)
    .run();
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/tests/helpers/db-fixtures.ts
git commit -m "test(api): add D1 fixture helpers for integration tests"
```

---

## Task 4: Product list + query schemas (shared)

**Files:**

- Modify: `packages/shared/src/schemas.ts` (add at end)
- Modify: `packages/shared/tests/schemas.test.ts` (add tests)

- [ ] **Step 1: Add failing tests**

Append to `packages/shared/tests/schemas.test.ts`:

```typescript
import { productListQuerySchema, productSearchQuerySchema } from '../src/schemas';

describe('productListQuerySchema', () => {
  it('accepts an empty query (all defaults)', () => {
    const parsed = productListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.per_page).toBe(20);
    expect(parsed.sort).toBe('newest');
  });

  it('coerces string query params to numbers', () => {
    const parsed = productListQuerySchema.parse({ page: '2', per_page: '30' });
    expect(parsed.page).toBe(2);
    expect(parsed.per_page).toBe(30);
  });

  it('rejects per_page above max', () => {
    expect(() => productListQuerySchema.parse({ per_page: '500' })).toThrow();
  });

  it('rejects unknown sort values', () => {
    expect(() => productListQuerySchema.parse({ sort: 'trending' })).toThrow();
  });

  it('accepts filter fields', () => {
    const parsed = productListQuerySchema.parse({
      category: 'detergents-laundry',
      brand: 'Skipper',
      bulk_only: 'true',
      min_price: '10',
      max_price: '100',
    });
    expect(parsed.category).toBe('detergents-laundry');
    expect(parsed.brand).toBe('Skipper');
    expect(parsed.bulk_only).toBe(true);
    expect(parsed.min_price).toBe(10);
    expect(parsed.max_price).toBe(100);
  });
});

describe('productSearchQuerySchema', () => {
  it('requires q with at least 2 chars', () => {
    expect(() => productSearchQuerySchema.parse({ q: '' })).toThrow();
    expect(() => productSearchQuerySchema.parse({ q: 'a' })).toThrow();
    expect(() => productSearchQuerySchema.parse({ q: 'ab' })).not.toThrow();
  });

  it('caps q at 100 chars', () => {
    const long = 'a'.repeat(101);
    expect(() => productSearchQuerySchema.parse({ q: long })).toThrow();
  });

  it('defaults limit to 20, max 50', () => {
    expect(productSearchQuerySchema.parse({ q: 'omo' }).limit).toBe(20);
    expect(() => productSearchQuerySchema.parse({ q: 'omo', limit: '200' })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @skipper/shared test
```

Expected: FAIL — `productListQuerySchema` and `productSearchQuerySchema` not exported.

- [ ] **Step 3: Implement the schemas**

Append to `packages/shared/src/schemas.ts`:

```typescript
const numericFromString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((v) => !Number.isNaN(v), { message: 'must be a number' });

const booleanFromString = z
  .union([z.string(), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'));

export const productListQuerySchema = z.object({
  page: numericFromString.pipe(z.number().int().positive()).default(1),
  per_page: numericFromString.pipe(z.number().int().positive().max(100)).default(20),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc', 'popular']).default('newest'),
  category: z.string().min(1).max(100).optional(),
  brand: z.string().min(1).max(100).optional(),
  bulk_only: booleanFromString.default(false),
  min_price: numericFromString.pipe(z.number().nonnegative()).optional(),
  max_price: numericFromString.pipe(z.number().nonnegative()).optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productSearchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: numericFromString.pipe(z.number().int().positive().max(50)).default(20),
});
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @skipper/shared test
```

Expected: PASS — all existing + 7 new tests.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas.ts packages/shared/tests/schemas.test.ts
git commit -m "feat(shared): add product list and search query schemas"
```

---

## Task 5: Products service — list + featured + bySlug

**Files:**

- Create: `packages/api/src/services/products.ts`
- Create: `packages/api/tests/services/products.test.ts`

This task uses the Cloudflare Workers test pool. **On Windows local machines this pool won't start** (workerd + path-with-spaces bug from milestone 1 memory); the tests still run correctly on Linux CI. The helper imports `env` from `cloudflare:test` which is only available in the workers pool.

- [ ] **Step 1a: Add `migrations_dir` to `packages/api/wrangler.toml`**

Edit the `[[d1_databases]]` block so Miniflare can auto-apply the schema when tests spin up a fresh D1:

```toml
[[d1_databases]]
binding = "DB"
database_name = "skipper-detergents-db"
database_id = "4d774420-93b4-45cf-905d-e9313006aafc"
migrations_dir = "./src/db/migrations"
```

- [ ] **Step 1b: Configure vitest to separate workers-pool tests**

Edit `packages/api/vitest.config.ts` so the `workers` project includes **all** `tests/services/**/*.test.ts` and `tests/routes/**/*.test.ts`, while the `unit` project keeps `tests/utils/*`, `tests/middleware/*`, `tests/response.test.ts`, `tests/middleware.test.ts`, and `tests/health.test.ts`.

Replace entire file with:

```typescript
import { defineConfig } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: [
            'tests/response.test.ts',
            'tests/middleware.test.ts',
            'tests/health.test.ts',
            'tests/utils/**/*.test.ts',
            'tests/middleware/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      defineWorkersProject({
        test: {
          name: 'workers',
          include: ['tests/services/**/*.test.ts', 'tests/routes/**/*.test.ts'],
          poolOptions: {
            workers: {
              wrangler: { configPath: './wrangler.toml' },
              miniflare: {
                compatibilityDate: '2026-04-20',
                compatibilityFlags: ['nodejs_compat'],
                d1Databases: ['DB'],
                r2Buckets: ['R2_PRODUCTS', 'R2_PROOFS'],
                kvNamespaces: ['KV_SESSIONS', 'KV_RATE_LIMIT', 'KV_CACHE'],
              },
            },
          },
        },
      }),
    ],
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `packages/api/tests/services/products.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { listProducts, getFeaturedProducts, getProductBySlug } from '../../src/services/products';
import {
  resetDatabase,
  seedCategories,
  seedProducts,
  seedBulkTiers,
  seedImages,
} from '../helpers/db-fixtures';

// Miniflare auto-applies migrations from wrangler.toml `migrations_dir`
// before this test file runs, so tables already exist by beforeEach.

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [
    { id: 'c1', name: 'Detergents', slug: 'detergents', sort_order: 1 },
    { id: 'c2', name: 'Toilet Paper', slug: 'toilet-paper', sort_order: 2 },
  ]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'Skipper Liquid 2L',
      slug: 'skipper-liquid-2l',
      description: 'Liquid detergent',
      category_id: 'c1',
      brand: 'Skipper',
      unit_price: 45,
      stock_quantity: 100,
      is_featured: 1,
      is_bulk_available: 1,
      tags: 'liquid,detergent',
    },
    {
      id: 'p2',
      name: 'Ariel 3kg',
      slug: 'ariel-3kg',
      description: 'Ariel powder',
      category_id: 'c1',
      brand: 'Ariel',
      unit_price: 62,
      stock_quantity: 80,
      tags: 'powder,ariel',
    },
    {
      id: 'p3',
      name: 'Softcare 10-Pack',
      slug: 'softcare-10-pack',
      description: 'Toilet rolls',
      category_id: 'c2',
      brand: 'Softcare',
      unit_price: 35,
      stock_quantity: 200,
      is_featured: 1,
      tags: 'toilet-roll',
    },
    {
      id: 'p4',
      name: 'Inactive Product',
      slug: 'inactive',
      description: 'Hidden',
      category_id: 'c1',
      brand: 'X',
      unit_price: 10,
      is_active: 0,
    },
  ]);
  await seedImages(env.DB, [
    { id: 'i1', product_id: 'p1', url: 'https://example/p1.jpg', is_primary: 1 },
    { id: 'i2', product_id: 'p1', url: 'https://example/p1-alt.jpg', is_primary: 0 },
  ]);
  await seedBulkTiers(env.DB, [
    {
      id: 'b1',
      product_id: 'p1',
      min_quantity: 10,
      max_quantity: 49,
      unit_price: 38,
      label: 'Bulk',
    },
    {
      id: 'b2',
      product_id: 'p1',
      min_quantity: 50,
      max_quantity: null,
      unit_price: 33,
      label: 'Wholesale',
    },
  ]);
});

describe('listProducts', () => {
  it('returns only active products by default', async () => {
    const { products, total } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: false,
    });
    expect(total).toBe(3);
    expect(products.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('filters by category slug', async () => {
    const { products, total } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: false,
      category: 'toilet-paper',
    });
    expect(total).toBe(1);
    expect(products[0]?.id).toBe('p3');
  });

  it('filters by brand', async () => {
    const { products } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: false,
      brand: 'Ariel',
    });
    expect(products.map((p) => p.id)).toEqual(['p2']);
  });

  it('filters bulk_only', async () => {
    const { products } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: true,
    });
    expect(products.map((p) => p.id)).toEqual(['p1']);
  });

  it('paginates correctly', async () => {
    const page1 = await listProducts(env.DB, {
      page: 1,
      per_page: 2,
      sort: 'name_asc',
      bulk_only: false,
    });
    const page2 = await listProducts(env.DB, {
      page: 2,
      per_page: 2,
      sort: 'name_asc',
      bulk_only: false,
    });
    expect(page1.products).toHaveLength(2);
    expect(page2.products).toHaveLength(1);
    expect([...page1.products, ...page2.products].map((p) => p.id).sort()).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('sorts by price_asc', async () => {
    const { products } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'price_asc',
      bulk_only: false,
    });
    expect(products.map((p) => p.unit_price)).toEqual([35, 45, 62]);
  });

  it('respects min_price and max_price', async () => {
    const { products } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: false,
      min_price: 40,
      max_price: 50,
    });
    expect(products.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('getFeaturedProducts', () => {
  it('returns only is_featured products', async () => {
    const products = await getFeaturedProducts(env.DB, 10);
    expect(products.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
  });

  it('respects the limit', async () => {
    const products = await getFeaturedProducts(env.DB, 1);
    expect(products).toHaveLength(1);
  });
});

describe('getProductBySlug', () => {
  it('returns product with images, bulk tiers, and variants arrays', async () => {
    const product = await getProductBySlug(env.DB, 'skipper-liquid-2l');
    expect(product).not.toBeNull();
    expect(product!.id).toBe('p1');
    expect(product!.images).toHaveLength(2);
    expect(product!.bulk_tiers).toHaveLength(2);
    expect(product!.variants).toEqual([]);
  });

  it('orders primary image first', async () => {
    const product = await getProductBySlug(env.DB, 'skipper-liquid-2l');
    expect(product!.images[0]?.is_primary).toBe(1);
  });

  it('returns null for unknown slug', async () => {
    const product = await getProductBySlug(env.DB, 'nope');
    expect(product).toBeNull();
  });

  it('returns null for inactive product', async () => {
    const product = await getProductBySlug(env.DB, 'inactive');
    expect(product).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm --filter @skipper/api test tests/services/products.test.ts
```

Expected (on Linux CI): FAIL — "Cannot find module '../../src/services/products'". On Windows local machine: test pool fails to start, which is expected — skip this step locally.

- [ ] **Step 4: Implement `packages/api/src/services/products.ts`**

```typescript
import type {
  Product,
  ProductImage,
  ProductVariant,
  BulkPricingTier,
  ProductWithRelations,
  ProductListQuery,
} from '@skipper/shared';
import { first, all } from '../utils/db';

const SORT_CLAUSES: Record<NonNullable<ProductListQuery['sort']>, string> = {
  newest: 'created_at DESC',
  price_asc: 'unit_price ASC',
  price_desc: 'unit_price DESC',
  name_asc: 'name ASC',
  popular: 'total_sold DESC, created_at DESC',
};

export interface ProductListResult {
  products: Product[];
  total: number;
}

export async function listProducts(
  db: D1Database,
  query: ProductListQuery,
): Promise<ProductListResult> {
  const clauses: string[] = ['p.is_active = 1'];
  const params: unknown[] = [];

  if (query.category) {
    clauses.push('c.slug = ?');
    params.push(query.category);
  }
  if (query.brand) {
    clauses.push('p.brand = ?');
    params.push(query.brand);
  }
  if (query.bulk_only) {
    clauses.push('p.is_bulk_available = 1');
  }
  if (query.min_price !== undefined) {
    clauses.push('p.unit_price >= ?');
    params.push(query.min_price);
  }
  if (query.max_price !== undefined) {
    clauses.push('p.unit_price <= ?');
    params.push(query.max_price);
  }

  const where = clauses.join(' AND ');
  const orderBy = SORT_CLAUSES[query.sort];
  const offset = (query.page - 1) * query.per_page;

  const listSql = `
    SELECT p.*
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const countSql = `
    SELECT COUNT(*) AS n
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE ${where}
  `;

  const [products, totalRow] = await Promise.all([
    all<Product>(db, listSql, [...params, query.per_page, offset]),
    first<{ n: number }>(db, countSql, params),
  ]);

  return { products, total: totalRow?.n ?? 0 };
}

export async function getFeaturedProducts(db: D1Database, limit: number): Promise<Product[]> {
  return all<Product>(
    db,
    `SELECT * FROM products
     WHERE is_active = 1 AND is_featured = 1
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit],
  );
}

export async function getProductBySlug(
  db: D1Database,
  slug: string,
): Promise<ProductWithRelations | null> {
  const product = await first<Product>(
    db,
    `SELECT * FROM products WHERE slug = ? AND is_active = 1`,
    [slug],
  );
  if (!product) return null;

  const [images, variants, bulk_tiers, category] = await Promise.all([
    all<ProductImage>(
      db,
      `SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC`,
      [product.id],
    ),
    all<ProductVariant>(
      db,
      `SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY created_at ASC`,
      [product.id],
    ),
    all<BulkPricingTier>(
      db,
      `SELECT * FROM bulk_pricing_tiers WHERE product_id = ? ORDER BY min_quantity ASC`,
      [product.id],
    ),
    first<{ id: string; name: string; slug: string }>(
      db,
      `SELECT id, name, slug FROM categories WHERE id = ?`,
      [product.category_id],
    ),
  ]);

  return {
    ...product,
    images,
    variants,
    bulk_tiers,
    category: category ?? { id: product.category_id, name: '', slug: '' },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass (Linux CI)**

Run in CI (or on a machine whose path has no spaces):

```bash
pnpm --filter @skipper/api test tests/services/products.test.ts
```

Expected: PASS — 13 tests.

On Windows with OneDrive path: the workers pool will refuse to start. Skip local verification; rely on CI.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/services/products.ts packages/api/tests/services/products.test.ts packages/api/vitest.config.ts
git commit -m "feat(api): add products service (list, featured, bySlug) with relations"
```

---

## Task 6: Categories service

**Files:**

- Create: `packages/api/src/services/categories.ts`
- Create: `packages/api/tests/services/categories.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/services/categories.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { listCategories, getCategoryBySlugWithProducts } from '../../src/services/categories';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [
    { id: 'c1', name: 'Detergents', slug: 'detergents', sort_order: 1 },
    { id: 'c2', name: 'Toilet Paper', slug: 'toilet-paper', sort_order: 2 },
    { id: 'c3', name: 'Hidden', slug: 'hidden', sort_order: 3, is_active: 0 },
  ]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'A',
      slug: 'a',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 10,
    },
    {
      id: 'p2',
      name: 'B',
      slug: 'b',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 20,
    },
    {
      id: 'p3',
      name: 'C',
      slug: 'c',
      description: 'x',
      category_id: 'c2',
      brand: 'S',
      unit_price: 30,
    },
  ]);
});

describe('listCategories', () => {
  it('returns only active categories with product counts', async () => {
    const cats = await listCategories(env.DB);
    expect(cats.map((c) => c.slug)).toEqual(['detergents', 'toilet-paper']);
    expect(cats.find((c) => c.slug === 'detergents')?.product_count).toBe(2);
    expect(cats.find((c) => c.slug === 'toilet-paper')?.product_count).toBe(1);
  });

  it('orders by sort_order', async () => {
    const cats = await listCategories(env.DB);
    expect(cats.map((c) => c.sort_order)).toEqual([1, 2]);
  });
});

describe('getCategoryBySlugWithProducts', () => {
  it('returns category + products', async () => {
    const result = await getCategoryBySlugWithProducts(env.DB, 'detergents', {
      page: 1,
      per_page: 20,
    });
    expect(result).not.toBeNull();
    expect(result!.category.slug).toBe('detergents');
    expect(result!.products.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    expect(result!.total).toBe(2);
  });

  it('returns null for unknown or inactive slug', async () => {
    expect(
      await getCategoryBySlugWithProducts(env.DB, 'nope', { page: 1, per_page: 20 }),
    ).toBeNull();
    expect(
      await getCategoryBySlugWithProducts(env.DB, 'hidden', { page: 1, per_page: 20 }),
    ).toBeNull();
  });

  it('paginates the products list', async () => {
    const p1 = await getCategoryBySlugWithProducts(env.DB, 'detergents', { page: 1, per_page: 1 });
    const p2 = await getCategoryBySlugWithProducts(env.DB, 'detergents', { page: 2, per_page: 1 });
    expect(p1!.products).toHaveLength(1);
    expect(p2!.products).toHaveLength(1);
    expect(p1!.total).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/services/categories.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/api/src/services/categories.ts`**

```typescript
import type { Category, Product } from '@skipper/shared';
import { all, first } from '../utils/db';

export interface CategoryWithCount extends Category {
  product_count: number;
}

export async function listCategories(db: D1Database): Promise<CategoryWithCount[]> {
  return all<CategoryWithCount>(
    db,
    `SELECT c.*, COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     WHERE c.is_active = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`,
    [],
  );
}

export interface CategoryWithProducts {
  category: Category;
  products: Product[];
  total: number;
}

export async function getCategoryBySlugWithProducts(
  db: D1Database,
  slug: string,
  pagination: { page: number; per_page: number },
): Promise<CategoryWithProducts | null> {
  const category = await first<Category>(
    db,
    `SELECT * FROM categories WHERE slug = ? AND is_active = 1`,
    [slug],
  );
  if (!category) return null;

  const offset = (pagination.page - 1) * pagination.per_page;
  const [products, totalRow] = await Promise.all([
    all<Product>(
      db,
      `SELECT * FROM products
       WHERE category_id = ? AND is_active = 1
       ORDER BY is_featured DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [category.id, pagination.per_page, offset],
    ),
    first<{ n: number }>(
      db,
      `SELECT COUNT(*) AS n FROM products WHERE category_id = ? AND is_active = 1`,
      [category.id],
    ),
  ]);

  return { category, products, total: totalRow?.n ?? 0 };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/services/categories.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/categories.ts packages/api/tests/services/categories.test.ts
git commit -m "feat(api): add categories service (list with counts, bySlug with products)"
```

---

## Task 7: Search service

**Files:**

- Create: `packages/api/src/services/search.ts`
- Create: `packages/api/tests/services/search.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/services/search.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { searchProducts, sanitizeFtsQuery } from '../../src/services/search';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [{ id: 'c1', name: 'D', slug: 'd' }]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'Skipper Liquid Detergent',
      slug: 'p1',
      description: 'Ocean fresh scent',
      category_id: 'c1',
      brand: 'Skipper',
      unit_price: 45,
      tags: 'liquid,detergent,fresh',
    },
    {
      id: 'p2',
      name: 'Ariel Powder',
      slug: 'p2',
      description: 'Stain remover',
      category_id: 'c1',
      brand: 'Ariel',
      unit_price: 62,
      tags: 'powder,stain',
    },
    {
      id: 'p3',
      name: 'Softcare Toilet Roll',
      slug: 'p3',
      description: '2-ply soft rolls',
      category_id: 'c1',
      brand: 'Softcare',
      unit_price: 35,
      tags: 'toilet,soft',
    },
  ]);
});

describe('sanitizeFtsQuery', () => {
  it('lowercases and trims', () => {
    expect(sanitizeFtsQuery('  SKIPPER  ')).toBe('skipper*');
  });

  it('strips FTS special characters', () => {
    expect(sanitizeFtsQuery('"drop table" -- ')).toBe('drop table*');
  });

  it('collapses whitespace', () => {
    expect(sanitizeFtsQuery('soft   soft')).toBe('soft soft*');
  });

  it('removes leading asterisk from individual tokens but adds trailing prefix glob', () => {
    expect(sanitizeFtsQuery('skip')).toBe('skip*');
    expect(sanitizeFtsQuery('skip omo')).toBe('skip omo*');
  });
});

describe('searchProducts', () => {
  it('finds products by name prefix', async () => {
    const results = await searchProducts(env.DB, 'skip', 20);
    expect(results.map((p) => p.id)).toContain('p1');
  });

  it('finds products by tag', async () => {
    const results = await searchProducts(env.DB, 'stain', 20);
    expect(results.map((p) => p.id)).toContain('p2');
  });

  it('returns an empty array for no matches', async () => {
    const results = await searchProducts(env.DB, 'zzzzzzzz', 20);
    expect(results).toEqual([]);
  });

  it('respects the limit', async () => {
    const results = await searchProducts(env.DB, 'soft', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('excludes inactive products', async () => {
    await env.DB.prepare(`UPDATE products SET is_active = 0 WHERE id = ?`).bind('p1').run();
    const results = await searchProducts(env.DB, 'skipper', 20);
    expect(results.find((p) => p.id === 'p1')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/services/search.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/api/src/services/search.ts`**

```typescript
import type { Product } from '@skipper/shared';
import { all } from '../utils/db';

export function sanitizeFtsQuery(q: string): string {
  const cleaned = q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return `${cleaned}*`;
}

export async function searchProducts(db: D1Database, q: string, limit: number): Promise<Product[]> {
  const ftsQuery = sanitizeFtsQuery(q);
  if (!ftsQuery) return [];

  return all<Product>(
    db,
    `SELECT p.*
     FROM products_fts fts
     JOIN products p ON p.rowid = fts.rowid
     WHERE products_fts MATCH ? AND p.is_active = 1
     ORDER BY rank
     LIMIT ?`,
    [ftsQuery, limit],
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/services/search.test.ts
```

Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/search.ts packages/api/tests/services/search.test.ts
git commit -m "feat(api): add FTS5-backed product search with input sanitization"
```

---

## Task 8: Settings service

**Files:**

- Create: `packages/api/src/services/settings.ts`
- Create: `packages/api/tests/services/settings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/services/settings.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { getPublicSettings, PUBLIC_SETTING_KEYS } from '../../src/services/settings';
import { resetDatabase, seedSetting } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
});

describe('getPublicSettings', () => {
  it('returns only whitelisted keys', async () => {
    await seedSetting(env.DB, 'store_name', 'Skipper Detergents');
    await seedSetting(env.DB, 'paystack_secret_key', 'SK_SECRET_SHOULD_NOT_LEAK');
    await seedSetting(env.DB, 'store_email', 'orders@example');

    const settings = await getPublicSettings(env.DB);
    expect(settings.store_name).toBe('Skipper Detergents');
    expect(settings.store_email).toBe('orders@example');
    expect('paystack_secret_key' in settings).toBe(false);
  });

  it('returns an empty object when no settings match', async () => {
    const settings = await getPublicSettings(env.DB);
    expect(settings).toEqual({});
  });

  it('includes all PUBLIC_SETTING_KEYS when present', async () => {
    for (const key of PUBLIC_SETTING_KEYS) {
      await seedSetting(env.DB, key, `value_for_${key}`);
    }
    const settings = await getPublicSettings(env.DB);
    for (const key of PUBLIC_SETTING_KEYS) {
      expect(settings[key]).toBe(`value_for_${key}`);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/services/settings.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/api/src/services/settings.ts`**

```typescript
import { all } from '../utils/db';

export const PUBLIC_SETTING_KEYS = [
  'store_name',
  'store_tagline',
  'store_email',
  'store_phone',
  'currency',
  'delivery_fee_accra',
  'delivery_fee_other',
  'free_delivery_threshold',
  'manual_payment_details',
  'pickup_address',
  'paystack_public_key',
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export async function getPublicSettings(
  db: D1Database,
): Promise<Partial<Record<PublicSettingKey, string>>> {
  const placeholders = PUBLIC_SETTING_KEYS.map(() => '?').join(', ');
  const rows = await all<{ key: string; value: string }>(
    db,
    `SELECT key, value FROM store_settings WHERE key IN (${placeholders})`,
    [...PUBLIC_SETTING_KEYS],
  );
  const map: Partial<Record<PublicSettingKey, string>> = {};
  for (const row of rows) {
    map[row.key as PublicSettingKey] = row.value;
  }
  return map;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/services/settings.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/settings.ts packages/api/tests/services/settings.test.ts
git commit -m "feat(api): add public-settings service (whitelisted keys only)"
```

---

## Task 9: Sitemap service

**Files:**

- Create: `packages/api/src/services/sitemap.ts`
- Create: `packages/api/tests/services/sitemap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/services/sitemap.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { buildSitemapUrls, renderSitemapXml } from '../../src/services/sitemap';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [
    { id: 'c1', name: 'D', slug: 'detergents' },
    { id: 'c2', name: 'T', slug: 'toilet-paper', is_active: 0 },
  ]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'A',
      slug: 'skipper-2l',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 45,
    },
    {
      id: 'p2',
      name: 'B',
      slug: 'hidden',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 20,
      is_active: 0,
    },
  ]);
});

describe('buildSitemapUrls', () => {
  it('includes static home + shop + bulk + static info pages', async () => {
    const urls = await buildSitemapUrls(env.DB, 'https://skipper.test');
    const paths = urls.map((u) => u.loc);
    expect(paths).toContain('https://skipper.test/');
    expect(paths).toContain('https://skipper.test/shop');
    expect(paths).toContain('https://skipper.test/bulk');
    expect(paths).toContain('https://skipper.test/about');
    expect(paths).toContain('https://skipper.test/contact');
    expect(paths).toContain('https://skipper.test/faq');
  });

  it('includes only active category slugs', async () => {
    const urls = await buildSitemapUrls(env.DB, 'https://skipper.test');
    const paths = urls.map((u) => u.loc);
    expect(paths).toContain('https://skipper.test/shop/detergents');
    expect(paths).not.toContain('https://skipper.test/shop/toilet-paper');
  });

  it('includes only active product slugs', async () => {
    const urls = await buildSitemapUrls(env.DB, 'https://skipper.test');
    const paths = urls.map((u) => u.loc);
    expect(paths).toContain('https://skipper.test/product/skipper-2l');
    expect(paths).not.toContain('https://skipper.test/product/hidden');
  });
});

describe('renderSitemapXml', () => {
  it('produces valid <urlset> XML', () => {
    const xml = renderSitemapXml([
      { loc: 'https://skipper.test/', lastmod: '2026-04-21', changefreq: 'daily', priority: 1.0 },
      { loc: 'https://skipper.test/product/a', lastmod: '2026-04-20' },
    ]);
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://skipper.test/</loc>');
    expect(xml).toContain('<lastmod>2026-04-21</lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>1.0</priority>');
    expect(xml.endsWith('</urlset>')).toBe(true);
  });

  it('XML-escapes special characters in loc', () => {
    const xml = renderSitemapXml([{ loc: 'https://skipper.test/shop?q=a&b' }]);
    expect(xml).toContain('<loc>https://skipper.test/shop?q=a&amp;b</loc>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/services/sitemap.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/api/src/services/sitemap.ts`**

```typescript
import { all } from '../utils/db';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const STATIC_ENTRIES: Array<Omit<SitemapUrl, 'loc'> & { path: string }> = [
  { path: '/', changefreq: 'daily', priority: 1.0 },
  { path: '/shop', changefreq: 'daily', priority: 0.9 },
  { path: '/bulk', changefreq: 'weekly', priority: 0.8 },
  { path: '/about', changefreq: 'monthly', priority: 0.5 },
  { path: '/contact', changefreq: 'monthly', priority: 0.5 },
  { path: '/faq', changefreq: 'monthly', priority: 0.5 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
];

export async function buildSitemapUrls(db: D1Database, baseUrl: string): Promise<SitemapUrl[]> {
  const trimmed = baseUrl.replace(/\/$/, '');
  const urls: SitemapUrl[] = STATIC_ENTRIES.map(({ path, ...rest }) => ({
    ...rest,
    loc: `${trimmed}${path}`,
  }));

  const [categories, products] = await Promise.all([
    all<{ slug: string; updated_at: string }>(
      db,
      `SELECT slug, updated_at FROM categories WHERE is_active = 1`,
      [],
    ),
    all<{ slug: string; updated_at: string }>(
      db,
      `SELECT slug, updated_at FROM products WHERE is_active = 1`,
      [],
    ),
  ]);

  for (const cat of categories) {
    urls.push({
      loc: `${trimmed}/shop/${cat.slug}`,
      lastmod: cat.updated_at.split(' ')[0],
      changefreq: 'weekly',
      priority: 0.7,
    });
  }
  for (const prod of products) {
    urls.push({
      loc: `${trimmed}/product/${prod.slug}`,
      lastmod: prod.updated_at.split(' ')[0],
      changefreq: 'weekly',
      priority: 0.6,
    });
  }

  return urls;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderSitemapXml(urls: SitemapUrl[]): string {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const u of urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(u.loc)}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${u.lastmod}</lastmod>`);
    if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
    if (u.priority !== undefined) lines.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/services/sitemap.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/sitemap.ts packages/api/tests/services/sitemap.test.ts
git commit -m "feat(api): add sitemap service (URL assembly + XML renderer)"
```

---

## Task 10: Products routes

**Files:**

- Create: `packages/api/src/routes/products.ts`
- Create: `packages/api/tests/routes/products.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/routes/products.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import {
  resetDatabase,
  seedCategories,
  seedProducts,
  seedImages,
  seedBulkTiers,
} from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [{ id: 'c1', name: 'D', slug: 'd', sort_order: 1 }]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'Alpha',
      slug: 'alpha',
      description: 'first',
      category_id: 'c1',
      brand: 'S',
      unit_price: 10,
      is_featured: 1,
      is_bulk_available: 1,
      tags: 'alpha,first',
    },
    {
      id: 'p2',
      name: 'Beta',
      slug: 'beta',
      description: 'second',
      category_id: 'c1',
      brand: 'A',
      unit_price: 20,
      tags: 'beta',
    },
  ]);
  await seedImages(env.DB, [
    { id: 'i1', product_id: 'p1', url: 'https://example/a.jpg', is_primary: 1 },
  ]);
  await seedBulkTiers(env.DB, [
    { id: 'b1', product_id: 'p1', min_quantity: 10, max_quantity: null, unit_price: 8 },
  ]);
});

describe('GET /api/products', () => {
  it('returns envelope with data + meta', async () => {
    const res = await app.request('/api/products', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      success: boolean;
      data: unknown[];
      meta: { page: number; per_page: number; total: number };
    }>();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.total).toBe(2);
  });

  it('filters by brand query param', async () => {
    const res = await app.request('/api/products?brand=A', {}, env);
    const body = await res.json<{ data: Array<{ id: string }> }>();
    expect(body.data.map((p) => p.id)).toEqual(['p2']);
  });

  it('rejects invalid per_page', async () => {
    const res = await app.request('/api/products?per_page=9999', {}, env);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/featured', () => {
  it('returns only featured products', async () => {
    const res = await app.request('/api/products/featured', {}, env);
    const body = await res.json<{ data: Array<{ id: string }> }>();
    expect(body.data.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('GET /api/products/search', () => {
  it('returns matches and 400 when q missing', async () => {
    const hit = await app.request('/api/products/search?q=alph', {}, env);
    expect(hit.status).toBe(200);
    const body = await hit.json<{ data: Array<{ id: string }> }>();
    expect(body.data.map((p) => p.id)).toContain('p1');

    const missing = await app.request('/api/products/search', {}, env);
    expect(missing.status).toBe(400);
  });
});

describe('GET /api/products/:slug', () => {
  it('returns a product with relations', async () => {
    const res = await app.request('/api/products/alpha', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: {
        id: string;
        images: Array<{ url: string }>;
        bulk_tiers: Array<{ id: string }>;
        variants: unknown[];
      };
    }>();
    expect(body.data.id).toBe('p1');
    expect(body.data.images).toHaveLength(1);
    expect(body.data.bulk_tiers).toHaveLength(1);
    expect(body.data.variants).toEqual([]);
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await app.request('/api/products/nope', {}, env);
    expect(res.status).toBe(404);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/routes/products.test.ts
```

Expected: FAIL — `/api/products` returns 404 from the 404 handler because the route isn't defined yet.

- [ ] **Step 3: Implement `packages/api/src/routes/products.ts`**

```typescript
import { Hono } from 'hono';
import { productListQuerySchema, productSearchQuerySchema } from '@skipper/shared';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { listProducts, getFeaturedProducts, getProductBySlug } from '../services/products';
import { searchProducts } from '../services/search';

export const productsRouter = new Hono<{ Bindings: Env }>();

productsRouter.get('/', async (c) => {
  const query = productListQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const { products, total } = await listProducts(c.env.DB, query);
  return c.json(ok(products, { page: query.page, per_page: query.per_page, total }));
});

productsRouter.get('/featured', async (c) => {
  const limit = Number.parseInt(c.req.query('limit') ?? '12', 10);
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 50 ? limit : 12;
  const products = await getFeaturedProducts(c.env.DB, safeLimit);
  return c.json(ok(products));
});

productsRouter.get('/search', async (c) => {
  const query = productSearchQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const products = await searchProducts(c.env.DB, query.q, query.limit);
  return c.json(ok(products));
});

productsRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const product = await getProductBySlug(c.env.DB, slug);
  if (!product) {
    return c.json(fail('NOT_FOUND', 'Product not found'), 404);
  }
  return c.json(ok(product));
});
```

- [ ] **Step 4: Wire the router into `src/index.ts`**

Modify `packages/api/src/index.ts`:

```typescript
import { Hono } from 'hono';
import type { Env } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import { ok, fail } from './utils/response';
import { productsRouter } from './routes/products';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);
app.onError(errorHandler);

app.get('/', (c) => c.text('Skipper API'));
app.get('/health', (c) =>
  c.json(ok({ status: 'ok', timestamp: new Date().toISOString(), env: c.env.APP_ENV })),
);

app.use('/api/*', rateLimit({ limit: 100, windowSeconds: 60, keyPrefix: 'rl:public' }));
app.route('/api/products', productsRouter);

app.notFound((c) => c.json(fail('NOT_FOUND', 'Route not found'), 404));

export default app;
```

- [ ] **Step 5: Run tests to verify they pass**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/routes/products.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/products.ts packages/api/src/index.ts packages/api/tests/routes/products.test.ts
git commit -m "feat(api): wire /api/products routes (list, featured, search, detail)"
```

---

## Task 11: Categories routes

**Files:**

- Create: `packages/api/src/routes/categories.ts`
- Create: `packages/api/tests/routes/categories.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/routes/categories.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [
    { id: 'c1', name: 'Detergents', slug: 'detergents', sort_order: 1 },
    { id: 'c2', name: 'Tissue', slug: 'tissue', sort_order: 2 },
  ]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'A',
      slug: 'a',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 10,
    },
  ]);
});

describe('GET /api/categories', () => {
  it('returns all active categories with product_count', async () => {
    const res = await app.request('/api/categories', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: Array<{ slug: string; product_count: number }>;
    }>();
    expect(body.data.map((c) => c.slug)).toEqual(['detergents', 'tissue']);
    expect(body.data.find((c) => c.slug === 'detergents')?.product_count).toBe(1);
  });
});

describe('GET /api/categories/:slug/products', () => {
  it('returns category + products', async () => {
    const res = await app.request('/api/categories/detergents/products', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: { category: { slug: string }; products: Array<{ id: string }> };
      meta: { total: number };
    }>();
    expect(body.data.category.slug).toBe('detergents');
    expect(body.data.products.map((p) => p.id)).toEqual(['p1']);
    expect(body.meta.total).toBe(1);
  });

  it('returns 404 for unknown category', async () => {
    const res = await app.request('/api/categories/nope/products', {}, env);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/routes/categories.test.ts
```

Expected: FAIL — routes return 404.

- [ ] **Step 3: Implement `packages/api/src/routes/categories.ts`**

```typescript
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { listCategories, getCategoryBySlugWithProducts } from '../services/categories';

export const categoriesRouter = new Hono<{ Bindings: Env }>();

categoriesRouter.get('/', async (c) => {
  const categories = await listCategories(c.env.DB);
  return c.json(ok(categories));
});

categoriesRouter.get('/:slug/products', async (c) => {
  const slug = c.req.param('slug');
  const page = Math.max(1, Number.parseInt(c.req.query('page') ?? '1', 10) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number.parseInt(c.req.query('per_page') ?? '20', 10) || 20),
  );
  const result = await getCategoryBySlugWithProducts(c.env.DB, slug, { page, per_page: perPage });
  if (!result) {
    return c.json(fail('NOT_FOUND', 'Category not found'), 404);
  }
  return c.json(
    ok(
      { category: result.category, products: result.products },
      { page, per_page: perPage, total: result.total },
    ),
  );
});
```

- [ ] **Step 4: Wire the router into `src/index.ts`**

Append below the existing `app.route('/api/products', productsRouter);` line:

```typescript
import { categoriesRouter } from './routes/categories';
// ...
app.route('/api/categories', categoriesRouter);
```

- [ ] **Step 5: Run tests to verify they pass**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/routes/categories.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/categories.ts packages/api/src/index.ts packages/api/tests/routes/categories.test.ts
git commit -m "feat(api): wire /api/categories routes (list, bySlug with products)"
```

---

## Task 12: Settings route

**Files:**

- Create: `packages/api/src/routes/settings.ts`
- Create: `packages/api/tests/routes/settings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/routes/settings.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase, seedSetting } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedSetting(env.DB, 'store_name', 'Skipper Detergents');
  await seedSetting(env.DB, 'currency', 'GHS');
  await seedSetting(env.DB, 'paystack_secret_key', 'SHOULD_NOT_LEAK');
});

describe('GET /api/settings/public', () => {
  it('returns whitelisted settings only', async () => {
    const res = await app.request('/api/settings/public', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{ data: Record<string, string> }>();
    expect(body.data.store_name).toBe('Skipper Detergents');
    expect(body.data.currency).toBe('GHS');
    expect('paystack_secret_key' in body.data).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/routes/settings.test.ts
```

Expected: FAIL — route returns 404.

- [ ] **Step 3: Implement `packages/api/src/routes/settings.ts`**

```typescript
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ok } from '../utils/response';
import { getPublicSettings } from '../services/settings';

export const settingsRouter = new Hono<{ Bindings: Env }>();

settingsRouter.get('/public', async (c) => {
  const settings = await getPublicSettings(c.env.DB);
  return c.json(ok(settings));
});
```

- [ ] **Step 4: Wire the router into `src/index.ts`**

Add:

```typescript
import { settingsRouter } from './routes/settings';
// ...
app.route('/api/settings', settingsRouter);
```

- [ ] **Step 5: Run tests to verify they pass**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/routes/settings.test.ts
```

Expected: PASS — 1 test.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/settings.ts packages/api/src/index.ts packages/api/tests/routes/settings.test.ts
git commit -m "feat(api): wire /api/settings/public route"
```

---

## Task 13: Sitemap route

**Files:**

- Create: `packages/api/src/routes/sitemap.ts`
- Create: `packages/api/tests/routes/sitemap.test.ts`

The sitemap URL base is read from `c.env.STOREFRONT_ORIGIN` (we use the storefront domain, not the API domain, in the sitemap).

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/routes/sitemap.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [{ id: 'c1', name: 'D', slug: 'detergents' }]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'A',
      slug: 'skipper-2l',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 45,
    },
  ]);
});

describe('GET /api/sitemap.xml', () => {
  it('returns XML with correct content type', async () => {
    const res = await app.request('/api/sitemap.xml', {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/xml');
    const xml = await res.text();
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain('<urlset');
  });

  it('includes product + category URLs', async () => {
    const res = await app.request('/api/sitemap.xml', {}, env);
    const xml = await res.text();
    expect(xml).toContain('/shop/detergents</loc>');
    expect(xml).toContain('/product/skipper-2l</loc>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/routes/sitemap.test.ts
```

Expected: FAIL — route not defined.

- [ ] **Step 3: Implement `packages/api/src/routes/sitemap.ts`**

```typescript
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { buildSitemapUrls, renderSitemapXml } from '../services/sitemap';

export const sitemapRouter = new Hono<{ Bindings: Env }>();

sitemapRouter.get('/sitemap.xml', async (c) => {
  const base = c.env.STOREFRONT_ORIGIN || 'https://skipperdetergents.com.gh';
  const urls = await buildSitemapUrls(c.env.DB, base);
  const xml = renderSitemapXml(urls);
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});
```

- [ ] **Step 4: Wire the router into `src/index.ts`**

Add:

```typescript
import { sitemapRouter } from './routes/sitemap';
// ...
app.route('/api', sitemapRouter); // mounts /api/sitemap.xml
```

- [ ] **Step 5: Run tests to verify they pass**

Run in CI:

```bash
pnpm --filter @skipper/api test tests/routes/sitemap.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/sitemap.ts packages/api/src/index.ts packages/api/tests/routes/sitemap.test.ts
git commit -m "feat(api): wire /api/sitemap.xml route with cacheable XML response"
```

---

## Task 14: Deploy + smoke test suite

**Files:**

- Create: `scripts/smoke-test.sh`

- [ ] **Step 1: Deploy to Cloudflare**

Run:

```bash
pnpm --filter @skipper/api exec wrangler deploy
```

Expected output ends with: `https://skipper-api.ghwmelite.workers.dev` and `Current Version ID: ...`.

- [ ] **Step 2: Create `scripts/smoke-test.sh`**

```bash
#!/usr/bin/env bash
# Smoke-test the Skipper public read API against a deployed worker.
# Usage: BASE_URL=https://skipper-api.ghwmelite.workers.dev ./scripts/smoke-test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-https://skipper-api.ghwmelite.workers.dev}"
pass=0
fail=0

check() {
  local name="$1"
  local expected_status="$2"
  local url="$3"
  local extra_grep="${4:-}"
  local actual
  actual=$(curl -s -o /tmp/smoke-body -w '%{http_code}' "$url")
  if [ "$actual" != "$expected_status" ]; then
    echo "FAIL  $name — expected $expected_status, got $actual (URL: $url)"
    fail=$((fail + 1))
    return
  fi
  if [ -n "$extra_grep" ] && ! grep -q "$extra_grep" /tmp/smoke-body; then
    echo "FAIL  $name — body did not contain: $extra_grep"
    fail=$((fail + 1))
    return
  fi
  echo "PASS  $name"
  pass=$((pass + 1))
}

check "GET /health"                200 "$BASE_URL/health"                '"status":"ok"'
check "GET /api/products"          200 "$BASE_URL/api/products"          '"success":true'
check "GET /api/products/featured" 200 "$BASE_URL/api/products/featured" '"success":true'
check "GET /api/products/search"   200 "$BASE_URL/api/products/search?q=skip" '"success":true'
check "GET /api/products/:slug"    200 "$BASE_URL/api/products/skipper-liquid-detergent-2l" 'Skipper Liquid Detergent 2L'
check "GET /api/products/unknown"  404 "$BASE_URL/api/products/does-not-exist"
check "GET /api/categories"        200 "$BASE_URL/api/categories"        'detergents-laundry'
check "GET /api/categories/:slug/products" 200 "$BASE_URL/api/categories/detergents-laundry/products" '"success":true'
check "GET /api/settings/public"   200 "$BASE_URL/api/settings/public"   'Skipper Detergents'
check "GET /api/sitemap.xml"       200 "$BASE_URL/api/sitemap.xml"       '<urlset'
check "GET /api/products validation" 400 "$BASE_URL/api/products?per_page=9999"

echo "---"
echo "PASS: $pass   FAIL: $fail"
[ "$fail" -eq 0 ]
```

- [ ] **Step 3: Make it executable and run**

Run:

```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
```

Expected: all 11 checks PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-test.sh
git commit -m "test: add curl smoke-test suite for public read API"
```

- [ ] **Step 5: Push and verify CI on PR / main**

Run:

```bash
git push -u origin feat/milestone-2a-read-api
```

Then either create a PR or (for solo dev) merge:

```bash
git checkout main
git merge feat/milestone-2a-read-api
git push
```

CI must go green (all unit + workers-pool tests pass on Ubuntu). If CI fails, fix inline before moving on.

---

## Definition of Done — Milestone 2a

- [ ] `pnpm test` passes on CI: `@skipper/shared` schemas + existing; `@skipper/api` unit pool + workers pool (new: products, categories, search, settings, sitemap, routes, rateLimit, db utils) — expect ~80–90 total tests.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm format:check` all clean.
- [ ] All 11 smoke-test checks pass against the live `workers.dev` URL.
- [ ] `/api/products` supports filters (category, brand, bulk_only, min/max price), sorts (newest, price_asc, price_desc, name_asc, popular), pagination (page, per_page ≤ 100).
- [ ] `/api/products/:slug` returns a product with `images` (primary first), `variants`, `bulk_tiers`, `category`.
- [ ] `/api/products/search?q=` uses FTS5 and returns empty array for no matches (not 404).
- [ ] `/api/categories` returns categories with `product_count` (only active).
- [ ] `/api/sitemap.xml` is valid XML with active products + categories + static pages.
- [ ] `/api/settings/public` exposes only whitelisted keys; `paystack_secret_key` never leaks.
- [ ] Rate limit of 100 req/min per IP is active on `/api/*`.
- [ ] No `any` types introduced; no string-concatenated SQL anywhere in the new code.

## What Milestone 2b depends on from 2a

1. `utils/db.ts` (first / all / run) — reused for order + payment writes.
2. `services/products.ts`'s `getProductBySlug` — needed by the order-creation validator to look up current prices.
3. `tests/helpers/db-fixtures.ts` — reused to seed integration tests.
4. The route-mounting pattern in `index.ts` — 2b adds `/api/orders`, `/api/payments`, `/api/upload`, `/api/webhooks/paystack` without duplicating middleware wiring.

Anything drifting from those invariants blocks 2b.
