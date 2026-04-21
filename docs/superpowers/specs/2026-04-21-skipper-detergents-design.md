# Skipper Detergents — E-Commerce Platform Design Spec

**Date:** 2026-04-21
**Status:** Approved design, ready for implementation planning
**Owner:** ohwpstudios@gmail.com

---

## 1. Executive Summary

A production-grade, SEO-first e-commerce platform for **Skipper Detergents**, a Ghanaian household-essentials brand selling its own "Skipper" line alongside resold established brands (Omo, Ariel, Dettol, Softcare, etc.). Customers can buy single units or trigger bulk-quantity discounts. Checkout supports Paystack (card, mobile money, bank) and manual bank/mobile-money transfer with admin verification. A lightweight CMS lets the owner manage products, orders, categories, and settings.

**Primary market:** Ghana. **Currency:** GHS. **Delivery:** Accra + regional, with pickup option.

---

## 2. Scope

### 2.1 In scope for v1 (MVP + Bulk)

**Public storefront**

- Home, Shop (with category filtering, sorting, search), Product detail, Bulk ordering page, Cart, Checkout, Order confirmation, Order tracking, About, Contact, FAQ, 404, Privacy Policy

**Admin CMS**

- Login, Dashboard (KPIs + revenue chart), Products CRUD (with image upload, variants, bulk tiers), Categories CRUD, Orders list + detail (with manual payment verification), Settings, Activity log

**Payments**

- Paystack inline popup integration
- Manual bank/mobile-money transfer with proof image upload and admin verification workflow
- Webhook signature verification (HMAC-SHA-512)

**Bulk ordering**

- Tiered pricing model (min_qty / max_qty / unit_price per tier)
- Dedicated `/bulk` page filtering bulk-available products
- Cart-level auto-discount application based on quantity tiers
- Server-side re-validation of tier pricing at checkout submit

**Delivery**

- Two methods: pickup (free) or delivery (zoned flat fees)
- Two delivery zones to start: Greater Accra, Other Regions
- Free-text tracking field for optional third-party dispatch (Bolt, Yango, local courier)
- Customer-facing order tracking page keyed on order number + email

**SEO (full implementation required)**

- Dynamic meta tags (title, description, OG, Twitter cards) via `react-helmet-async`
- JSON-LD structured data: `Product`, `BreadcrumbList`, `Organization`, `WebSite` with `SearchAction`
- Canonical URLs on every public page
- Dynamic `sitemap.xml` generated from D1
- `robots.txt` allowing public routes, disallowing `/admin`, `/cart`, `/checkout`
- Prerendering of Home, Shop, Category, and Product pages at build time
- Image alt text enforced in admin UI
- Semantic HTML, single H1 per page, clean URL hierarchy

### 2.2 Deferred to phase 2 (separate spec + plan, post-launch)

- Blog/CMS (`blog_posts` table, rich-text editor, blog routes, blog admin)
- Product reviews (`reviews` table, review UI, aggregate rating)
- Newsletter signup + broadcasts (`newsletter_subscribers`)
- Public analytics dashboard (`page_views` table, charts)
- Staff roles and permissions beyond `super_admin`
- CSV product import
- PWA manifest + service worker + offline shell
- Transactional email deliverability hardening (DKIM/SPF/DMARC tuning)

### 2.3 Explicitly out of scope

- Customer accounts and logins (guest checkout only in v1)
- Multi-currency support (GHS only)
- Multi-language support (English only)
- Refund processing workflow (admin notes only; actual refund is manual outside the system)
- International shipping

---

## 3. System Architecture

### 3.1 Deployables

Three Cloudflare-hosted surfaces, one monorepo.

```
┌─────────────────────────┐      ┌─────────────────────────┐
│  apps/storefront        │      │  apps/admin             │
│  React SPA (Vite)       │      │  React SPA (Vite)       │
│  Cloudflare Pages       │      │  Cloudflare Pages       │
│  skipperdetergents.*    │      │  admin.skipperdeter.*   │
└──────────┬──────────────┘      └────────────┬────────────┘
           │                                   │
           └──────────────┬────────────────────┘
                          ▼
             ┌──────────────────────────┐
             │  packages/api            │
             │  Hono on Cloudflare      │
             │  Worker                  │
             │  api.skipperdeter.*      │
             └──┬───────┬───────┬───────┘
                │       │       │
              ┌─▼─┐   ┌─▼─┐   ┌─▼─┐
              │ D1│   │ R2│   │ KV│
              └───┘   └───┘   └───┘
```

