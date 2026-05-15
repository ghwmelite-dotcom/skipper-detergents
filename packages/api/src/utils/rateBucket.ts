/**
 * Fixed-window rate-limit bucket persisted in KV.
 *
 * Why a custom bucket rather than just `KV.put({ expirationTtl })` on a counter:
 * the previous implementation refreshed `expirationTtl` on every increment, so
 * a steady attacker hitting the threshold kept extending their own window and
 * was effectively rate-limited forever. We instead store
 * `{ count, resetAt }` and only let KV evict naturally at `resetAt`.
 */

interface BucketState {
  count: number;
  resetAt: number;
}

export interface BucketOptions {
  limit: number;
  windowSeconds: number;
}

export interface BucketResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: number;
}

function parseBucket(raw: string | null): BucketState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<BucketState>;
    if (typeof v.count !== 'number' || typeof v.resetAt !== 'number') return null;
    return { count: v.count, resetAt: v.resetAt };
  } catch {
    // Legacy bare-number value from the previous implementation. Treat as a
    // fresh bucket so we don't carry the stale extending-window behavior.
    return null;
  }
}

export async function consumeRateBucket(
  kv: KVNamespace,
  key: string,
  options: BucketOptions,
): Promise<BucketResult> {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  const existing = parseBucket(await kv.get(key));
  const active = existing && existing.resetAt > now ? existing : null;

  const count = (active?.count ?? 0) + 1;
  const resetAt = active?.resetAt ?? now + windowMs;
  const allowed = count <= options.limit;

  // Persist with a TTL that mirrors the remaining window so KV evicts on its
  // own. We always write — even on rejection — so the count reflects the
  // attacker's full pressure (a rejected hit still costs them).
  const ttlSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  await kv.put(key, JSON.stringify({ count, resetAt }), { expirationTtl: ttlSeconds });

  return {
    allowed,
    count,
    remaining: Math.max(0, options.limit - count),
    resetAt,
  };
}

export async function clearRateBucket(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}
