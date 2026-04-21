# Milestone 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a working Turborepo monorepo with a deployable Cloudflare Workers API skeleton that exposes a `/health` route, a `packages/shared` library of types and Zod schemas used by both API and future UIs, the complete D1 database schema and seed data for Skipper Detergents, all Cloudflare resource bindings wired up, and a CI pipeline that runs lint + type-check + tests on every push.

**Architecture:** pnpm workspaces + Turborepo orchestrator. Two packages in this milestone: `packages/shared` (framework-agnostic TS + Zod + Vitest) and `packages/api` (Hono on Cloudflare Workers, tested with `@cloudflare/vitest-pool-workers`). D1 is the primary data store; R2 and KV bindings are declared in `wrangler.toml` and exposed through a typed `Env` interface. No UI code yet — apps/storefront and apps/admin are created in milestones 3–5.

**Tech Stack:** pnpm 9, Turborepo 2, TypeScript 5.5 (strict), Hono 4, Zod 3, Vitest 2, `@cloudflare/vitest-pool-workers`, Wrangler 3, GitHub Actions.

**Spec reference:** `docs/superpowers/specs/2026-04-21-skipper-detergents-design.md`

---

## File Map

Files created in this milestone, grouped by responsibility:

**Root / monorepo**
- `package.json` — root scripts, devDependencies (turbo, typescript, prettier, eslint)
- `pnpm-workspace.yaml` — declares `packages/*`
- `turbo.json` — pipeline: lint, typecheck, test, build
- `tsconfig.base.json` — shared strict TS settings, extended by every package
- `.prettierrc` — formatting rules
- `.eslintrc.cjs` — lint rules
- `.gitignore` — already exists, extended if needed
- `README.md` — project overview and dev setup
- `CLAUDE.md` — project-level Claude Code instructions

**packages/shared** — pure TS library, zero Cloudflare deps, reused by every surface
- `package.json`
- `tsconfig.json` (extends root)
- `vitest.config.ts`
- `src/index.ts` — barrel export
- `src/constants.ts` — enums (order statuses, payment methods, currencies, delivery methods, user roles)
- `src/types.ts` — entity interfaces (Product, Category, Order, OrderItem, Customer, AdminUser, BulkPricingTier, ProductImage, ProductVariant, DeliveryZone, StoreSetting, ActivityLogEntry)
- `src/schemas.ts` — Zod schemas for API request/response validation
- `src/utils.ts` — `formatCurrency`, `slugify`, `generateOrderNumber`, `resolveBulkPrice`
- `tests/constants.test.ts`
- `tests/schemas.test.ts`
- `tests/utils.test.ts`

**packages/api** — Hono on Cloudflare Workers
- `package.json`
- `tsconfig.json` (extends root)
- `wrangler.toml` — bindings for D1, R2 (x2), KV (x3), env vars
- `vitest.config.ts` — uses `@cloudflare/vitest-pool-workers`
- `src/index.ts` — Hono app entry, middleware chain, `/health` route
- `src/types/env.ts` — typed `Env` interface for Worker bindings
- `src/middleware/cors.ts` — CORS allowlist
- `src/middleware/errorHandler.ts` — Hono `onError` handler producing consistent envelope
- `src/utils/response.ts` — `ok()` / `fail()` envelope helpers
- `src/db/schema.sql` — full MVP schema (matches spec §4)
- `src/db/seed.sql` — 6 categories, 12 products (with images, variants, tiers), 2 delivery zones, default store settings
- `src/db/migrations/0001_initial.sql` — mirror of `schema.sql` for production migration
- `tests/health.test.ts`
- `tests/middleware.test.ts`
- `tests/response.test.ts`

**CI**
- `.github/workflows/ci.yml` — lint + typecheck + test on every push
- `.github/workflows/deploy.yml` — wrangler deploy on main (wired but dormant until secrets configured)

---

## Prerequisites — user must run these once before Task 1

These cannot be automated (they require interactive Cloudflare authentication). The plan assumes they are already done. If not, execute before starting:

```bash
# 1. Install pnpm globally (if not installed)
npm install -g pnpm@9

# 2. Install wrangler globally (if not installed)
npm install -g wrangler@3

# 3. Authenticate with Cloudflare
wrangler login
```

Cloudflare **resource creation** (D1 database, R2 buckets, KV namespaces) is Task 17 of this plan and is done interactively during execution — not as a prerequisite.

---

## Task 1: Initialize monorepo root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "skipper-detergents",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "prettier --write \"**/*.{ts,tsx,md,json,yml,yaml}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json,yml,yaml}\""
  },
  "devDependencies": {
    "@types/node": "^22.5.0",
    "eslint": "^9.10.0",
    "prettier": "^3.3.3",
    "turbo": "^2.1.0",
    "typescript": "^5.5.4"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".wrangler/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Install dependencies and verify**

Run:
```bash
pnpm install
```
Expected: installs dev deps; creates `pnpm-lock.yaml`; no workspace packages yet (normal warning).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json pnpm-lock.yaml
git commit -m "chore: initialize pnpm workspace + turborepo"
```

---

## Task 2: Tooling configs + project CLAUDE.md + README

**Files:**
- Create: `.prettierrc`
- Create: `.eslintrc.cjs`
- Create: `CLAUDE.md`
- Create: `README.md`

- [ ] **Step 1: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 2: Create `.eslintrc.cjs`**

```javascript
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  },
  ignorePatterns: ['dist', 'node_modules', '.wrangler', 'coverage', '*.config.ts', '*.config.js'],
};
```

- [ ] **Step 3: Install ESLint TypeScript plugins**

Run:
```bash
pnpm add -D -w @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

- [ ] **Step 4: Create `CLAUDE.md` (project-level instructions)**

```markdown
# Skipper Detergents — Project Instructions

## Stack
- Monorepo: pnpm workspaces + Turborepo
- `packages/shared` — TS types + Zod schemas (framework-agnostic)
- `packages/api` — Hono on Cloudflare Workers, D1 + R2 + KV bindings
- `apps/storefront` — React SPA (milestones 3–4, Vite)
- `apps/admin` — React SPA (milestone 5, Vite)

## Commands
- `pnpm dev` — run all dev servers in parallel
- `pnpm test` — run all tests
- `pnpm typecheck` — strict TS check across the monorepo
- `pnpm lint` — ESLint
- `pnpm format` — Prettier write
- `wrangler d1 execute skipper-detergents-db --local --file=packages/api/src/db/schema.sql` — rebuild local DB

## Conventions
- TypeScript strict mode everywhere; zero `any` without justification comment
- All D1 queries use `.bind()` — never string-concatenate SQL
- All API request bodies validated with Zod from `packages/shared`
- Money stored as GHS REAL in D1; converted to pesewas only at Paystack boundary
- Commits: conventional commits (feat/fix/chore/docs/test/refactor)

## Spec
Design spec: `docs/superpowers/specs/2026-04-21-skipper-detergents-design.md`

## Current Milestone
See `docs/superpowers/plans/` for the active milestone plan.
```

- [ ] **Step 5: Create `README.md`**

```markdown
# Skipper Detergents

Production e-commerce platform for Skipper Detergents — a Ghanaian household-essentials brand selling detergents, toilet rolls, tissue, paper towels, and bathroom accessories. Supports single and bulk ordering with Paystack and manual-transfer checkout.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm + Turborepo |
| API | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Cache / sessions | Cloudflare KV |
| Shared types | TypeScript + Zod |
| Frontend (later milestones) | React 18 + Vite + Tailwind + shadcn/ui |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up local D1
pnpm --filter api db:setup

# 3. Run the API locally
pnpm dev

# Health check
curl http://localhost:8787/health
```

## Project Structure

```
├── packages/
│   ├── shared/   # Types, Zod schemas, constants, utils
│   └── api/      # Cloudflare Workers API
├── docs/
│   └── superpowers/
│       ├── specs/   # Design specs
│       └── plans/   # Milestone implementation plans
```

## Documentation
- Design spec: `docs/superpowers/specs/2026-04-21-skipper-detergents-design.md`
- Current plan: `docs/superpowers/plans/2026-04-21-milestone-1-foundation.md`
```

- [ ] **Step 6: Verify lint config loads**

Run:
```bash
pnpm exec eslint --print-config package.json > /dev/null && echo "ESLint config OK"
```
Expected: prints "ESLint config OK".

- [ ] **Step 7: Commit**

```bash
git add .prettierrc .eslintrc.cjs CLAUDE.md README.md package.json pnpm-lock.yaml
git commit -m "chore: add prettier, eslint, project CLAUDE.md, README"
```

---

## Task 3: Scaffold `packages/shared`

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@skipper/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Create `packages/shared/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create placeholder `packages/shared/src/index.ts`**

```typescript
export {};
```

- [ ] **Step 5: Install and verify**

