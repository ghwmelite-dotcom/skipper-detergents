import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from '../../src/utils/jwt';

describe('JWT utilities (HS256)', () => {
  const secret = 'test-secret-at-least-32-chars-long-for-good-measure';

  it('round-trips a payload', async () => {
    const token = await signJwt({ sub: 'u1', email: 'a@b.co', role: 'admin' }, secret, 60);
    const payload = await verifyJwt<{ sub: string; email: string; role: string }>(token, secret);
    expect(payload?.sub).toBe('u1');
    expect(payload?.email).toBe('a@b.co');
    expect(payload?.role).toBe('admin');
    expect(typeof payload?.iat).toBe('number');
    expect(typeof payload?.exp).toBe('number');
  });

  it('rejects a tampered signature', async () => {
    const token = await signJwt({ sub: 'u1' }, secret, 60);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.AAAAAAAA`;
    expect(await verifyJwt(tampered, secret)).toBeNull();
  });

  it('rejects a wrong secret', async () => {
    const token = await signJwt({ sub: 'u1' }, secret, 60);
    expect(await verifyJwt(token, 'other-secret-xxxxxxxxxxxxxxxxxxxxxxxx')).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signJwt({ sub: 'u1' }, secret, -1);
    expect(await verifyJwt(token, secret)).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyJwt('not.a.jwt', secret)).toBeNull();
    expect(await verifyJwt('abcdef', secret)).toBeNull();
    expect(await verifyJwt('', secret)).toBeNull();
  });
});
