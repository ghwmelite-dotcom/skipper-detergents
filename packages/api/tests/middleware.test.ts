import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { corsMiddleware } from '../src/middleware/cors';
import { errorHandler } from '../src/middleware/errorHandler';
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

describe('errorHandler', () => {
  function buildApp() {
    const app = new Hono<{ Bindings: Env }>();
    app.onError(errorHandler);
    return app;
  }

  it('returns 500 INTERNAL with generic message for unknown errors', async () => {
    const app = buildApp();
    app.get('/boom', () => {
      throw new Error('database on fire');
    });
    const res = await app.request('/boom', {}, {} as Env);
    expect(res.status).toBe(500);
    const body = await res.json<{
      success: boolean;
      error: { code: string; message: string };
    }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).not.toContain('database on fire');
  });

  it('preserves HTTPException status and message', async () => {
    const app = buildApp();
    app.get('/forbidden', () => {
      throw new HTTPException(403, { message: 'nope' });
    });
    const res = await app.request('/forbidden', {}, {} as Env);
    expect(res.status).toBe(403);
    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.message).toBe('nope');
  });

  it('converts ZodError to 400 VALIDATION_ERROR with field details', async () => {
    const app = buildApp();
    app.get('/bad', () => {
      const schema = z.object({ email: z.string().email() });
      schema.parse({ email: 'not-email' });
      return new Response();
    });
    const res = await app.request('/bad', {}, {} as Env);
    expect(res.status).toBe(400);
    const body = await res.json<{
      error: { code: string; details: Array<{ path: string[] }> };
    }>();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
  });
});