Run:
```bash
pnpm install
pnpm --filter @skipper/shared typecheck
```
Expected: installs `zod` and `vitest`; typecheck passes with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/ pnpm-lock.yaml
git commit -m "feat(shared): scaffold packages/shared with zod + vitest"
```

---

## Task 4: `packages/shared` — constants

**Files:**
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/tests/constants.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/tests/constants.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  DELIVERY_METHODS,
  CURRENCY,
  ADMIN_ROLES,
} from '../src/constants';

describe('constants', () => {
  it('ORDER_STATUSES contains the full v1 lifecycle', () => {
    expect(ORDER_STATUSES).toEqual([
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'completed',
      'cancelled',
      'refunded',
    ]);
  });

  it('PAYMENT_METHODS contains paystack and manual_transfer', () => {
    expect(PAYMENT_METHODS).toEqual(['paystack', 'manual_transfer']);
  });

  it('PAYMENT_STATUSES contains the full state set', () => {
    expect(PAYMENT_STATUSES).toEqual(['unpaid', 'paid', 'refunded']);
  });

  it('DELIVERY_METHODS contains pickup and delivery', () => {
    expect(DELIVERY_METHODS).toEqual(['pickup', 'delivery']);
  });

  it('CURRENCY is GHS', () => {
    expect(CURRENCY).toBe('GHS');
  });

  it('ADMIN_ROLES contains super_admin and admin', () => {
    expect(ADMIN_ROLES).toEqual(['super_admin', 'admin']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @skipper/shared test
```
Expected: FAIL with "Cannot find module '../src/constants'".

- [ ] **Step 3: Implement `packages/shared/src/constants.ts`**

```typescript
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['paystack', 'manual_transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_METHODS = ['pickup', 'delivery'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const CURRENCY = 'GHS' as const;

export const ADMIN_ROLES = ['super_admin', 'admin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
```

- [ ] **Step 4: Update `packages/shared/src/index.ts`**

```typescript
export * from './constants';
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
pnpm --filter @skipper/shared test
```
Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/constants.ts packages/shared/src/index.ts packages/shared/tests/constants.test.ts
git commit -m "feat(shared): add domain constants (statuses, methods, roles)"
```

---

## Task 5: `packages/shared` — entity types

**Files:**
- Create: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/index.ts`

No tests — pure type declarations are compile-checked.

- [ ] **Step 1: Create `packages/shared/src/types.ts`**

```typescript
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DeliveryMethod,
  AdminRole,
} from './constants';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  weight_kg: number | null;
  is_active: boolean;
  created_at: string;
}

export interface BulkPricingTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  discount_percent: number | null;
  label: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  category_id: string;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  unit_price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  currency: string;
  stock_quantity: number;
  low_stock_threshold: number;
  weight_kg: number | null;
  dimensions_cm: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_bulk_available: boolean;
  bulk_minimum_qty: number;
  tags: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  avg_rating: number;
  review_count: number;
  total_sold: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  images: ProductImage[];
  variants: ProductVariant[];
  bulk_tiers: BulkPricingTier[];
}

export interface Customer {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  country: string;
  gps_address: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  is_bulk_order: boolean;
  bulk_tier_id: string | null;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paystack_reference: string | null;
  paystack_access_code: string | null;
  manual_payment_proof_url: string | null;
  manual_payment_confirmed_at: string | null;
  manual_payment_confirmed_by: string | null;
  subtotal: number;
  bulk_discount: number;
  delivery_fee: number;
  tax_amount: number;
  total_amount: number;
  delivery_method: DeliveryMethod;
  delivery_name: string;
  delivery_email: string;
  delivery_phone: string;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_region: string | null;
  delivery_gps: string | null;
  delivery_notes: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  regions: string;
  fee: number;
  estimated_days: string | null;
  is_active: boolean;
}

export interface StoreSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
  };
}
```

- [ ] **Step 2: Update `packages/shared/src/index.ts`**

```typescript
export * from './constants';
export * from './types';
```

- [ ] **Step 3: Verify typecheck passes**

Run:
```bash
pnpm --filter @skipper/shared typecheck
```
Expected: passes with no output.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/index.ts
git commit -m "feat(shared): add entity types for catalog + orders + admin"
```

---

## Task 6: `packages/shared` — Zod schemas

**Files:**
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/tests/schemas.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/tests/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  createOrderSchema,
  cartItemSchema,
  adminLoginSchema,
  productCreateSchema,
} from '../src/schemas';

describe('createOrderSchema', () => {
  const validOrder = {
    items: [
      { product_id: 'abc123', quantity: 2 },
    ],
    delivery_method: 'delivery' as const,
    delivery_name: 'Ama Owusu',
    delivery_email: 'ama@example.com',
    delivery_phone: '+233241234567',
    delivery_address: '14 Independence Ave',
    delivery_city: 'Accra',
    delivery_region: 'Greater Accra',
    payment_method: 'paystack' as const,
  };

  it('accepts a valid paystack delivery order', () => {
    expect(() => createOrderSchema.parse(validOrder)).not.toThrow();
  });

  it('requires at least one item', () => {
    expect(() =>
      createOrderSchema.parse({ ...validOrder, items: [] }),
    ).toThrow();
  });

  it('requires delivery_address when delivery_method is delivery', () => {
    expect(() =>
      createOrderSchema.parse({ ...validOrder, delivery_address: undefined }),
    ).toThrow();
  });

  it('does not require delivery_address for pickup', () => {
    const pickup = {
      ...validOrder,
      delivery_method: 'pickup' as const,
      delivery_address: undefined,
      delivery_city: undefined,
      delivery_region: undefined,
    };
    expect(() => createOrderSchema.parse(pickup)).not.toThrow();
  });

  it('rejects invalid email format', () => {
    expect(() =>
      createOrderSchema.parse({ ...validOrder, delivery_email: 'not-an-email' }),
    ).toThrow();
  });

  it('rejects non-positive quantity', () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        items: [{ product_id: 'abc123', quantity: 0 }],
      }),
    ).toThrow();
  });
});

describe('cartItemSchema', () => {
  it('accepts a valid cart item', () => {
    expect(() =>
      cartItemSchema.parse({ product_id: 'x', quantity: 1 }),
    ).not.toThrow();
  });

  it('accepts optional variant_id', () => {
    expect(() =>
      cartItemSchema.parse({ product_id: 'x', variant_id: 'v', quantity: 1 }),
    ).not.toThrow();
  });
});

describe('adminLoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(() =>
      adminLoginSchema.parse({ email: 'a@b.com', password: 'hunter2xx' }),
    ).not.toThrow();
  });

  it('rejects password shorter than 8 chars', () => {
    expect(() =>
      adminLoginSchema.parse({ email: 'a@b.com', password: 'short' }),
    ).toThrow();
  });
});

describe('productCreateSchema', () => {
  const validProduct = {
    name: 'Skipper Liquid Detergent',
    slug: 'skipper-liquid-detergent',
    description: 'A fresh clean for daily laundry.',
    category_id: 'cat123',
    unit_price: 45,
    stock_quantity: 100,
  };

  it('accepts a minimal valid product', () => {
    expect(() => productCreateSchema.parse(validProduct)).not.toThrow();
  });

  it('rejects negative price', () => {
    expect(() =>
      productCreateSchema.parse({ ...validProduct, unit_price: -1 }),
    ).toThrow();
  });

  it('requires a slug', () => {
    expect(() =>
      productCreateSchema.parse({ ...validProduct, slug: '' }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @skipper/shared test
```
Expected: FAIL with "Cannot find module '../src/schemas'".

- [ ] **Step 3: Implement `packages/shared/src/schemas.ts`**