**Rationale for two separate Pages deployments (not one SPA with route guards):**

- Customers never download admin JS (bundle size, LCP)
- Different CSP headers per surface
- Admin can be locked to allowlisted IPs later without affecting storefront
- Independent deploy cadence

### 3.2 Monorepo layout

```
skipper-detergents/
├── apps/
│   ├── storefront/          # Public React SPA
│   └── admin/               # Admin React SPA
├── packages/
│   ├── api/                 # Hono Worker + D1 schema + migrations
│   └── shared/              # TypeScript types + Zod schemas + constants
├── scripts/                 # seed-db, generate-sitemap, migrate
├── .github/workflows/       # deploy.yml (lint + type-check + deploy)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── CLAUDE.md                # Project-level Claude Code instructions
└── README.md
```

### 3.3 Tech stack (locked)

| Layer              | Choice                                              | Notes                                 |
| ------------------ | --------------------------------------------------- | ------------------------------------- |
| Frontend framework | React 18 + TypeScript (strict)                      |                                       |
| Build tool         | Vite 5                                              | `vite-plugin-prerender` for SEO pages |
| Styling            | Tailwind CSS 3 + shadcn/ui                          | CSS variables for design tokens       |
| Routing            | React Router v6                                     | File-less routing, lazy-loaded routes |
| Client state       | Zustand                                             | Cart, UI                              |
| Server state       | TanStack Query v5                                   | API caching, revalidation             |
| API framework      | Hono                                                | Cloudflare Workers runtime            |
| Database           | Cloudflare D1 (SQLite)                              | FTS5 virtual table for search         |
| Object storage     | Cloudflare R2                                       | Product images, payment proofs        |
| Cache / sessions   | Cloudflare KV                                       | JWT blacklist, rate-limit counters    |
| Auth               | Custom JWT via `jose`                               | Admin-only in v1                      |
| Password hashing   | `@noble/hashes` scrypt                              | bcrypt unavailable in Workers         |
| Payments           | Paystack API + inline popup (`@paystack/inline-js`) |                                       |
| Validation         | Zod (client + server)                               | Shared schemas in `packages/shared`   |
| Forms              | React Hook Form + Zod resolver                      |                                       |
| Charts             | Recharts                                            | Admin dashboard                       |
| Monorepo           | Turborepo + pnpm workspaces                         |                                       |
| CI/CD              | GitHub Actions                                      | Deploy via `wrangler`                 |

### 3.4 SEO approach decision

React SPA with `react-helmet-async` + full JSON-LD + dynamic sitemap is sufficient for Google in 2026 (crawler executes JS). For guaranteed LCP and index coverage, the following pages are **prerendered at build time** via `vite-plugin-prerender`:

- `/` (Home)
- `/shop` and `/shop/:category-slug`
- `/product/:slug` (generated for every product at build time)
- `/bulk`
- Static info pages (About, Contact, FAQ, Privacy)

Cart, Checkout, Order Tracking, and Order Confirmation are **not** prerendered (dynamic / private).

**Escape hatch (phase 2):** If Lighthouse/LCP or indexing isn't strong enough post-launch, migrate `apps/storefront` to Astro. API and admin are unaffected.

---

## 4. Data Model

### 4.1 MVP tables (all required at v1 launch)

