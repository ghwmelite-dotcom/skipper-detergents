# Skipper Detergents

Production e-commerce platform for Skipper Detergents — a Ghanaian household-essentials brand selling detergents, toilet rolls, tissue, paper towels, and bathroom accessories. Supports single and bulk ordering with Paystack and manual-transfer checkout.

## Stack

| Layer                       | Tech                                   |
| --------------------------- | -------------------------------------- |
| Monorepo                    | pnpm + Turborepo                       |
| API                         | Hono on Cloudflare Workers             |
| Database                    | Cloudflare D1 (SQLite)                 |
| Storage                     | Cloudflare R2                          |
| Cache / sessions            | Cloudflare KV                          |
| Shared types                | TypeScript + Zod                       |
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

## Deployment

Deployment is gated by GitHub Actions on push to `main`. The workflow needs two repository secrets configured under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — scoped to Workers Scripts, D1, R2, KV Edit permissions
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard

Until these are set the deploy workflow fails with a clear error; CI still runs on every push.

Worker secrets (not GitHub secrets) are set via Wrangler:

```bash
wrangler secret put JWT_SECRET
wrangler secret put PAYSTACK_SECRET_KEY
wrangler secret put PAYSTACK_WEBHOOK_SECRET
```

These are populated during milestone 2 (public API) and milestone 5 (admin auth).

## Documentation

- Design spec: `docs/superpowers/specs/2026-04-21-skipper-detergents-design.md`
- Current plan: `docs/superpowers/plans/2026-04-21-milestone-1-foundation.md`
