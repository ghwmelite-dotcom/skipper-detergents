import { Hono } from 'hono';
import type { Env } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import { ok, fail } from './utils/response';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { settingsRouter } from './routes/settings';
import { sitemapRouter } from './routes/sitemap';
import { ordersRouter, trackRouter } from './routes/orders';
import { paymentsRouter, webhooksRouter } from './routes/payments';
import { uploadRouter } from './routes/upload';
import { adminAuthRouter } from './routes/admin/auth';
import { adminProductsRouter } from './routes/admin/products';
import { adminOrdersRouter } from './routes/admin/orders';
import { adminDashboardRouter } from './routes/admin/dashboard';
import { adminCategoriesRouter } from './routes/admin/categories';
import { adminActivityRouter } from './routes/admin/activity';
import { adminSettingsRouter } from './routes/admin/settings';
import { adminUsersRouter } from './routes/admin/users';
import { adminCustomersRouter } from './routes/admin/customers';
import { adminNotificationsRouter } from './routes/admin/notifications';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);
app.onError(errorHandler);

app.get('/', (c) => c.text('Skipper API'));
app.get('/health', (c) =>
  c.json(ok({ status: 'ok', timestamp: new Date().toISOString(), env: c.env.APP_ENV })),
);

app.use('/api/*', rateLimit({ limit: 100, windowSeconds: 60, keyPrefix: 'rl:public' }));

// Public routes
app.route('/api/products', productsRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/settings', settingsRouter);
app.route('/api', sitemapRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/track', trackRouter);
app.route('/api/payments', paymentsRouter);
app.route('/api/upload', uploadRouter);
app.route('/webhooks', webhooksRouter);

// Admin routes
app.route('/api/admin/auth', adminAuthRouter);
app.route('/api/admin/products', adminProductsRouter);
app.route('/api/admin/orders', adminOrdersRouter);
app.route('/api/admin/dashboard', adminDashboardRouter);
app.route('/api/admin/categories', adminCategoriesRouter);
app.route('/api/admin/activity', adminActivityRouter);
app.route('/api/admin/settings', adminSettingsRouter);
app.route('/api/admin/users', adminUsersRouter);
app.route('/api/admin/customers', adminCustomersRouter);
app.route('/api/admin/notifications', adminNotificationsRouter);

// R2 image serving for product images (public cache, 1 day)
app.get('/r2/products/*', async (c) => {
  const url = new URL(c.req.url);
  const key = url.pathname.replace(/^\/r2\/products\//, '');
  if (key.includes('..')) {
    return c.json(fail('BAD_REQUEST', 'Invalid object key'), 400);
  }
  const obj = await c.env.R2_PRODUCTS.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
});

// R2 serving for payment proofs — private. Authorised either by:
//   1. a fresh admin JWT (Authorization: Bearer) for direct admin requests, OR
//   2. a short-lived HMAC signature in the URL (?sig=&exp=) issued by the API
//      and embedded in <img src=...>, so we never put the raw JWT in a URL.
// The path must begin with `payment-proofs/` so an attacker can't pivot to
// other R2 prefixes (e.g. /r2/payment-proofs/../foo).
app.get('/r2/payment-proofs/*', async (c) => {
  const url = new URL(c.req.url);
  const key = url.pathname.replace(/^\/r2\//, '');
  if (!key.startsWith('payment-proofs/') || key.includes('..')) {
    return c.json(fail('BAD_REQUEST', 'Invalid object key'), 400);
  }

  const sig = url.searchParams.get('sig');
  const exp = url.searchParams.get('exp');
  const authHeader = c.req.header('Authorization');

  let authorised = false;
  const { verifyJwt } = await import('./utils/jwt');
  const { verifyProofSignature } = await import('./utils/proofSignature');

  if (sig && exp && c.env.JWT_SECRET) {
    authorised = await verifyProofSignature(c.env.JWT_SECRET, key, exp, sig);
  } else if (authHeader?.startsWith('Bearer ') && c.env.JWT_SECRET) {
    const token = authHeader.slice('Bearer '.length).trim();
    const payload = await verifyJwt<{ sub: string }>(token, c.env.JWT_SECRET);
    authorised = Boolean(payload?.sub);
  }

  if (!authorised) {
    return c.json(fail('UNAUTHORIZED', 'Admin authorisation required'), 401);
  }

  const obj = await c.env.R2_PROOFS.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(obj.body, { headers });
});

app.notFound((c) => c.json(fail('NOT_FOUND', 'Route not found'), 404));

export default app;