```typescript
import { z } from 'zod';
import {
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  ADMIN_ROLES,
} from './constants';

export const cartItemSchema = z.object({
  product_id: z.string().min(1),
  variant_id: z.string().min(1).optional(),
  quantity: z.number().int().positive(),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const createOrderSchema = z
  .object({
    items: z.array(cartItemSchema).min(1),
    delivery_method: z.enum(DELIVERY_METHODS),
    delivery_name: z.string().min(1).max(200),
    delivery_email: z.string().email(),
    delivery_phone: z.string().min(7).max(20),
    delivery_address: z.string().min(1).max(500).optional(),
    delivery_city: z.string().min(1).max(100).optional(),
    delivery_region: z.string().min(1).max(100).optional(),
    delivery_gps: z.string().max(30).optional(),
    delivery_notes: z.string().max(1000).optional(),
    payment_method: z.enum(PAYMENT_METHODS),
  })
  .refine(
    (data) =>
      data.delivery_method === 'pickup' ||
      (data.delivery_address && data.delivery_city && data.delivery_region),
    {
      message: 'delivery_address, delivery_city, delivery_region are required for delivery orders',
      path: ['delivery_address'],
    },
  );
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  short_description: z.string().max(500).optional(),
  category_id: z.string().min(1),
  brand: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  unit_price: z.number().nonnegative(),
  compare_at_price: z.number().nonnegative().optional(),
  cost_price: z.number().nonnegative().optional(),
  stock_quantity: z.number().int().nonnegative(),
  low_stock_threshold: z.number().int().nonnegative().default(10),
  weight_kg: z.number().nonnegative().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_bulk_available: z.boolean().default(false),
  bulk_minimum_qty: z.number().int().positive().default(10),
  tags: z.string().optional(),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(300).optional(),
  seo_keywords: z.string().max(500).optional(),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const bulkPricingTierSchema = z
  .object({
    min_quantity: z.number().int().positive(),
    max_quantity: z.number().int().positive().nullable(),
    unit_price: z.number().nonnegative(),
    discount_percent: z.number().nonnegative().max(100).optional(),
    label: z.string().max(100).optional(),
  })
  .refine(
    (data) => data.max_quantity === null || data.max_quantity >= data.min_quantity,
    { message: 'max_quantity must be >= min_quantity', path: ['max_quantity'] },
  );
export type BulkPricingTierInput = z.infer<typeof bulkPricingTierSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  tracking_number: z.string().max(100).optional(),
  tracking_url: z.string().url().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const confirmManualPaymentSchema = z.object({
  action: z.enum(['confirm', 'reject']),
  reason: z.string().min(1).max(1000).optional(),
});
export type ConfirmManualPaymentInput = z.infer<typeof confirmManualPaymentSchema>;

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  parent_id: z.string().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(300).optional(),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const adminRoleSchema = z.enum(ADMIN_ROLES);
```

- [ ] **Step 4: Update `packages/shared/src/index.ts`**

```typescript
export * from './constants';
export * from './types';
export * from './schemas';
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
pnpm --filter @skipper/shared test
```
Expected: PASS — all schema tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/schemas.ts packages/shared/src/index.ts packages/shared/tests/schemas.test.ts
git commit -m "feat(shared): add zod schemas for orders, products, auth, admin"
```

---

## Task 7: `packages/shared` — utility helpers

**Files:**
- Create: `packages/shared/src/utils.ts`
- Create: `packages/shared/tests/utils.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/tests/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  slugify,
  generateOrderNumber,
  resolveBulkPrice,
} from '../src/utils';
import type { BulkPricingTier } from '../src/types';

describe('formatCurrency', () => {
  it('formats whole numbers with 2 decimal places', () => {
    expect(formatCurrency(45)).toBe('GHS 45.00');
  });

  it('formats fractional values', () => {
    expect(formatCurrency(12.5)).toBe('GHS 12.50');
  });

  it('separates thousands', () => {
    expect(formatCurrency(1234.5)).toBe('GHS 1,234.50');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('GHS 0.00');
  });
});

describe('slugify', () => {
  it('lowercases and replaces spaces', () => {
    expect(slugify('Skipper Liquid Detergent')).toBe('skipper-liquid-detergent');
  });

  it('strips punctuation', () => {
    expect(slugify("Bounty 6-Roll (Kitchen)")).toBe('bounty-6-roll-kitchen');
  });

  it('collapses repeated hyphens', () => {
    expect(slugify('a  --  b')).toBe('a-b');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('handles non-ascii by stripping', () => {
    expect(slugify('Café Crème')).toBe('caf-crme');
  });
});

describe('generateOrderNumber', () => {
  it('uses SK prefix and includes the date', () => {
    const now = new Date('2026-04-21T10:00:00Z');
    const n = generateOrderNumber(now, 7);
    expect(n).toBe('SK-20260421-0007');
  });

  it('zero-pads the sequence to 4 digits', () => {
    const now = new Date('2026-04-21T10:00:00Z');
    expect(generateOrderNumber(now, 1)).toBe('SK-20260421-0001');
    expect(generateOrderNumber(now, 12)).toBe('SK-20260421-0012');
    expect(generateOrderNumber(now, 1234)).toBe('SK-20260421-1234');
  });
});

describe('resolveBulkPrice', () => {
  const tiers: BulkPricingTier[] = [
    {
      id: 't1',
      product_id: 'p1',
      min_quantity: 10,
      max_quantity: 49,
      unit_price: 38,
      discount_percent: 15,
      label: 'Bulk',
      created_at: '',
    },
    {
      id: 't2',
      product_id: 'p1',
      min_quantity: 50,
      max_quantity: null,
      unit_price: 30,
      discount_percent: 33,
      label: 'Wholesale',
      created_at: '',
    },
  ];

  it('returns base price when no tier matches', () => {
    expect(resolveBulkPrice(5, 45, tiers)).toEqual({
      unit_price: 45,
      tier: null,
    });
  });

  it('returns tier price when quantity falls inside a bounded tier', () => {
    expect(resolveBulkPrice(20, 45, tiers)).toEqual({
      unit_price: 38,
      tier: tiers[0],
    });
  });

  it('returns the unbounded tier when quantity exceeds all max_quantity', () => {
    expect(resolveBulkPrice(100, 45, tiers)).toEqual({
      unit_price: 30,
      tier: tiers[1],
    });
  });

  it('returns base price when tier list is empty', () => {
    expect(resolveBulkPrice(100, 45, [])).toEqual({
      unit_price: 45,
      tier: null,
    });
  });

  it('respects the lower bound of the first tier', () => {
    expect(resolveBulkPrice(10, 45, tiers)).toEqual({
      unit_price: 38,
      tier: tiers[0],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @skipper/shared test
```
Expected: FAIL with "Cannot find module '../src/utils'".

- [ ] **Step 3: Implement `packages/shared/src/utils.ts`**

```typescript
import type { BulkPricingTier } from './types';
import { CURRENCY } from './constants';

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${CURRENCY} ${formatted}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateOrderNumber(date: Date, sequence: number): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `SK-${y}${m}${d}-${seq}`;
}

export interface ResolvedBulkPrice {
  unit_price: number;
  tier: BulkPricingTier | null;
}

export function resolveBulkPrice(
  quantity: number,
  basePrice: number,
  tiers: BulkPricingTier[],
): ResolvedBulkPrice {
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  for (const tier of sorted) {
    const withinLower = quantity >= tier.min_quantity;
    const withinUpper = tier.max_quantity === null || quantity <= tier.max_quantity;
    if (withinLower && withinUpper) {
      return { unit_price: tier.unit_price, tier };
    }
  }
  return { unit_price: basePrice, tier: null };
}
```

- [ ] **Step 4: Update `packages/shared/src/index.ts`**

```typescript
export * from './constants';
export * from './types';
export * from './schemas';
export * from './utils';
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
pnpm --filter @skipper/shared test
```
Expected: PASS — all util tests green, all previous tests still green.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils.ts packages/shared/src/index.ts packages/shared/tests/utils.test.ts
git commit -m "feat(shared): add formatCurrency, slugify, order number, bulk-price resolver"
```

---

## Task 8: Scaffold `packages/api`

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/wrangler.toml`
- Create: `packages/api/vitest.config.ts`
- Create: `packages/api/src/index.ts`
- Create: `packages/api/src/types/env.ts`

- [ ] **Step 1: Create `packages/api/package.json`**

```json
{
  "name": "@skipper/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:setup": "wrangler d1 execute skipper-detergents-db --local --file=./src/db/schema.sql && wrangler d1 execute skipper-detergents-db --local --file=./src/db/seed.sql",
    "db:migrate": "wrangler d1 migrations apply skipper-detergents-db --remote",
    "db:reset:local": "wrangler d1 execute skipper-detergents-db --local --command=\"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';\" && pnpm run db:setup"
  },
  "dependencies": {
    "@skipper/shared": "workspace:*",
    "hono": "^4.6.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "@cloudflare/workers-types": "^4.20240925.0",
    "vitest": "^2.1.0",
    "wrangler": "^3.80.0"
  }
}
```

- [ ] **Step 2: Create `packages/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "types": ["@cloudflare/workers-types", "vitest/globals"],
    "paths": {
      "@skipper/shared": ["../shared/src/index.ts"]
    }
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Create `packages/api/wrangler.toml` (placeholder IDs — filled in Task 17)**

```toml
name = "skipper-api"
main = "src/index.ts"
compatibility_date = "2026-04-20"
compatibility_flags = ["nodejs_compat"]
workers_dev = true

# Local dev serves at http://localhost:8787 by default

[vars]
APP_ENV = "development"
STOREFRONT_ORIGIN = "http://localhost:5173"
ADMIN_ORIGIN = "http://localhost:5174"

[[d1_databases]]
binding = "DB"
database_name = "skipper-detergents-db"
database_id = "PLACEHOLDER_FILL_IN_TASK_17"

[[r2_buckets]]
binding = "R2_PRODUCTS"
bucket_name = "skipper-products"

[[r2_buckets]]
binding = "R2_PROOFS"
bucket_name = "skipper-payment-proofs"

[[kv_namespaces]]
binding = "KV_SESSIONS"
id = "PLACEHOLDER_FILL_IN_TASK_17"

[[kv_namespaces]]
binding = "KV_RATE_LIMIT"
id = "PLACEHOLDER_FILL_IN_TASK_17"

[[kv_namespaces]]
binding = "KV_CACHE"
id = "PLACEHOLDER_FILL_IN_TASK_17"

# Secrets (set with `wrangler secret put <NAME>`):
#   JWT_SECRET
#   PAYSTACK_SECRET_KEY
#   PAYSTACK_WEBHOOK_SECRET
```

- [ ] **Step 4: Create `packages/api/vitest.config.ts`**

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          compatibilityDate: '2026-04-20',
          compatibilityFlags: ['nodejs_compat'],
        },
      },
    },
  },
});
```

- [ ] **Step 5: Create `packages/api/src/types/env.ts`**

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
}
```

