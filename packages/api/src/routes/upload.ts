import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { storePaymentProof } from '../services/uploads';

export const uploadRouter = new Hono<{ Bindings: Env }>();

uploadRouter.post('/payment-proof', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const orderId = form.get('order_id');

  if (typeof orderId !== 'string' || !orderId) {
    return c.json(fail('BAD_REQUEST', 'order_id is required'), 400);
  }

  // Workers-types FormData.get() is typed as string | null, but at runtime it can
  // also return a File/Blob when multipart data includes a file field.
  // We cast through unknown to satisfy strict TS while keeping the runtime check.
  const fileUnknown = file as unknown;
  if (
    !fileUnknown ||
    typeof (fileUnknown as Record<string, unknown>).arrayBuffer !== 'function' ||
    typeof (fileUnknown as Record<string, unknown>).type !== 'string'
  ) {
    return c.json(fail('BAD_REQUEST', 'file is required'), 400);
  }
  const fileObj = fileUnknown as { arrayBuffer(): Promise<ArrayBuffer>; type: string };

  const publicBase =
    c.env.R2_PROOFS_PUBLIC_BASE ?? `${new URL(c.req.url).origin}/r2/payment-proofs`;

  const bytes = new Uint8Array(await fileObj.arrayBuffer());
  const result = await storePaymentProof(c.env.R2_PROOFS, {
    orderId,
    contentType: fileObj.type,
    bodyBytes: bytes,
    sizeBytes: bytes.byteLength,
    publicBase,
  });
  return c.json(ok(result));
});
