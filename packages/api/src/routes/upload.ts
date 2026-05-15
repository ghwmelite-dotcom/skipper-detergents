import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { storePaymentProof } from '../services/uploads';
import { first } from '../utils/db';
import { consumeRateBucket } from '../utils/rateBucket';

export const uploadRouter = new Hono<{ Bindings: Env }>();

uploadRouter.post('/payment-proof', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const orderId = form.get('order_id');

  if (typeof orderId !== 'string' || !orderId) {
    return c.json(fail('BAD_REQUEST', 'order_id is required'), 400);
  }

  // The proof upload endpoint cannot be authenticated (the customer isn't
  // logged in), so we instead bind it to the order: must exist, must be using
  // manual transfer, must not already be paid. Combined with the per-order
  // rate limit below this prevents drive-by R2 bill DoS.
  const order = await first<{
    id: string;
    payment_method: string;
    payment_status: string;
    created_at: string;
  }>(
    c.env.DB,
    `SELECT id, payment_method, payment_status, created_at FROM orders WHERE id = ?`,
    [orderId],
  );

  if (!order) {
    return c.json(fail('NOT_FOUND', 'Order not found'), 404);
  }
  if (order.payment_method !== 'manual_transfer') {
    return c.json(fail('CONFLICT', 'This order does not accept a manual proof'), 409);
  }
  if (order.payment_status === 'paid') {
    return c.json(fail('CONFLICT', 'This order is already paid'), 409);
  }

  // 5 proof uploads per order per hour is generous for a real customer and
  // hostile to anyone trying to inflate R2 spend by spraying a known order id.
  const proofBucket = await consumeRateBucket(
    c.env.KV_RATE_LIMIT,
    `rl:proof_upload:${orderId}`,
    { limit: 5, windowSeconds: 3600 },
  );
  if (!proofBucket.allowed) {
    return c.json(fail('RATE_LIMITED', 'Too many uploads for this order'), 429);
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
