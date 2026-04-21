import { defineConfig } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: [
            'tests/response.test.ts',
            'tests/middleware.test.ts',
            'tests/health.test.ts',
            'tests/utils/**/*.test.ts',
            'tests/middleware/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      defineWorkersProject({
        test: {
          name: 'workers',
          include: ['tests/services/**/*.test.ts', 'tests/routes/**/*.test.ts'],
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
      }),
    ],
  },
});
