import { describe, it, expect } from 'vitest';
import app from '../src/index';
import type { Env } from '../src/types/env';

const env = {} as Env;

describe('GET /health', () => {
  it('returns 200 with ok envelope', async () => {
    const res = await app.request('/health', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      success: boolean;
      data: { status: string; timestamp: string };
    }>();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(typeof body.data.timestamp).toBe('string');
  });

  it('includes an ISO-8601 timestamp', async () => {
    const res = await app.request('/health', {}, env);
    const body = await res.json<{ data: { timestamp: string } }>();
    const parsed = new Date(body.data.timestamp);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});

describe('GET /', () => {
  it('returns a plain text marker', async () => {
    const res = await app.request('/', {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Skipper');
  });
});

describe('GET /unknown-route', () => {
  it('returns 404 with NOT_FOUND envelope', async () => {
    const res = await app.request('/unknown-route', {}, env);
    expect(res.status).toBe(404);
    const body = await res.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
