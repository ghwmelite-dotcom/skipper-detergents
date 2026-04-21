import path from 'node:path';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

// Single-pool config: every test runs inside Miniflare with cloudflare:test bindings.
// Pure-function tests (no cloudflare:test imports) run fine here — just with more overhead.
// See memory/project_environment.md for the Windows+OneDrive workerd issue that
// prevents this from starting locally; Linux CI runs it cleanly.
export default defineWorkersConfig(async () => {
  const migrationsPath = path.join(__dirname, 'src/db/migrations');
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      include: ['tests/**/*.test.ts'],
      setupFiles: ['./tests/setup.ts'],
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.toml' },
          // Disable per-test isolated storage — miniflare's SQLite-backed
          // R2 cleanup hits an "Expected .sqlite, got .sqlite-shm" assertion
          // when R2 tests leak between test files. Tests do their own
          // cleanup (resetDatabase in beforeEach, R2 list+delete in uploads).
          isolatedStorage: false,
          miniflare: {
            compatibilityDate: '2026-04-20',
            compatibilityFlags: ['nodejs_compat'],
            d1Databases: ['DB'],
            r2Buckets: ['R2_PRODUCTS', 'R2_PROOFS'],
            kvNamespaces: ['KV_SESSIONS', 'KV_RATE_LIMIT', 'KV_CACHE'],
            bindings: {
              TEST_MIGRATIONS: migrations,
            },
          },
        },
      },
    },
  };
});
