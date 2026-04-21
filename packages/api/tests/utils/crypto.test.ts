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
      '6a9f63e3307a541b99fb45ea73f415d9e93e5048c32d14400f7a4b9b7f81eae84e78fd9935b19ec04807eb4feba53a65af1b2cf32f5628ccdc27c88c94f22a2a',
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
