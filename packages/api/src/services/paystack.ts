import { first, run } from '../utils/db';
import { verifyHmacSha512 } from '../utils/crypto';

const PAYSTACK_BASE = 'https://api.paystack.co';

export async function verifyPaystackSignature(
  rawBody: string,
  signatureHex: string,
  secretKey: string,
): Promise<boolean> {
  if (!signatureHex) return false;
  return verifyHmacSha512(rawBody, signatureHex, secretKey);
}

export interface InitPaystackOptions {
  amountGhs: number;
  email: string;
  reference: string;
  callback_url: string;
  secretKey: string;
  metadata?: Record<string, unknown>;
}

export interface InitPaystackResult {
  access_code: string;
  authorization_url: string;
  reference: string;
}

export async function initPaystackTransaction(
  opts: InitPaystackOptions,
): Promise<InitPaystackResult> {
  const body = {
    amount: Math.round(opts.amountGhs * 100),
    email: opts.email,
    reference: opts.reference,
    callback_url: opts.callback_url,
    channels: ['card', 'mobile_money', 'bank'] as const,
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  };
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: InitPaystackResult;
  };
  if (!payload.status || !payload.data) {
    throw new Error(`Paystack init failed: ${payload.message ?? 'unknown'}`);
  }
  return payload.data;
}

export type MarkPaidAction = 'marked_paid' | 'already_paid' | 'unknown' | 'amount_mismatch';

export async function markOrderPaidFromWebhook(
  db: D1Database,
  paystackReference: string,
  amountPesewas: number,
): Promise<{ action: MarkPaidAction }> {
  const order = await first<{ id: string; payment_status: string; total_amount: number }>(
    db,
    `SELECT id, payment_status, total_amount FROM orders WHERE paystack_reference = ?`,
    [paystackReference],
  );
  if (!order) return { action: 'unknown' };
  if (order.payment_status === 'paid') return { action: 'already_paid' };

  const expectedPesewas = Math.round(order.total_amount * 100);
  if (expectedPesewas !== amountPesewas) return { action: 'amount_mismatch' };

  await run(
    db,
    `UPDATE orders SET payment_status = 'paid', status = 'confirmed', updated_at = datetime('now') WHERE id = ?`,
    [order.id],
  );
  return { action: 'marked_paid' };
}