- [ ] **Step 6: Create placeholder `packages/api/src/index.ts`**

```typescript
import { Hono } from 'hono';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.text('Skipper API'));

export default app;
```

- [ ] **Step 7: Install and verify typecheck**

Run:
```bash
pnpm install
pnpm --filter @skipper/api typecheck
```
Expected: installs deps; typecheck passes.

- [ ] **Step 8: Commit**

```bash
git add packages/api/ pnpm-lock.yaml
git commit -m "feat(api): scaffold Hono worker with D1/R2/KV bindings"
```

---

## Task 9: API response envelope

**Files:**
- Create: `packages/api/src/utils/response.ts`
- Create: `packages/api/tests/response.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/response.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ok, fail } from '../src/utils/response';

describe('response envelope', () => {
  it('ok() wraps data in a success envelope', () => {
    const body = ok({ id: 'x' });
    expect(body).toEqual({ success: true, data: { id: 'x' } });
  });

  it('ok() includes meta when provided', () => {
    const body = ok([1, 2], { page: 1, per_page: 20, total: 2 });
    expect(body).toEqual({
      success: true,
      data: [1, 2],
      meta: { page: 1, per_page: 20, total: 2 },
    });
  });

  it('fail() produces an error envelope with code and message', () => {
    const body = fail('VALIDATION_ERROR', 'invalid email');
    expect(body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'invalid email' },
    });
  });

  it('fail() includes details when provided', () => {
    const body = fail('VALIDATION_ERROR', 'bad input', { field: 'email' });
    expect(body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'bad input',
        details: { field: 'email' },
      },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @skipper/api test
```
Expected: FAIL with "Cannot find module '../src/utils/response'".

- [ ] **Step 3: Implement `packages/api/src/utils/response.ts`**

```typescript
import type { ApiResponse } from '@skipper/shared';

export function ok<T>(
  data: T,
  meta?: { page?: number; per_page?: number; total?: number },
): ApiResponse<T> {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return body;
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  const body: ApiResponse<never> = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) {
    body.error!.details = details;
  }
  return body;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm --filter @skipper/api test
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/utils/response.ts packages/api/tests/response.test.ts
git commit -m "feat(api): add ok/fail response envelope helpers"
```

---

## Task 10: CORS middleware

**Files:**
- Create: `packages/api/src/middleware/cors.ts`
- Create: `packages/api/tests/middleware.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/middleware.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { corsMiddleware } from '../src/middleware/cors';
import type { Env } from '../src/types/env';

function buildApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.use('*', corsMiddleware);
  app.get('/ping', (c) => c.json({ pong: true }));
  return app;
}

const env = {
  STOREFRONT_ORIGIN: 'https://storefront.example',
  ADMIN_ORIGIN: 'https://admin.example',
} as unknown as Env;

describe('corsMiddleware', () => {
  it('allows requests from STOREFRONT_ORIGIN', async () => {
    const app = buildApp();
    const res = await app.request(
      '/ping',
      { method: 'GET', headers: { Origin: 'https://storefront.example' } },
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://storefront.example',
    );
  });

  it('allows requests from ADMIN_ORIGIN', async () => {
    const app = buildApp();
    const res = await app.request(
      '/ping',
      { method: 'GET', headers: { Origin: 'https://admin.example' } },
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://admin.example',
    );
  });

  it('rejects other origins (no ACAO header echoed)', async () => {
    const app = buildApp();
    const res = await app.request(
      '/ping',
      { method: 'GET', headers: { Origin: 'https://evil.example' } },
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('responds to OPTIONS preflight with allowed methods', async () => {
    const app = buildApp();
    const res = await app.request(
      '/ping',
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://storefront.example',
          'Access-Control-Request-Method': 'POST',
        },
      },
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @skipper/api test
```
Expected: FAIL with "Cannot find module '../src/middleware/cors'".

- [ ] **Step 3: Implement `packages/api/src/middleware/cors.ts`**

```typescript
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';

export const corsMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const origin = c.req.header('Origin');
  const allowlist = [c.env.STOREFRONT_ORIGIN, c.env.ADMIN_ORIGIN].filter(Boolean);
  const isAllowed = origin && allowlist.includes(origin);

  if (c.req.method === 'OPTIONS') {
    if (isAllowed) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin!,
          'Access-Control-Allow-Methods': ALLOWED_METHODS,
          'Access-Control-Allow-Headers': ALLOWED_HEADERS,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }
    return new Response(null, { status: 204 });
  }

  await next();

  if (isAllowed) {
    c.res.headers.set('Access-Control-Allow-Origin', origin!);
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
    c.res.headers.append('Vary', 'Origin');
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm --filter @skipper/api test
```
Expected: PASS — 4 CORS tests plus earlier response tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/middleware/cors.ts packages/api/tests/middleware.test.ts
git commit -m "feat(api): add CORS middleware with env-driven allowlist"
```

---

## Task 11: Error handler

**Files:**
- Create: `packages/api/src/middleware/errorHandler.ts`
- Modify: `packages/api/tests/middleware.test.ts`

- [ ] **Step 1: Append failing tests to `packages/api/tests/middleware.test.ts`**

First, add these imports to the existing imports block at the top of the file:

```typescript
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/errorHandler';
```

Then append this describe block at the bottom of the file, after the existing `describe('corsMiddleware', ...)`:

```typescript
describe('errorHandler', () => {
  function buildApp() {
    const app = new Hono<{ Bindings: Env }>();
    app.onError(errorHandler);
    return app;
  }

  it('returns 500 INTERNAL with generic message for unknown errors', async () => {
    const app = buildApp();
    app.get('/boom', () => {
      throw new Error('database on fire');
    });
    const res = await app.request('/boom', {}, {} as Env);
    expect(res.status).toBe(500);
    const body = await res.json<{
      success: boolean;
      error: { code: string; message: string };
    }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).not.toContain('database on fire');
  });

  it('preserves HTTPException status and message', async () => {
    const app = buildApp();
    app.get('/forbidden', () => {
      throw new HTTPException(403, { message: 'nope' });
    });
    const res = await app.request('/forbidden', {}, {} as Env);
    expect(res.status).toBe(403);
    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.message).toBe('nope');
  });

  it('converts ZodError to 400 VALIDATION_ERROR with field details', async () => {
    const app = buildApp();
    app.get('/bad', () => {
      const schema = z.object({ email: z.string().email() });
      schema.parse({ email: 'not-email' });
      return new Response();
    });
    const res = await app.request('/bad', {}, {} as Env);
    expect(res.status).toBe(400);
    const body = await res.json<{
      error: { code: string; details: Array<{ path: string[] }> };
    }>();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @skipper/api test
```
Expected: FAIL with "Cannot find module '../src/middleware/errorHandler'".

- [ ] **Step 3: Implement `packages/api/src/middleware/errorHandler.ts`**

```typescript
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { Env } from '../types/env';
import { fail } from '../utils/response';

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      fail(
        'VALIDATION_ERROR',
        'Invalid request payload',
        err.issues.map((i) => ({ path: i.path, message: i.message })),
      ),
      400,
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      fail(statusToCode(err.status), err.message || 'Request failed'),
      err.status,
    );
  }

  console.error('Unhandled error:', err);
  return c.json(fail('INTERNAL', 'Something went wrong'), 500);
};

function statusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL' : 'ERROR';
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm --filter @skipper/api test
```
Expected: PASS — all middleware tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/middleware/errorHandler.ts packages/api/tests/middleware.test.ts
git commit -m "feat(api): add error handler for Zod + HTTPException + unknown"
```

---

## Task 12: Hono app entry + `/health` route

