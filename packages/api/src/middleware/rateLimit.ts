import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { fail } from '../utils/response';
import { consumeRateBucket } from '../utils/rateBucket';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const result = await consumeRateBucket(c.env.KV_RATE_LIMIT, key, {
      limit: options.limit,
      windowSeconds: options.windowSeconds,
    });

    if (!result.allowed) {
      return c.json(fail('RATE_LIMITED', 'Too many requests — slow down'), 429);
    }

    await next();

    c.res.headers.set('X-RateLimit-Limit', String(options.limit));
    c.res.headers.set('X-RateLimit-Remaining', String(result.remaining));
    return;
  };
}
