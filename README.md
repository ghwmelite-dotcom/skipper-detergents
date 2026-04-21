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
