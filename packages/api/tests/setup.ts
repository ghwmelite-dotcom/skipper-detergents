import { env, applyD1Migrations } from 'cloudflare:test';
import { beforeAll } from 'vitest';

// Apply all migrations from wrangler.toml's `migrations_dir` to the test D1
// once per test file, before any describe/beforeEach runs.
// `env.TEST_MIGRATIONS` is auto-injected by @cloudflare/vitest-pool-workers
// when a `migrations_dir` is set on the D1 binding in wrangler.toml.
beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