| Table                | Purpose                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `categories`         | Product taxonomy, optional `parent_id` for nesting                                         |
| `products`           | Core catalog; includes `brand`, `is_bulk_available`, `is_featured`, SEO fields             |
| `product_images`     | Multiple images per product; `is_primary` flag; URLs to R2                                 |
| `product_variants`   | Size/scent variants; each has own SKU, stock, `price_adjustment`                           |
| `bulk_pricing_tiers` | Per-product quantity tiers: `min_quantity`, `max_quantity`, `unit_price`                   |
| `customers`          | Created on first guest checkout, keyed on email; accumulates `total_orders`, `total_spent` |
| `orders`             | Full order with payment state, delivery snapshot, tracking                                 |
| `order_items`        | Line items; price + bulk-tier snapshot at time of order                                    |
| `admin_users`        | Single admin in v1; schema retains `role` column for phase 2                               |
| `activity_log`       | Audit trail of every admin action (CRUD, status changes, payment confirmations, logins)    |
| `store_settings`     | Key-value config (store info, fees, bank/momo details, Paystack keys)                      |
| `delivery_zones`     | Region set → fee + estimated days                                                          |

### 4.2 Tables deferred to phase 2

`reviews`, `blog_posts`, `newsletter_subscribers`, `page_views`. Adding them post-launch is additive — no migration of existing tables needed.

### 4.3 Key data decisions

1. **IDs:** `lower(hex(randomblob(8)))` (16-char hex). Globally unique, readable in URLs where needed, stable.
2. **Order numbers (display):** Human-readable `SK-YYYYMMDD-NNNN`, unique, shown to customers and admin. The underlying `id` is still the hex token.
3. **Cart state:** Client-side only (Zustand + `localStorage`). Server has no cart table. Server re-validates every price, stock level, and bulk tier at `POST /api/orders` submit.
4. **Money:** Stored as `REAL` GHS in D1. Converted to pesewas (× 100) only at the Paystack API boundary in `services/paystack.ts`. Displayed as GHS with `Intl.NumberFormat('en-GH')`.
5. **Guest checkout:** Email is the customer identity. On checkout, upsert a `customers` row by email. No password, no customer login in v1.
6. **Soft vs hard delete:** Products use soft delete (`is_active = 0`). Orders are never deleted. Category delete is **blocked** by the API if any product references it (409 response with a message prompting the admin to re-assign products first). Admin user delete is hard delete, protected in API from deleting the last remaining super_admin.
7. **Bulk pricing resolution:** Deterministic — for quantity Q, pick the tier where `min_quantity <= Q <= (max_quantity OR infinity)`. If no tier matches, use product's `unit_price`. Resolved server-side at checkout; client uses it for UX display only.
8. **Stock management:** Decrement on order creation (even before payment), increment on cancellation. Explicitly tolerate slight overselling risk during Paystack payment window (3-minute gap) — stock is not decremented again on payment success. Low-stock email alert when `stock_quantity <= low_stock_threshold`.

### 4.4 Seed data

12 sample products across all six brief categories (Detergents & Laundry, Toilet Paper, Tissue, Paper Towels, Bathroom Accessories, Surface Cleaners). Mix of Skipper-branded and resold brands. At least 3 products with bulk pricing tiers configured. Owner replaces with real SKUs after launch.

Default `store_settings` seeded with placeholders: store email, phone, bank details, currency (GHS), tax_rate (0), delivery fees (Accra: GHS 15, Other: GHS 35), free-delivery threshold (GHS 200).

