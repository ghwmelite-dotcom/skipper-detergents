/**
 * Short-lived HMAC signatures for payment-proof image URLs.
 *
 * The admin UI receives a URL like
 *   /r2/payment-proofs/&lt;orderId&gt;/&lt;id&gt;.jpg?exp=&lt;ms&gt;&amp;sig=&lt;b64url&gt;
 * which is safe to embed in an &lt;img src&gt; (signature bound to the specific
 * R2 key + expiry, no JWT material leaked into URLs, logs, or Referer).
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function compute(secret: string, key: string, exp: string): Promise<string> {
  const cryptoKey = await importKey(secret);
  const data = enc.encode(`${key}:${exp}`);
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
  return b64url(sigBytes);
}

export interface SignProofOptions {
  ttlMs?: number;
}

export async function signProofUrl(
  secret: string,
  key: string,
  options: SignProofOptions = {},
): Promise<{ exp: string; sig: string }> {
  const exp = String(Date.now() + (options.ttlMs ?? DEFAULT_TTL_MS));
  const sig = await compute(secret, key, exp);
  return { exp, sig };
}

export async function verifyProofSignature(
  secret: string,
  key: string,
  exp: string,
  sig: string,
): Promise<boolean> {
  const expMs = Number.parseInt(exp, 10);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return false;
  const expected = await compute(secret, key, exp);
  // Constant-time comparison.
  if (expected.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return mismatch === 0;
}
