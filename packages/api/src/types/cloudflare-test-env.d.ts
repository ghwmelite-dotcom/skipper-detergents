import type { Env } from './env';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    // Auto-injected by @cloudflare/vitest-pool-workers when wrangler.toml's
    // D1 binding has `migrations_dir` set. Contains the migration files as
    // D1Migration objects, consumed by applyD1Migrations().
    TEST_MIGRATIONS: D1Migration[];
  }
}
