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
