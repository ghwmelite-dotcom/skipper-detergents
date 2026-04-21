import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { getPublicSettings, PUBLIC_SETTING_KEYS } from '../../src/services/settings';
import { resetDatabase, seedSetting } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
});

describe('getPublicSettings', () => {
  it('returns only whitelisted keys', async () => {
    await seedSetting(env.DB, 'store_name', 'Skipper Detergents');
    await seedSetting(env.DB, 'paystack_secret_key', 'SK_SECRET_SHOULD_NOT_LEAK');
    await seedSetting(env.DB, 'store_email', 'orders@example');

    const settings = await getPublicSettings(env.DB);
    expect(settings.store_name).toBe('Skipper Detergents');
    expect(settings.store_email).toBe('orders@example');
    expect('paystack_secret_key' in settings).toBe(false);
  });

  it('returns an empty object when no settings match', async () => {
    const settings = await getPublicSettings(env.DB);
    expect(settings).toEqual({});
  });

  it('includes all PUBLIC_SETTING_KEYS when present', async () => {
    for (const key of PUBLIC_SETTING_KEYS) {
      await seedSetting(env.DB, key, `value_for_${key}`);
    }
    const settings = await getPublicSettings(env.DB);
    for (const key of PUBLIC_SETTING_KEYS) {
      expect(settings[key]).toBe(`value_for_${key}`);
    }
  });
});
