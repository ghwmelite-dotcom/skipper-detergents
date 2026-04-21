import { describe, it, expect } from 'vitest';
import { verifyHmacSha512, hmacSha512Hex } from '../../src/utils/crypto';

describe('hmacSha512Hex', () => {
  it('produces a 128-char lowercase hex digest', async () => {
    const digest = await hmacSha512Hex('hello', 'key');
    expect(digest).toMatch(/^[0-9a-f]{128}$/);
  });

  it('matches a known-answer vector', async () => {
    // Generated via: echo -n "The quick brown fox" | openssl dgst -sha512 -hmac "secret"
    const digest = await hmacSha512Hex('The quick brown fox', 'secret');
    expect(digest).toBe(
      '7d665e6239c574929a745a3724f08d687c3163420096de827da59826773f8cfbde583899808f36ca521053532019e4f2d6eca5019ab059ac47cf6a0b0c68b53f',
    );
  });

  it('differs for different keys', async () => {
    const a = await hmacSha512Hex('body', 'k1');
    const b = await hmacSha512Hex('body', 'k2');
    expect(a).not.toBe(b);
  });
});

describe('verifyHmacSha512', () => {
  it('returns true for matching signature', async () => {
    const sig = await hmacSha512Hex('payload', 'secret');
    expect(await verifyHmacSha512('payload', sig, 'secret')).toBe(true);
  });

  it('returns false for tampered body', async () => {
    const sig = await hmacSha512Hex('payload', 'secret');
    expect(await verifyHmacSha512('payload_tampered', sig, 'secret')).toBe(false);
  });

  it('returns false for wrong signature', async () => {
    expect(await verifyHmacSha512('payload', 'deadbeef', 'secret')).toBe(false);
  });

  it('returns false for wrong secret', async () => {
    const sig = await hmacSha512Hex('payload', 'secret1');
    expect(await verifyHmacSha512('payload', sig, 'secret2')).toBe(false);
  });

  it('is case-insensitive on the signature hex', async () => {
    const sig = await hmacSha512Hex('payload', 'secret');
    expect(await verifyHmacSha512('payload', sig.toUpperCase(), 'secret')).toBe(true);
  });
});
