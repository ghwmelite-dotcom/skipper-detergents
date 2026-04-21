import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { corsMiddleware } from '../src/middleware/cors';
import type { Env } from '../src/types/env';

function buildApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.use('*', corsMiddleware);
  app.get('/ping', (c) => c.json({ pong: true }));
  return app;
}

const env = {
  STOREFRONT_ORIGIN: 'https://storefront.example',
  ADMIN_ORIGIN: 'https://admin.example',
} as unknown as Env;

describe('corsMiddleware', () => {
  it('allows requests from STOREFRONT_ORIGIN', async () => {
    const app = buildApp();
    const res = await app.request(
      '/ping',
      { method: 'GET', headers: { Origin: 'https://storefront.example' } },
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://storefront.example');
  });

  it('allows requests from ADMIN_ORIGIN', async () => {
    const app = buildApp();
    const res = await app.request(
      '/ping',
      { method: 'GET', headers: { Origin: 'https://admin.example' } },
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://admin.example');
  });

  it('rejects other origins (no ACAO header echoed)', async () => {
    const app = buildApp();
    const res = await app.request(
      '/ping',
      { method: 'GET', headers: { Origin: 'https://evil.example' } },
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('responds to OPTIONS preflight with allowed methods', async () => {
    const app = buildApp();
    const res = await app.request(
      '/ping',
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://storefront.example',
          'Access-Control-Request-Method': 'POST',
        },
      },
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
