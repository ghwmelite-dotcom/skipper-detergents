import { all, first } from '../utils/db';

export const PUBLIC_SETTING_KEYS = [
  'store_name',
  'store_tagline',
  'store_email',
  'store_phone',
  'currency',
  'delivery_fee_accra',
  'delivery_fee_other',
  'free_delivery_threshold',
  'manual_payment_details',
  'pickup_address',
  'paystack_public_key',
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export async function getPublicSettings(
  db: D1Database,
): Promise<Partial<Record<PublicSettingKey, string>>> {
  const placeholders = PUBLIC_SETTING_KEYS.map(() => '?').join(', ');
  const rows = await all<{ key: string; value: string }>(
    db,
    `SELECT key, value FROM store_settings WHERE key IN (${placeholders})`,
    [...PUBLIC_SETTING_KEYS],
  );
  const map: Partial<Record<PublicSettingKey, string>> = {};
  for (const row of rows) {
    map[row.key as PublicSettingKey] = row.value;
  }
  return map;
}

/** Read a single store setting by key. Returns null if unset. */
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await first<{ value: string }>(
    db,
    `SELECT value FROM store_settings WHERE key = ?`,
    [key],
  );
  return row?.value ?? null;
}