One admin user seeded from env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`) during first-time setup.

---

## 5. Key User Flows

### 5.1 Paystack checkout (happy path)

1. Customer fills checkout form (contact, delivery address, delivery method)
2. Client `POST /api/orders` with cart contents + delivery info + `payment_method: 'paystack'`
3. Server validates every item (price, stock, bulk tier), creates order with `status='pending'`, `payment_status='unpaid'`, returns `order_id` and `order_number`
4. Client `POST /api/payments/paystack/init` with `order_id`
5. Server calls Paystack `/transaction/initialize` with `amount` (pesewas), `email`, `reference`, `callback_url`, `metadata`, `channels: ['card','mobile_money','bank']`
6. Server returns `access_code` and `authorization_url`
7. Client opens Paystack popup (`@paystack/inline-js`)
8. Paystack processes payment, hits `/api/webhooks/paystack` (verified by HMAC-SHA-512)
9. Webhook handler is idempotent: checks if `order.payment_status` is already `paid`; if not, sets `payment_status='paid'`, `status='confirmed'`, logs activity, sends customer confirmation email
10. On popup success callback, client redirects to `/order/:order_number`
11. Order confirmation page fetches order by number + email, shows receipt

### 5.2 Manual bank transfer checkout

1. Same 1–3 as above but with `payment_method: 'manual_transfer'`
2. Response includes bank/MoMo details from `store_settings` and an R2 presigned upload URL
3. Customer sees instructions: "Transfer GHS X to {bank_details}, then upload proof below"
4. Customer uploads proof image → goes directly to R2 via presigned URL
5. Client `PATCH /api/orders/:id/proof` sets `manual_payment_proof_url`
6. Confirmation email sent: "We've received your order; we'll verify your payment within 24h"
7. Order tracking page shows "Awaiting payment verification"

### 5.3 Admin verifies manual payment

1. Admin opens Orders page, filter: `payment_method=manual_transfer AND payment_status=unpaid`
2. Opens individual order → `ManualPaymentVerifier` component shows order amount, customer details, zoomable proof image
3. Confirm button: `PATCH /api/admin/orders/:id/payment { action: 'confirm' }` → sets `payment_status='paid'`, `manual_payment_confirmed_at`, `manual_payment_confirmed_by`, `status='confirmed'`, logs activity, emails customer
4. Reject button opens modal requiring a reason → logs activity, emails customer with rejection reason; order remains `unpaid` (customer can re-upload)

### 5.4 Admin status progression

- Admin opens order detail, uses status dropdown: `pending → confirmed → processing → shipped → delivered → completed`
- Forward transitions only via dropdown; cancellation / refund are separate explicit buttons that require a reason
- `shipped` transition requires either a `tracking_number` (self-dispatch) or a `tracking_url` (third-party)
- Each transition writes to `activity_log` and triggers the corresponding customer email
- Order detail page shows a timeline of all status changes from `activity_log`

### 5.5 Customer order tracking (public)

- Route: `/track/:order_number`
- Requires order number + email match (simple anti-enumeration; no account needed)
- Shows: order summary, items, payment status, delivery status, status timeline, tracking number or link if shipped, estimated delivery

---

## 6. Security

### 6.1 Admin authentication

- JWT access token: 15-minute TTL, returned in login response, held in memory on admin client
- JWT refresh token: 7-day TTL, httpOnly + secure + sameSite=strict cookie
- Rotation on refresh: refresh call issues new access + new refresh, invalidates old refresh via KV blacklist
- Logout: clears cookie + blacklists refresh token in KV

### 6.2 Admin rate limiting

- Login: 5 attempts per 15 minutes per IP (KV counter)
- Failed attempts logged to `activity_log` with IP

### 6.3 Input validation

- Every API route validates body and params with Zod
- Client forms use same Zod schemas (from `packages/shared`) via React Hook Form
- Server rejects invalid requests with 400 + structured error

### 6.4 Database

- D1 `.bind()` parameterized queries only — zero string-concatenated SQL
- Least-privilege: API worker is the only service with D1 binding

### 6.5 Paystack

- Webhook signature verified with HMAC-SHA-512 using Paystack secret key before any DB writes
- Secret key stored as Cloudflare Workers secret, never in code
- Webhook handler is fully idempotent (safe to receive same event twice)

### 6.6 HTTP headers

- CORS allowlist: only `storefront_origin` + `admin_origin` on API
- CSP on storefront: strict, allows Paystack script domain
- CSP on admin: strict, no Paystack
- HSTS, X-Frame-Options `DENY`, X-Content-Type-Options `nosniff` on all surfaces

### 6.7 R2 uploads

- Presigned URLs only (no direct bucket access from client)
- Size limits enforced server-side (product images: 5MB, payment proofs: 3MB)
- MIME allowlist: `image/jpeg`, `image/png`, `image/webp` only
- Files namespaced by type: `products/{product_id}/{uuid}.{ext}`, `payment-proofs/{order_id}/{uuid}.{ext}`

### 6.8 Public rate limiting

- 100 requests/minute per IP on public endpoints (KV)
- 300 requests/minute per admin user on admin endpoints

---

## 7. Performance & Accessibility Baseline

### 7.1 Core Web Vitals targets

- LCP < 2.5s (prerendered pages), < 3.5s (dynamic pages)
- FID < 100ms
- CLS < 0.1

### 7.2 Image pipeline

- Product images uploaded to R2 at original resolution
- Served through Cloudflare Image Transforms with `srcset` (480w, 768w, 1024w, 1600w), WebP + AVIF with JPEG fallback
- `loading="lazy"` on all below-fold images
- Reserved aspect ratios (`aspect-ratio: 1/1` on product cards) to prevent CLS

### 7.3 Bundle budgets

- Storefront initial JS: < 150KB gzipped (excluding Paystack inline SDK loaded on checkout only)
- Admin initial JS: < 250KB gzipped

### 7.4 Accessibility

- WCAG AA minimum: 4.5:1 contrast for body text, 3:1 for large text and UI components
- 44×44px touch targets minimum
- Full keyboard navigation, visible focus states on every interactive element
- ARIA labels on icon-only buttons
- `prefers-reduced-motion` honored on all animations
- Form errors announced via `aria-live`
- Semantic HTML throughout (one `<h1>` per page, proper heading hierarchy)

---

## 8. Design System (Captain's Deck)

### 8.1 Color tokens

```css
--brand-navy: #0b2545; /* primary — headers, CTAs, nav */
--brand-navy-dark: #091c38; /* hover, active CTA */
--brand-cyan: #00b4d8; /* secondary — links, badges, accents */
--brand-cyan-deep: #0094b3; /* cyan hover */
--brand-red: #e63946; /* urgency — sale tags, errors in warning contexts */
--brand-sand: #f4ede0; /* warm surface, image backgrounds */
--brand-ivory: #fcfbf7; /* page background */