**Files:**
- Modify: `packages/api/src/index.ts`
- Create: `packages/api/tests/health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/tests/health.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../src/index';

describe('GET /health', () => {
  it('returns 200 with ok envelope', async () => {
    const res = await app.request('/health', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      success: boolean;
      data: { status: string; timestamp: string };
    }>();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(typeof body.data.timestamp).toBe('string');
  });

  it('includes an ISO-8601 timestamp', async () => {
    const res = await app.request('/health', {}, env);
    const body = await res.json<{ data: { timestamp: string } }>();
    const parsed = new Date(body.data.timestamp);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});

describe('GET /', () => {
  it('returns a plain text marker', async () => {
    const res = await app.request('/', {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Skipper');
  });
});

describe('GET /unknown-route', () => {
  it('returns 404 with NOT_FOUND envelope', async () => {
    const res = await app.request('/unknown-route', {}, env);
    expect(res.status).toBe(404);
    const body = await res.json<{
      success: boolean;
      error: { code: string };
    }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @skipper/api test
```
Expected: FAIL — `/health` returns 404 (route not defined yet), and the root route returns "Skipper API" so `GET /` passes but health and not-found envelope tests fail.

- [ ] **Step 3: Update `packages/api/src/index.ts`**

```typescript
import { Hono } from 'hono';
import type { Env } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { ok, fail } from './utils/response';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);
app.onError(errorHandler);

app.get('/', (c) => c.text('Skipper API'));

app.get('/health', (c) =>
  c.json(
    ok({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: c.env.APP_ENV,
    }),
  ),
);

app.notFound((c) => c.json(fail('NOT_FOUND', 'Route not found'), 404));

export default app;
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm --filter @skipper/api test
```
Expected: PASS — all health, middleware, response tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/index.ts packages/api/tests/health.test.ts
git commit -m "feat(api): wire middleware, add /health route and 404 handler"
```

---

## Task 13: D1 schema

**Files:**
- Create: `packages/api/src/db/schema.sql`

No automated test in this task — schema is verified when we run it against a local D1 in Task 17. We TDD the queries that consume it in milestone 2.

- [ ] **Step 1: Create `packages/api/src/db/schema.sql`**

```sql
-- ============================================================
-- Skipper Detergents — D1 schema (MVP)
-- Spec: docs/superpowers/specs/2026-04-21-skipper-detergents-design.md §4
-- ============================================================

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  image_url     TEXT,
  parent_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  seo_title     TEXT,
  seo_description TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT NOT NULL,
  short_description   TEXT,
  category_id         TEXT NOT NULL REFERENCES categories(id),
  brand               TEXT,
  sku                 TEXT UNIQUE,
  barcode             TEXT,
  unit_price          REAL NOT NULL,
  compare_at_price    REAL,
  cost_price          REAL,
  currency            TEXT NOT NULL DEFAULT 'GHS',
  stock_quantity      INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  weight_kg           REAL,
  dimensions_cm       TEXT,
  is_active           INTEGER NOT NULL DEFAULT 1,
  is_featured         INTEGER NOT NULL DEFAULT 0,
  is_bulk_available   INTEGER NOT NULL DEFAULT 0,
  bulk_minimum_qty    INTEGER NOT NULL DEFAULT 10,
  tags                TEXT,
  seo_title           TEXT,
  seo_description     TEXT,
  seo_keywords        TEXT,
  avg_rating          REAL NOT NULL DEFAULT 0,
  review_count        INTEGER NOT NULL DEFAULT 0,
  total_sold          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_bulk ON products(is_bulk_available);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- FTS5 virtual table for product search (milestone 2 populates this)
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,
  description,
  short_description,
  tags,
  content='products',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, name, description, short_description, tags)
  VALUES (new.rowid, new.name, new.description, new.short_description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, name, description, short_description, tags)
  VALUES ('delete', old.rowid, old.name, old.description, old.short_description, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, name, description, short_description, tags)
  VALUES ('delete', old.rowid, old.name, old.description, old.short_description, old.tags);
  INSERT INTO products_fts(rowid, name, description, short_description, tags)
  VALUES (new.rowid, new.name, new.description, new.short_description, new.tags);
END;

-- ------------------------------------------------------------
-- PRODUCT IMAGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- ------------------------------------------------------------
-- PRODUCT VARIANTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  sku              TEXT UNIQUE,
  price_adjustment REAL NOT NULL DEFAULT 0,
  stock_quantity   INTEGER NOT NULL DEFAULT 0,
  weight_kg        REAL,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

