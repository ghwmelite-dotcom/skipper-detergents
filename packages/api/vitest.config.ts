import { defineConfig } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';

export default defineConfig({
  test: {
    projects: [
      // Unit tests — pure TypeScript, no Workers runtime needed
      {
        test: {
          name: 'unit',
          include: ['tests/response.test.ts', 'tests/middleware.test.ts'],
          environment: 'node',
        },
      },
      // Integration tests — require Cloudflare Workers runtime
      defineWorkersProject({
        test: {
          name: 'workers',
          include: ['tests/health.test.ts'],
          poolOptions: {
            workers: {
              wrangler: { configPath: './wrangler.toml' },
              miniflare: {
                compatibilityDate: '2024-12-30',
                compatibilityFlags: ['nodejs_compat'],
              },
            },
          },
        },
      }),
    ],
  },
});
