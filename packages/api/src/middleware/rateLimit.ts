import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { fail } from '../utils/response';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const currentStr = await c.env.KV_RATE_LIMIT.get(key);
    const current = currentStr ? Number.parseInt(currentStr, 10) : 0;

    if (current >= options.limit) {
      return c.json(fail('RATE_LIMITED', 'Too many requests — slow down'), 429);
    }

    const next_ = current + 1;
    await c.env.KV_RATE_LIMIT.put(key, String(next_), {
      expirationTtl: options.windowSeconds,
    });

    await next();

    c.res.headers.set('X-RateLimit-Limit', String(options.limit));
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, options.limit - next_)));
    return;
  };
}
