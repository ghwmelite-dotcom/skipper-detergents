import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { HTTPException } from 'hono/http-exception';
import { storePaymentProof } from '../../src/services/uploads';

beforeEach(async () => {
  const list = await env.R2_PROOFS.list();
  for (const obj of list.objects) {
    await env.R2_PROOFS.delete(obj.key);
  }
});

describe('storePaymentProof', () => {
  it('stores an image/jpeg under payment-proofs/{order_id}/{uuid}.jpg and returns key + url', async () => {
    const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
    const result = await storePaymentProof(env.R2_PROOFS, {
      orderId: 'o1',
      contentType: 'image/jpeg',
      bodyBytes: body,
      sizeBytes: body.byteLength,
      publicBase: 'https://proofs.example',
    });
    expect(result.key.startsWith('payment-proofs/o1/')).toBe(true);
    expect(result.key.endsWith('.jpg')).toBe(true);
    expect(result.url).toBe(`https://proofs.example/${result.key}`);

    const stored = await env.R2_PROOFS.get(result.key);
    expect(stored).not.toBeNull();
  });

  it('rejects unknown MIME types', async () => {
    await expect(
      storePaymentProof(env.R2_PROOFS, {
        orderId: 'o1',
        contentType: 'application/pdf',
        bodyBytes: new Uint8Array([1, 2]),
        sizeBytes: 2,
        publicBase: 'https://proofs.example',
      }),
    ).rejects.toThrow(HTTPException);
  });

  it('rejects files over 3 MB', async () => {
    await expect(
      storePaymentProof(env.R2_PROOFS, {
        orderId: 'o1',
        contentType: 'image/jpeg',
        bodyBytes: new Uint8Array([1, 2]),
        sizeBytes: 4 * 1024 * 1024,
        publicBase: 'https://proofs.example',
      }),
    ).rejects.toThrow(HTTPException);
  });

  it('picks the right extension per MIME', async () => {
    const png = await storePaymentProof(env.R2_PROOFS, {
      orderId: 'o1',
      contentType: 'image/png',
      bodyBytes: new Uint8Array([1]),
      sizeBytes: 1,
      publicBase: 'https://proofs.example',
    });
    expect(png.key.endsWith('.png')).toBe(true);

    const webp = await storePaymentProof(env.R2_PROOFS, {
      orderId: 'o1',
      contentType: 'image/webp',
      bodyBytes: new Uint8Array([1]),
      sizeBytes: 1,
      publicBase: 'https://proofs.example',
    });
    expect(webp.key.endsWith('.webp')).toBe(true);
  });
});
