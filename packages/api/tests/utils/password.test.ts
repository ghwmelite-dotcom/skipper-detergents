import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/password';

describe('password utilities', () => {
  it('hashes to the expected envelope format', async () => {
    const h = await hashPassword('CorrectHorseBattery');
    expect(h).toMatch(/^pbkdf2-sha256:\d+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  });

  it('verifies a correct password', async () => {
    const h = await hashPassword('CorrectHorseBattery!9');
    expect(await verifyPassword('CorrectHorseBattery!9', h)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const h = await hashPassword('CorrectHorseBattery!9');
    expect(await verifyPassword('CorrectHorseBattery!9x', h)).toBe(false);
  });

  it('rejects gibberish stored strings', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
  });

  it('produces different salts for the same password', async () => {
    const a = await hashPassword('samepw-repeated');
    const b = await hashPassword('samepw-repeated');
    expect(a).not.toBe(b);
  });

  it('throws on short passwords', async () => {
    await expect(hashPassword('abc')).rejects.toThrow();
  });
});