--neutral-900: #0f172a; /* body text on light */
--neutral-700: #334155; /* secondary text */
--neutral-500: #64748b; /* muted text */
--neutral-300: #cbd5e1; /* borders */
--neutral-100: #f1f5f9; /* dividers, subtle surfaces */

--success: #10b981;
--warning: #f59e0b;
--error: #dc2626;
```

### 8.2 Typography

- Display + body: **Inter** (self-hosted via `@fontsource/inter`) — weights 400, 500, 600, 700
- Mono (prices, SKUs): **JetBrains Mono** — weights 400, 500

### 8.3 Spacing, radii, shadows

- Base-8 spacing grid (`4, 8, 12, 16, 24, 32, 48, 64` via Tailwind's default scale)
- Radii: `8px` (inputs, small buttons), `12px` (cards, large buttons), `16px` (modals, hero blocks), `9999px` (pills, badges)
- Shadows: `sm` for cards at rest, `md` on card hover, `lg` on modals

### 8.4 Motion

- Durations: 150ms (micro — hover), 220ms (standard — enter/exit), 350ms (emphasis — modals, drawers)
- Easing: `ease-out` for entrances, `ease-in` for exits, spring for bulk-pricing-tier "Save X%" callouts
- All motion respects `prefers-reduced-motion: reduce` — replaced with opacity transitions only

---

## 9. Phase Plan & Execution Order

Each milestone is independently demoable and testable. A separate implementation plan is written for each; subsequent milestones can be re-prioritized after any one ships.

| #   | Milestone            | Output                                                                                                                                                                                                              |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Foundation**       | Monorepo scaffolded, `packages/shared` (types + Zod), `packages/api` Hono skeleton, D1 schema + seed, R2 + KV bindings, `wrangler.toml`, GitHub Actions deploy pipeline, initial commit                             |
| 2   | **Public API**       | All public endpoints (products, categories, search, checkout, Paystack init + webhook, manual-payment proof upload, order tracking, sitemap). Tested with Postman/curl before UI exists.                            |
| 3   | **Storefront shell** | Vite + React app, layout (Header/Footer/MobileNav), routing, SEO components (`SEOHead`, `JsonLd`, `Breadcrumbs`), Zustand cart, TanStack Query, error boundaries, skeleton loaders                                  |
| 4   | **Storefront pages** | Home, Shop + category pages, Product detail (bulk tier table + image gallery + variants), Bulk page, Cart, Checkout (multi-step), Order confirmation, Order tracking, static pages, 404                             |
| 5   | **Admin CMS**        | Login + JWT flow, Dashboard (KPIs + revenue chart), Products CRUD (image drag-drop to R2, variants, bulk tiers, SEO fields), Categories, Orders list + detail + manual-payment verification, Settings, Activity log |
| 6   | **Launch hardening** | Lighthouse pass, prerendering wired, CSP headers, transactional email (stub until provider chosen), DNS, production secrets, test orders end-to-end                                                                 |

---

## 10. Operational Unknowns (resolved during implementation)

These do not block the design. They need values during build and will be flagged in the milestone plans.

1. **Paystack account state.** Live keys or test keys for now? Plan assumes test keys; swap before launch.
2. **Domain.** Candidate: `skipperdetergents.com.gh`. Register + DNS setup TBD.
3. **Cloudflare account.** Must exist. D1 / R2 / KV resources created via `wrangler` as part of milestone 1.
4. **Email transactional provider.** Resend vs Mailgun vs Postmark. Plan scaffolds with a logging stub; real provider swapped in during milestone 6.
5. **Bank + MoMo details** for manual transfers. Entered once in admin Settings after deploy; seeded with placeholders.
6. **Admin credentials.** Seeded from env vars `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` during first setup.
7. **Warehouse/pickup address** for pickup option. Entered in Settings.

---

## 11. Definition of Done (v1 launch)

- [ ] Customer can browse the catalog, filter by category, search, and view a product detail page with working bulk pricing table, image gallery, and variants
- [ ] Customer can add single + bulk items to cart, reach checkout, and submit a real Paystack payment end-to-end (test mode)
- [ ] Customer can submit a manual-transfer order, upload proof, and see "awaiting verification" status
- [ ] Customer can track their order at `/track/:order_number` after entering their email
- [ ] Admin can log in, add/edit products with images uploaded to R2, configure bulk tiers and variants
- [ ] Admin can view orders, confirm/reject manual payments, update order status, add tracking numbers/URLs
- [ ] Admin dashboard shows today's revenue, order count, recent orders, top products, low-stock alerts
- [ ] Activity log records every admin action (CRUD, status changes, payment confirmations, logins) with IP
- [ ] Every public page has unique `<title>`, meta description, OG/Twitter tags, canonical URL
- [ ] `sitemap.xml` includes all active products, categories, and static pages with `lastmod`
- [ ] `robots.txt` correctly allows public and disallows admin/cart/checkout
- [ ] Product pages have valid Schema.org Product JSON-LD; breadcrumbs have BreadcrumbList JSON-LD
- [ ] Prerendered pages load in < 2.5s LCP on slow 4G (measured)
- [ ] Lighthouse score ≥ 90 on Performance, Accessibility, Best Practices, SEO for Home + Shop + Product pages
- [ ] Zero TypeScript errors in strict mode across the monorepo
- [ ] Paystack webhook signature verification tested with a forged request (rejects) and legit request (accepts)
- [ ] All forms validate client + server side with matching Zod schemas
- [ ] Site works end-to-end on Cloudflare Pages + Workers + D1 + R2 + KV in production

---

## 12. Open Future Work (phase 2 backlog)

1. Blog CMS (`blog_posts` table + TipTap rich-text editor + blog routes + blog admin)
2. Product reviews with moderation queue
3. Newsletter signup + transactional broadcasts
4. Public analytics dashboard using `page_views`
5. Staff roles (`admin`, `staff`) with permission matrix
6. CSV product bulk import
7. PWA manifest + service worker + offline cart
8. Customer accounts + order history (optional sign-up post-purchase)
9. Discount codes / promo codes
10. Abandoned cart recovery emails

---

**Approved:** Sections 1, 2, 3 of brainstorm walked through and approved in conversation 2026-04-21. Ready to proceed to implementation planning for milestone 1 (Foundation).