-- ------------------------------------------------------------
-- BULK PRICING TIERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bulk_pricing_tiers (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity     INTEGER NOT NULL,
  max_quantity     INTEGER,
  unit_price       REAL NOT NULL,
  discount_percent REAL,
  label            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product ON bulk_pricing_tiers(product_id);

-- ------------------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email         TEXT UNIQUE,
  first_name    TEXT,
  last_name     TEXT,
  phone         TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city          TEXT,
  region        TEXT,
  country       TEXT NOT NULL DEFAULT 'Ghana',
  gps_address   TEXT,
  total_orders  INTEGER NOT NULL DEFAULT 0,
  total_spent   REAL NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  order_number                TEXT NOT NULL UNIQUE,
  customer_id                 TEXT REFERENCES customers(id),
  status                      TEXT NOT NULL DEFAULT 'pending',
  payment_method              TEXT NOT NULL,
  payment_status              TEXT NOT NULL DEFAULT 'unpaid',
  paystack_reference          TEXT,
  paystack_access_code        TEXT,
  manual_payment_proof_url    TEXT,
  manual_payment_confirmed_at TEXT,
  manual_payment_confirmed_by TEXT REFERENCES admin_users(id),
  subtotal                    REAL NOT NULL,
  bulk_discount               REAL NOT NULL DEFAULT 0,
  delivery_fee                REAL NOT NULL DEFAULT 0,
  tax_amount                  REAL NOT NULL DEFAULT 0,
  total_amount                REAL NOT NULL,
  delivery_method             TEXT NOT NULL DEFAULT 'delivery',
  delivery_name               TEXT NOT NULL,
  delivery_email              TEXT NOT NULL,
  delivery_phone              TEXT NOT NULL,
  delivery_address            TEXT,
  delivery_city               TEXT,
  delivery_region             TEXT,
  delivery_gps                TEXT,
  delivery_notes              TEXT,
  tracking_number             TEXT,
  tracking_url                TEXT,
  estimated_delivery          TEXT,
  delivered_at                TEXT,
  ip_address                  TEXT,
  user_agent                  TEXT,
  notes                       TEXT,
  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ------------------------------------------------------------
-- ORDER ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL REFERENCES products(id),
  variant_id    TEXT REFERENCES product_variants(id),
  product_name  TEXT NOT NULL,
  variant_name  TEXT,
  sku           TEXT,
  quantity      INTEGER NOT NULL,
  unit_price    REAL NOT NULL,
  is_bulk_order INTEGER NOT NULL DEFAULT 0,
  bulk_tier_id  TEXT REFERENCES bulk_pricing_tiers(id),
  line_total    REAL NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ------------------------------------------------------------
-- ADMIN USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- ACTIVITY LOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  admin_id    TEXT REFERENCES admin_users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     TEXT,
  ip_address  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_admin ON activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- ------------------------------------------------------------
-- STORE SETTINGS (key/value)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- DELIVERY ZONES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_zones (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name           TEXT NOT NULL,
  regions        TEXT NOT NULL,
  fee            REAL NOT NULL,
  estimated_days TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------
-- ORDER NUMBER SEQUENCE (day-scoped counter)
-- One row per YYYYMMDD date string, maintained by API logic.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_number_sequence (
  day       TEXT PRIMARY KEY,
  next_seq  INTEGER NOT NULL DEFAULT 1
);
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/db/schema.sql
git commit -m "feat(api): add D1 MVP schema with FTS5 + order-number sequence"
```

---

## Task 14: D1 seed data

**Files:**
- Create: `packages/api/src/db/seed.sql`

- [ ] **Step 1: Create `packages/api/src/db/seed.sql`**

```sql
-- ============================================================
-- Skipper Detergents — seed data (development)
-- Run AFTER schema.sql. Safe to re-run: uses INSERT OR IGNORE / OR REPLACE.
-- ============================================================

-- ------------------------------------------------------------
-- STORE SETTINGS
-- ------------------------------------------------------------
INSERT OR REPLACE INTO store_settings (key, value) VALUES
  ('store_name', 'Skipper Detergents'),
  ('store_tagline', 'Premium Cleaning & Bathroom Essentials'),
  ('store_email', 'orders@skipperdetergents.com.gh'),
  ('store_phone', '+233 20 000 0000'),
  ('currency', 'GHS'),
  ('tax_rate', '0'),
  ('delivery_fee_accra', '15'),
  ('delivery_fee_other', '35'),
  ('free_delivery_threshold', '200'),
  ('manual_payment_details', 'MTN MoMo: 024 000 0000 / GCB Bank: 1234567890 — Skipper Detergents Ltd'),
  ('pickup_address', 'TBD — enter in Admin Settings after launch'),
  ('paystack_public_key', ''),
  ('paystack_secret_key', '');

-- ------------------------------------------------------------
-- DELIVERY ZONES
-- ------------------------------------------------------------
INSERT OR IGNORE INTO delivery_zones (id, name, regions, fee, estimated_days, is_active) VALUES
  ('zone_accra', 'Greater Accra', '["Greater Accra"]', 15, '1-2 days', 1),
  ('zone_other', 'Other Regions', '["Ashanti","Volta","Central","Eastern","Western","Northern","Upper East","Upper West","Bono","Ahafo","Bono East","Oti","Savannah","North East","Western North"]', 35, '3-5 days', 1);

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order, seo_title, seo_description) VALUES
  ('cat_detergents', 'Detergents & Laundry', 'detergents-laundry', 'Premium liquid and powder detergents, fabric softeners, and stain removers.', 1, 'Buy Detergents Online in Ghana | Skipper Detergents', 'Shop premium liquid & powder detergents with fast Accra delivery. Bulk pricing available for offices and households.'),
  ('cat_toilet', 'Toilet Paper & Rolls', 'toilet-paper', 'Soft, strong, quilted toilet rolls for home and office.', 2, 'Toilet Paper & Rolls Online | Skipper Detergents Ghana', 'Order toilet rolls online in Ghana. Single packs and bulk cartons with fast delivery across Accra and beyond.'),
  ('cat_tissue', 'Tissue Paper', 'tissue-paper', 'Facial and pocket tissues for every room.', 3, 'Tissue Paper Ghana | Skipper Detergents', 'Buy facial and pocket tissue paper online. Bulk discounts for offices, schools, and hospitality.'),
  ('cat_paper_towels', 'Paper Towels', 'paper-towels', 'Kitchen rolls and heavy-duty paper towels.', 4, 'Paper Towels Online Ghana | Skipper Detergents', 'Kitchen paper towels and industrial rolls delivered across Ghana.'),
  ('cat_bathroom', 'Bathroom Accessories', 'bathroom-accessories', 'Toilet brushes, soap dispensers, bathroom mats, and more.', 5, 'Bathroom Accessories Ghana | Skipper Detergents', 'Shop bathroom accessories online — dispensers, brushes, mats.'),
  ('cat_surface', 'Surface Cleaners', 'surface-cleaners', 'All-purpose cleaners, glass cleaners, floor disinfectants.', 6, 'Surface Cleaners Ghana | Skipper Detergents', 'Disinfectants and surface cleaners for every home and office.');

-- ------------------------------------------------------------
-- PRODUCTS (12 sample SKUs — mix of Skipper and resold brands)
-- ------------------------------------------------------------
INSERT OR IGNORE INTO products (
  id, name, slug, description, short_description, category_id, brand, sku,
  unit_price, compare_at_price, stock_quantity, low_stock_threshold, weight_kg,
  is_active, is_featured, is_bulk_available, bulk_minimum_qty, tags,
  seo_title, seo_description, seo_keywords
) VALUES
  ('prod_skipper_2l', 'Skipper Liquid Detergent 2L', 'skipper-liquid-detergent-2l', 'Our flagship concentrated liquid detergent. Tough on stains, gentle on fabrics. Suitable for both hand and machine wash. Fresh ocean scent.', 'Concentrated liquid detergent, 2L, ocean scent.', 'cat_detergents', 'Skipper', 'SK-LIQ-2L', 45.00, 55.00, 240, 20, 2.1, 1, 1, 1, 10, 'liquid,detergent,laundry,fresh,skipper', 'Skipper Liquid Detergent 2L | Buy Online Ghana', 'Our flagship 2L concentrated liquid detergent. Free Accra delivery over GHS 200. Bulk pricing available.', 'liquid detergent ghana, skipper detergent'),
  ('prod_skipper_pw', 'Skipper Powder Detergent 4kg', 'skipper-powder-detergent-4kg', 'Heavy-duty powder detergent for the toughest loads. 4kg family pack. Stain-lifting enzymes and brighteners.', '4kg powder detergent, family pack.', 'cat_detergents', 'Skipper', 'SK-PWD-4KG', 68.00, 85.00, 180, 15, 4.2, 1, 1, 1, 5, 'powder,detergent,laundry,skipper,family', 'Skipper Powder Detergent 4kg Ghana', 'Shop Skipper powder detergent 4kg online. Bulk discounts for 5+ packs.', 'powder detergent ghana, skipper 4kg'),
  ('prod_ariel_3kg', 'Ariel Powder Detergent 3kg', 'ariel-powder-detergent-3kg', 'Trusted stain-removal power from Ariel. 3kg pack for regular laundry.', 'Ariel powder detergent, 3kg.', 'cat_detergents', 'Ariel', 'AR-PWD-3KG', 62.00, NULL, 95, 10, 3.2, 1, 0, 1, 5, 'ariel,powder,detergent,laundry', 'Ariel Powder Detergent 3kg Ghana | Skipper Detergents', 'Buy Ariel powder detergent 3kg online in Ghana.', 'ariel ghana, ariel 3kg'),
  ('prod_omo_2l', 'Omo Liquid Detergent 2L', 'omo-liquid-detergent-2l', 'Omo 2L liquid — the household standard.', 'Omo liquid detergent, 2L.', 'cat_detergents', 'Omo', 'OM-LIQ-2L', 44.00, NULL, 140, 10, 2.1, 1, 0, 1, 10, 'omo,liquid,detergent', 'Omo Liquid Detergent 2L Ghana', 'Buy Omo 2L liquid detergent online in Ghana.', 'omo detergent ghana'),
  ('prod_softcare_10', 'Softcare Toilet Roll — 10 Pack', 'softcare-toilet-roll-10-pack', 'Soft, strong, 2-ply toilet rolls. 10-pack for regular use.', '10-pack 2-ply toilet rolls.', 'cat_toilet', 'Softcare', 'SC-TR-10', 35.00, 42.00, 520, 40, 1.4, 1, 1, 1, 5, 'toilet roll,softcare,2-ply', 'Softcare Toilet Roll 10-Pack | Skipper Detergents Ghana', 'Buy Softcare toilet rolls 10-pack online. Bulk pricing on 5+ packs.', 'toilet roll ghana, softcare'),
  ('prod_skipper_tr24', 'Skipper Toilet Roll — 24 Pack Carton', 'skipper-toilet-roll-24-carton', 'Full carton of 24 premium Skipper toilet rolls. Soft, 3-ply, unscented.', '24-roll carton, 3-ply Skipper.', 'cat_toilet', 'Skipper', 'SK-TR-24', 78.00, 95.00, 210, 15, 3.5, 1, 1, 1, 5, 'toilet roll,skipper,carton,3-ply', 'Skipper 24-Roll Carton | Wholesale Ghana', 'Skipper 24-roll carton with wholesale pricing for offices.', 'skipper toilet roll, wholesale toilet roll ghana'),
  ('prod_premier_tissue', 'Premier Facial Tissue Box 200-Sheet', 'premier-facial-tissue-box-200-sheet', 'Premium 2-ply facial tissue box, 200 sheets.', '200-sheet facial tissue.', 'cat_tissue', 'Premier', 'PR-FT-200', 12.00, NULL, 680, 50, 0.28, 1, 0, 1, 20, 'tissue,facial,premier', 'Premier Facial Tissue 200-Sheet Ghana', 'Buy Premier facial tissue 200-sheet boxes online. Office bulk discounts.', 'facial tissue ghana'),
  ('prod_bounty_6', 'Bounty Kitchen Paper Towel 6-Roll', 'bounty-kitchen-paper-towel-6-roll', 'Absorbent heavy-duty kitchen rolls, 6-pack.', '6-pack kitchen paper towels.', 'cat_paper_towels', 'Bounty', 'BT-KP-6', 42.00, 50.00, 150, 12, 1.8, 1, 0, 1, 10, 'paper towel,bounty,kitchen', 'Bounty Kitchen Paper Towel 6-Pack Ghana', 'Bounty 6-pack kitchen rolls with bulk discounts available.', 'kitchen paper towel ghana'),
  ('prod_harpic', 'Harpic Toilet Cleaner 750ml', 'harpic-toilet-cleaner-750ml', 'Powerful toilet bowl cleaner. Kills 99.9% of germs.', '750ml toilet cleaner.', 'cat_surface', 'Harpic', 'HR-TC-750', 28.00, NULL, 220, 15, 0.85, 1, 0, 1, 12, 'harpic,cleaner,toilet,disinfectant', 'Harpic Toilet Cleaner 750ml Ghana', 'Harpic 750ml toilet cleaner online with Accra delivery.', 'harpic ghana, toilet cleaner'),
  ('prod_dettol_500', 'Dettol Surface Spray 500ml', 'dettol-surface-spray-500ml', 'All-surface disinfectant spray. Kills 99.9% of bacteria.', '500ml disinfectant spray.', 'cat_surface', 'Dettol', 'DE-SS-500', 32.00, NULL, 175, 12, 0.6, 1, 1, 0, 10, 'dettol,disinfectant,surface,spray', 'Dettol Surface Spray 500ml Ghana', 'Dettol 500ml all-surface disinfectant online in Ghana.', 'dettol surface spray ghana'),
  ('prod_bath_brush', 'Skipper Toilet Brush + Holder', 'skipper-toilet-brush-holder', 'Sleek minimalist toilet brush with self-draining holder.', 'Toilet brush with holder.', 'cat_bathroom', 'Skipper', 'SK-TB-01', 38.00, NULL, 90, 8, 0.45, 1, 0, 0, 10, 'toilet brush,bathroom,skipper', 'Skipper Toilet Brush + Holder Ghana', 'Skipper modern toilet brush and holder online in Ghana.', 'toilet brush ghana'),
  ('prod_soap_disp', 'Skipper Soap Dispenser 350ml', 'skipper-soap-dispenser-350ml', 'Refillable pump soap dispenser, 350ml, matte finish.', 'Refillable 350ml soap dispenser.', 'cat_bathroom', 'Skipper', 'SK-SD-350', 24.00, 32.00, 110, 10, 0.3, 1, 1, 0, 10, 'soap dispenser,bathroom,skipper', 'Skipper Soap Dispenser 350ml Ghana', 'Buy Skipper refillable soap dispensers online in Ghana.', 'soap dispenser ghana');

-- ------------------------------------------------------------
-- PRODUCT IMAGES (one placeholder primary image per product)
-- Real images uploaded via admin UI in milestone 5.
-- ------------------------------------------------------------
INSERT OR IGNORE INTO product_images (id, product_id, url, alt_text, sort_order, is_primary) VALUES
  ('img_sk_2l', 'prod_skipper_2l', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Skipper+Liquid+2L', 'Skipper Liquid Detergent 2L bottle', 0, 1),
  ('img_sk_pw', 'prod_skipper_pw', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Skipper+Powder+4kg', 'Skipper Powder Detergent 4kg bag', 0, 1),
  ('img_ariel', 'prod_ariel_3kg', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Ariel+3kg', 'Ariel Powder Detergent 3kg bag', 0, 1),
  ('img_omo', 'prod_omo_2l', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Omo+2L', 'Omo Liquid Detergent 2L bottle', 0, 1),
  ('img_sc_10', 'prod_softcare_10', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Softcare+10-Pack', 'Softcare toilet roll 10-pack', 0, 1),
  ('img_sk_tr24', 'prod_skipper_tr24', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Skipper+24-Carton', 'Skipper 24-roll carton', 0, 1),
  ('img_premier', 'prod_premier_tissue', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Premier+Tissue', 'Premier facial tissue box', 0, 1),
  ('img_bounty', 'prod_bounty_6', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Bounty+6-Pack', 'Bounty kitchen paper towel 6-pack', 0, 1),
  ('img_harpic', 'prod_harpic', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Harpic+750ml', 'Harpic toilet cleaner 750ml', 0, 1),
  ('img_dettol', 'prod_dettol_500', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Dettol+Spray', 'Dettol surface spray 500ml', 0, 1),
  ('img_brush', 'prod_bath_brush', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Toilet+Brush', 'Skipper toilet brush with holder', 0, 1),
  ('img_disp', 'prod_soap_disp', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Soap+Dispenser', 'Skipper soap dispenser 350ml', 0, 1);

-- ------------------------------------------------------------
-- BULK PRICING TIERS
-- Covers 6 bulk-available products, 2 tiers each.
-- ------------------------------------------------------------
INSERT OR IGNORE INTO bulk_pricing_tiers (id, product_id, min_quantity, max_quantity, unit_price, discount_percent, label) VALUES
  -- Skipper Liquid 2L
  ('blk_sk2l_1', 'prod_skipper_2l', 10, 49, 38.00, 15, 'Bulk'),
  ('blk_sk2l_2', 'prod_skipper_2l', 50, NULL, 33.00, 27, 'Wholesale'),
  -- Skipper Powder 4kg
  ('blk_skpw_1', 'prod_skipper_pw', 5, 19, 58.00, 15, 'Bulk'),
  ('blk_skpw_2', 'prod_skipper_pw', 20, NULL, 50.00, 26, 'Wholesale'),
  -- Ariel 3kg
  ('blk_ar_1', 'prod_ariel_3kg', 5, 19, 55.00, 11, 'Bulk'),
  ('blk_ar_2', 'prod_ariel_3kg', 20, NULL, 48.00, 23, 'Wholesale'),
  -- Omo 2L
  ('blk_omo_1', 'prod_omo_2l', 10, 49, 39.00, 11, 'Bulk'),
  ('blk_omo_2', 'prod_omo_2l', 50, NULL, 35.00, 20, 'Wholesale'),
  -- Softcare 10-pack
  ('blk_sc_1', 'prod_softcare_10', 5, 19, 28.00, 20, 'Bulk'),
  ('blk_sc_2', 'prod_softcare_10', 20, NULL, 24.00, 31, 'Wholesale'),
  -- Skipper 24-roll carton
  ('blk_tr24_1', 'prod_skipper_tr24', 5, 19, 68.00, 13, 'Bulk'),
  ('blk_tr24_2', 'prod_skipper_tr24', 20, NULL, 60.00, 23, 'Wholesale'),
  -- Premier tissue
  ('blk_pt_1', 'prod_premier_tissue', 20, 99, 9.50, 21, 'Office Bulk'),
  ('blk_pt_2', 'prod_premier_tissue', 100, NULL, 8.00, 33, 'Wholesale'),
  -- Bounty 6-pack
  ('blk_bt_1', 'prod_bounty_6', 10, 49, 36.00, 14, 'Bulk'),
  ('blk_bt_2', 'prod_bounty_6', 50, NULL, 32.00, 24, 'Wholesale'),
  -- Harpic
  ('blk_hr_1', 'prod_harpic', 12, 49, 24.00, 14, 'Case'),
  ('blk_hr_2', 'prod_harpic', 50, NULL, 21.00, 25, 'Wholesale');

-- ------------------------------------------------------------
-- PRODUCT VARIANTS (a couple of examples to exercise the schema)
-- ------------------------------------------------------------
INSERT OR IGNORE INTO product_variants (id, product_id, name, sku, price_adjustment, stock_quantity, is_active) VALUES
  ('var_sk2l_1l', 'prod_skipper_2l', '1L Bottle', 'SK-LIQ-1L', -20, 300, 1),
  ('var_sk2l_5l', 'prod_skipper_2l', '5L Jug', 'SK-LIQ-5L', 45, 80, 1),
  ('var_disp_black', 'prod_soap_disp', 'Matte Black', 'SK-SD-350-BLK', 0, 55, 1),
  ('var_disp_white', 'prod_soap_disp', 'Matte White', 'SK-SD-350-WHT', 0, 55, 1);

-- Note: admin_users is NOT seeded here. The admin bootstrap utility
-- lives in milestone 5 (auth implementation) and writes a real
-- scrypt-hashed credential from ADMIN_EMAIL + ADMIN_PASSWORD env vars.
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/db/seed.sql
git commit -m "feat(api): add seed data (6 categories, 12 products, bulk tiers, zones, settings)"
```

---

## Task 15: Migration 0001_initial

**Files:**
- Create: `packages/api/src/db/migrations/0001_initial.sql`

- [ ] **Step 1: Copy schema into first migration**

Create `packages/api/src/db/migrations/0001_initial.sql` as a byte-identical copy of `packages/api/src/db/schema.sql`.

Run:
```bash
cp "packages/api/src/db/schema.sql" "packages/api/src/db/migrations/0001_initial.sql"
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/db/migrations/0001_initial.sql
git commit -m "feat(api): add migration 0001_initial mirroring schema"
```

---

## Task 16: Run typecheck + test across the monorepo

**Files:** none — verification only.

- [ ] **Step 1: Run typecheck at the root**

Run:
```bash
pnpm typecheck
```
Expected: both `@skipper/shared` and `@skipper/api` typecheck cleanly.

- [ ] **Step 2: Run tests at the root**

Run:
```bash
pnpm test
```
Expected: all tests pass in `@skipper/shared` and `@skipper/api`.

- [ ] **Step 3: Run lint at the root**

Run:
```bash
pnpm lint
```
Expected: zero lint errors.

- [ ] **Step 4: If any of the above fail, fix inline before moving on.**

Typical issues and fixes:
- Missing `workspace:*` resolution in `@skipper/api` — run `pnpm install` from the repo root.
- TypeScript can't find `@skipper/shared` — confirm `paths` in `packages/api/tsconfig.json` points to `../shared/src/index.ts`.
- Vitest can't find D1 in tests — confirm `wrangler.toml` is referenced in `packages/api/vitest.config.ts`.

---

## Task 17: Create Cloudflare resources + wire real IDs

**Files:**
- Modify: `packages/api/wrangler.toml`

**Note:** This task requires interactive `wrangler login` and produces live Cloudflare resources. Run each command yourself and paste the returned IDs into `wrangler.toml`.

- [ ] **Step 1: Confirm you are logged in**

Run:
```bash
wrangler whoami
```
Expected: shows your Cloudflare account email. If not, run `wrangler login`.

- [ ] **Step 2: Create the D1 database**

Run:
```bash
wrangler d1 create skipper-detergents-db
```
Expected output contains:
```
✅ Successfully created DB 'skipper-detergents-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Copy the `database_id` value.

- [ ] **Step 3: Create the R2 buckets**

Run:
```bash
wrangler r2 bucket create skipper-products
wrangler r2 bucket create skipper-payment-proofs
```
Expected: `Created bucket 'skipper-products'` and `Created bucket 'skipper-payment-proofs'`.

- [ ] **Step 4: Create the KV namespaces**

Run each and copy the `id` from each response:
```bash
wrangler kv namespace create SESSIONS
wrangler kv namespace create RATE_LIMIT
wrangler kv namespace create CACHE
```
Expected output for each: `id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`.

- [ ] **Step 5: Update `packages/api/wrangler.toml`**

Replace every `PLACEHOLDER_FILL_IN_TASK_17` with the real IDs from steps 2 and 4. The final `[[d1_databases]]` and `[[kv_namespaces]]` blocks should look like:

```toml
[[d1_databases]]
binding = "DB"
database_name = "skipper-detergents-db"
database_id = "<paste from step 2>"

[[kv_namespaces]]
binding = "KV_SESSIONS"
id = "<paste from step 4 — SESSIONS>"

[[kv_namespaces]]
binding = "KV_RATE_LIMIT"
id = "<paste from step 4 — RATE_LIMIT>"

[[kv_namespaces]]
binding = "KV_CACHE"
id = "<paste from step 4 — CACHE>"
```

- [ ] **Step 6: Apply schema + seed to local D1**

Run:
```bash
pnpm --filter @skipper/api db:setup
```
Expected: two lines of "Executed N commands" — one from `schema.sql`, one from `seed.sql`.

- [ ] **Step 7: Verify seed data loaded**

Run:
```bash
wrangler d1 execute skipper-detergents-db --local --command="SELECT COUNT(*) AS n FROM products;"
```
Expected: `n = 12`.

```bash
wrangler d1 execute skipper-detergents-db --local --command="SELECT COUNT(*) AS n FROM categories;"
```
Expected: `n = 6`.

```bash
wrangler d1 execute skipper-detergents-db --local --command="SELECT COUNT(*) AS n FROM bulk_pricing_tiers;"
```
Expected: `n = 18`.

- [ ] **Step 8: Start the dev server and curl `/health`**

Run in one terminal:
```bash
pnpm --filter @skipper/api dev
```
In another terminal:
```bash
curl http://localhost:8787/health
```
Expected: `{"success":true,"data":{"status":"ok","timestamp":"...","env":"development"}}`.

Stop the dev server with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add packages/api/wrangler.toml
git commit -m "chore(api): wire live Cloudflare resource IDs (D1, R2, KV)"
```

---

## Task 18: Apply schema to remote D1

**Files:** none — infrastructure step.

- [ ] **Step 1: Apply schema to the remote database**

Run:
```bash
wrangler d1 execute skipper-detergents-db --remote --file=packages/api/src/db/schema.sql
```
Expected: "Executed N commands in X ms".

- [ ] **Step 2: Apply seed to the remote database (dev only — skip in production)**

For the initial build the remote database is effectively a staging copy. Seed it so subsequent milestones can test end-to-end against real Cloudflare:

```bash
wrangler d1 execute skipper-detergents-db --remote --file=packages/api/src/db/seed.sql
```
Expected: "Executed N commands".

- [ ] **Step 3: Verify remote data**

Run:
```bash
wrangler d1 execute skipper-detergents-db --remote --command="SELECT COUNT(*) AS n FROM products;"
```
Expected: `n = 12`.

- [ ] **Step 4: No commit — this task only affects Cloudflare state**

---

## Task 19: GitHub Actions — CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint

      - run: pnpm typecheck

      - run: pnpm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline (lint, typecheck, test)"
```

---

## Task 20: GitHub Actions — deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

This workflow is wired but dormant until secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are added to the repo settings. It only runs on pushes to `main`.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'packages/api/**'
      - 'packages/shared/**'
      - '.github/workflows/deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm --filter @skipper/api typecheck

      - run: pnpm --filter @skipper/api test

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: packages/api
          command: deploy
```

- [ ] **Step 2: Add a README note about required repo secrets**

Append to `README.md`, under a new `## Deployment` section:

```markdown
## Deployment

Deployment is gated by GitHub Actions on push to `main`. The workflow
needs two repository secrets configured under
**Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — scoped to Workers Scripts, D1, R2, KV Edit permissions
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard

Until these are set the deploy workflow fails with a clear error; CI still
runs on every push.

Worker secrets (not GitHub secrets) are set via Wrangler:

```bash
wrangler secret put JWT_SECRET
wrangler secret put PAYSTACK_SECRET_KEY
wrangler secret put PAYSTACK_WEBHOOK_SECRET
```

These are populated during milestone 2 (public API) and milestone 5 (admin auth).
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: add Cloudflare deploy workflow + README deployment notes"
```

---

## Task 21: Definition of Done verification

**Files:** none — verification only.

- [ ] **Step 1: Confirm all monorepo commands pass from a clean install**

```bash
rm -rf node_modules packages/*/node_modules
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```
Expected: all four commands return exit code 0.

- [ ] **Step 2: Confirm `/health` responds locally via wrangler dev**

In one terminal:
```bash
pnpm --filter @skipper/api dev
```
In another:
```bash
curl -s http://localhost:8787/health | grep -q '"success":true' && echo HEALTH_OK
curl -s http://localhost:8787/ | grep -q 'Skipper' && echo ROOT_OK
curl -s -o /dev/null -w '%{http_code}' http://localhost:8787/nope
```
Expected: prints `HEALTH_OK`, then `ROOT_OK`, then `404` on the last line.

Stop the dev server.

- [ ] **Step 3: Confirm seed data is queryable locally**

```bash
wrangler d1 execute skipper-detergents-db --local --command="SELECT slug, unit_price FROM products ORDER BY unit_price LIMIT 3;"
```
Expected: three product rows with slug + unit_price columns (the three cheapest products).

- [ ] **Step 4: Confirm git state is clean**

```bash
git status
```
Expected: "nothing to commit, working tree clean".

- [ ] **Step 5: Summary check against milestone 1 outputs**

Walk the milestone 1 row in `docs/superpowers/specs/2026-04-21-skipper-detergents-design.md §9` and confirm every bullet is done:

- [x] Monorepo scaffolded (Tasks 1–2)
- [x] `packages/shared` with types + Zod (Tasks 3–7)
- [x] `packages/api` Hono skeleton (Tasks 8–12)
- [x] D1 schema + seed (Tasks 13–15)
- [x] R2 + KV bindings wired (Task 17)
- [x] `wrangler.toml` with real IDs (Task 17)
- [x] GitHub Actions CI + deploy pipeline (Tasks 19–20)
- [x] Local dev server returns 200 on `/health` (Task 21 step 2)

If any bullet is not checked, add or fix the corresponding task before declaring milestone 1 done.

---

## What milestone 2 depends on from milestone 1

When milestone 2 (Public API) begins, the following must already be true:

1. `pnpm install && pnpm test && pnpm typecheck` all pass on a clean clone.
2. `wrangler dev` in `packages/api` serves `/health` with a 200 JSON envelope.
3. `DB`, `R2_PRODUCTS`, `R2_PROOFS`, `KV_SESSIONS`, `KV_RATE_LIMIT`, `KV_CACHE` are typed on `Env` and usable from routes.
4. `@skipper/shared` exports `ORDER_STATUSES`, `PAYMENT_METHODS`, `createOrderSchema`, `productCreateSchema`, `resolveBulkPrice`, `generateOrderNumber`, and every entity type.
5. Local D1 contains 6 categories, 12 products, 18 bulk tiers, 2 delivery zones, 13 store_settings rows.

Any drift from those invariants blocks milestone 2 — fix here, not there.
