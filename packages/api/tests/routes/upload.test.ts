import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  const list = await env.R2_PROOFS.list();
  for (const obj of list.objects) {
    await env.R2_PROOFS.delete(obj.key);
  }
});

describe('POST /api/upload/payment-proof', () => {
  it('stores a valid image and returns { url, key }', async () => {
    const form = new FormData();
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' });
    form.append('file', blob, 'proof.jpg');
    form.append('order_id', 'o1');

    const res = await app.request(
      '/api/upload/payment-proof',
      { method: 'POST', body: form },
      env,
    );
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { url: string; key: string } }>();
    expect(body.data.key.startsWith('payment-proofs/o1/')).toBe(true);
    expect(body.data.url).toContain('payment-proofs/o1/');
  });

  it('rejects missing order_id', async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1])], { type: 'image/jpeg' }), 'x.jpg');
    const res = await app.request(
      '/api/upload/payment-proof',
      { method: 'POST', body: form },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('rejects missing file', async () => {
    const form = new FormData();
    form.append('order_id', 'o1');
    const res = await app.request(
      '/api/upload/payment-proof',
      { method: 'POST', body: form },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('rejects non-image MIME with 415', async () => {
    const form = new FormData();
    form.append('file', new Blob(['%PDF'], { type: 'application/pdf' }), 'x.pdf');
    form.append('order_id', 'o1');
    const res = await app.request(
      '/api/upload/payment-proof',
      { method: 'POST', body: form },
      env,
    );
    expect(res.status).toBe(415);
  });
});
