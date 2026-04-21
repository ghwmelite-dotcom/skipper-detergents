const encoder = new TextEncoder();

export async function hmacSha512Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyHmacSha512(
  message: string,
  signatureHex: string,
  secret: string,
): Promise<boolean> {
  if (!signatureHex || !/^[0-9a-fA-F]+$/.test(signatureHex)) return false;
  const expected = await hmacSha512Hex(message, secret);
  const a = expected.toLowerCase();
  const b = signatureHex.toLowerCase();
  if (a.length !== b.length) return false;
  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
