// Password hashing using Web Crypto PBKDF2-SHA256.
// Workers runtime doesn't expose scrypt via Web Crypto, so we use PBKDF2
// with a high iteration count (100k) which gives us strong resistance to
// offline attack while staying within Workers CPU budget on login.
//
// Stored format: `pbkdf2-sha256:<iterations>:<salt_b64>:<hash_b64>`

const PBKDF2_ITERATIONS = 100_000;
const HASH_BITS = 256;
const SALT_BYTES = 16;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  bits: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bitsBuf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    bits,
  );
  return new Uint8Array(bitsBuf);
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS, HASH_BITS);
  return `pbkdf2-sha256:${PBKDF2_ITERATIONS}:${toBase64(salt)}:${toBase64(hash)}`;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 4) return false;
  const [algo, iterStr, saltB64, hashB64] = parts;
  if (algo !== 'pbkdf2-sha256') return false;
  const iterations = Number.parseInt(iterStr ?? '', 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  if (!saltB64 || !hashB64) return false;

  try {
    const salt = fromBase64(saltB64);
    const expected = fromBase64(hashB64);
    const computed = await pbkdf2(password, salt, iterations, expected.length * 8);
    return constantTimeEqual(expected, computed);
  } catch {
    return false;
  }
}
