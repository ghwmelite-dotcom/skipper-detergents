import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';

export const corsMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const origin = c.req.header('Origin');
  const allowlist = [c.env.STOREFRONT_ORIGIN, c.env.ADMIN_ORIGIN].filter(Boolean);
  const isAllowed = origin && allowlist.includes(origin);

  if (c.req.method === 'OPTIONS') {
    if (isAllowed) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin!,
          'Access-Control-Allow-Methods': ALLOWED_METHODS,
          'Access-Control-Allow-Headers': ALLOWED_HEADERS,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }
    return new Response(null, { status: 204 });
  }

  await next();

  if (isAllowed) {
    c.res.headers.set('Access-Control-Allow-Origin', origin!);
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
    c.res.headers.append('Vary', 'Origin');
  }

  return;
};
