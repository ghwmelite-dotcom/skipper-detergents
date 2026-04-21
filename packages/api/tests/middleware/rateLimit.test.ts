import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimit } from '../../src/middleware/rateLimit';
import type { Env } from '../../src/types/env';

function makeKV() {
  const store = new Map<string, { value: string; expiresAt: number }>();
  return {
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      const ttlMs = (options?.expirationTtl ?? 60) * 1000;
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    async delete(key: string) {
      store.delete(key);
    },
    _store: store,
  } as unknown as KVNamespace & { _store: Map<string, { value: string; expiresAt: number }> };
}

function buildApp(kv: KVNamespace, options: { limit: number; windowSeconds: number }) {
  const app = new Hono<{ Bindings: Env }>();
  app.use(
    '*',
    rateLimit({ limit: options.limit, windowSeconds: options.windowSeconds, keyPrefix: 'test' }),
  );
  app.get('/ping', (c) => c.json({ pong: true }));
  return app;
}

function envWith(kv: KVNamespace): Env {
  return { KV_RATE_LIMIT: kv } as unknown as Env;
}

describe('rateLimit', () => {
  let kv: KVNamespace & { _store: Map<string, { value: string; expiresAt: number }> };
  beforeEach(() => {
    kv = makeKV() as KVNamespace & { _store: Map<string, { value: string; expiresAt: number }> };
  });

  it('allows requests up to the limit', async () => {
    const app = buildApp(kv, { limit: 3, windowSeconds: 60 });
    const env = envWith(kv);
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/ping', { headers: { 'cf-connecting-ip': '1.2.3.4' } }, env);
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 when the limit is exceeded', async () => {
    const app = buildApp(kv, { limit: 2, windowSeconds: 60 });
    const env = envWith(kv);
    for (let i = 0; i < 2; i++) {
      await app.request('/ping', { headers: { 'cf-connecting-ip': '9.9.9.9' } }, env);
    }
    const res = await app.request('/ping', { headers: { 'cf-connecting-ip': '9.9.9.9' } }, env);
    expect(res.status).toBe(429);
    const body = await res.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('isolates by IP address', async () => {
    const app = buildApp(kv, { limit: 1, windowSeconds: 60 });
    const env = envWith(kv);
    const a = await app.request('/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } }, env);
    const b = await app.request('/ping', { headers: { 'cf-connecting-ip': '2.2.2.2' } }, env);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  it('falls back to "unknown" IP when cf-connecting-ip is absent', async () => {
    const app = buildApp(kv, { limit: 1, windowSeconds: 60 });
    const env = envWith(kv);
    const first = await app.request('/ping', {}, env);
    const second = await app.request('/ping', {}, env);
    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });

  it('includes X-RateLimit headers on allowed responses', async () => {
    const app = buildApp(kv, { limit: 5, windowSeconds: 60 });
    const env = envWith(kv);
    const res = await app.request('/ping', { headers: { 'cf-connecting-ip': '3.3.3.3' } }, env);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
  });
});
