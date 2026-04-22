import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';

// Match any skipperdetergents.pages.dev, skipper-storefront.pages.dev, or skipper-admin.pages.dev preview / branch alias.
const PAGES_DEV_PATTERN = /^https:\/\/[a-z0-9-]+\.(skipperdetergents|skipper-storefront|skipper-admin)\.pages\.dev$/;

function isAllowedOrigin(origin: string, env: Env): boolean {
  // Exact-match list from env (supports comma-separated lists too)
  const exactList = [env.STOREFRONT_ORIGIN, env.ADMIN_ORIGIN]
    .filter(Boolean)
    .flatMap((val) => val.split(',').map((s) => s.trim()))
    .filter(Boolean);
  if (exactList.includes(origin)) return true;
  // Cloudflare Pages subdomains for this project
  if (PAGES_DEV_PATTERN.test(origin)) return true;
  return false;
}

export const corsMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const origin = c.req.header('Origin');
  const isAllowed = Boolean(origin) && isAllowedOrigin(origin!, c.env);

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
