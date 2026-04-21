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
          // Run all test files in a single worker instance. Without this,
          // per-test-file worker restarts trigger a miniflare R2 cleanup
          // assertion (Expected .sqlite, got .sqlite-shm) and sometimes
          // crash workerd entirely. Tests do their own data cleanup via
          // resetDatabase (beforeEach) and R2 list+delete (uploads).
          singleWorker: true,
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
