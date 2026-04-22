// Minimal HS256 JWT implementation built on Web Crypto.
// Avoids an external dependency; works in Workers runtime.

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? 0 : 4 - (str.length % 4);
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function textToBase64Url(text: string): string {
  return base64UrlEncode(encoder.encode(text));
}

function base64UrlToText(str: string): string {
  return new TextDecoder().decode(base64UrlDecode(str));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export interface JwtPayloadBase {
  iat?: number;
  exp?: number;
}

export async function signJwt<T extends Record<string, unknown>>(
  payload: T,
  secret: string,
  expiresInSec: number,
): Promise<string> {
  if (!secret) throw new Error('JWT secret not set');
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body: T & JwtPayloadBase = { ...payload, iat: now, exp: now + expiresInSec };

  const h = textToBase64Url(JSON.stringify(header));
  const p = textToBase64Url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifyJwt<T extends object>(
  token: string,
  secret: string,
): Promise<(T & JwtPayloadBase) | null> {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts as [string, string, string];

  try {
    const key = await importHmacKey(secret);
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(s) as BufferSource,
      encoder.encode(`${h}.${p}`),
    );
    if (!ok) return null;
    const payload = JSON.parse(base64UrlToText(p)) as T & JwtPayloadBase;
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
