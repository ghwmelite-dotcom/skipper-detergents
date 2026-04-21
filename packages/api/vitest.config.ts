import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

// Single-pool config: every test runs inside Miniflare with cloudflare:test bindings.
// Pure-function tests (no cloudflare:test imports) run fine here — just with more overhead.
// See memory/project_environment.md for the Windows+OneDrive workerd issue that
// prevents this from starting locally; Linux CI runs it cleanly.
export default defineWorkersConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
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
});
