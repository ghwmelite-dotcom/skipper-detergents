import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase, seedSetting } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedSetting(env.DB, 'store_name', 'Skipper CleanCare');
  await seedSetting(env.DB, 'currency', 'GHS');
  await seedSetting(env.DB, 'paystack_secret_key', 'SHOULD_NOT_LEAK');
});

describe('GET /api/settings/public', () => {
  it('returns whitelisted settings only', async () => {
    const res = await app.request('/api/settings/public', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{ data: Record<string, string> }>();
    expect(body.data.store_name).toBe('Skipper CleanCare');
    expect(body.data.currency).toBe('GHS');
    expect('paystack_secret_key' in body.data).toBe(false);
  });
});
