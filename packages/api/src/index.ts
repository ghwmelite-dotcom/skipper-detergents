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
  const obj = await c.env.R2_PRODUCTS.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
});

// R2 serving for payment proofs — private-ish; admin UI needs these, so gate by JWT.
app.get('/r2/payment-proofs/*', async (c) => {
  // Accept token either via Authorization header OR ?token= query param (useful for img tags).
  const url = new URL(c.req.url);
  const auth = c.req.header('Authorization');
  const queryToken = url.searchParams.get('token');
  const token =
    auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : queryToken?.trim();
  if (!token || !c.env.JWT_SECRET) {
    return c.json(fail('UNAUTHORIZED', 'Admin token required'), 401);
  }
  const { verifyJwt } = await import('./utils/jwt');
  const payload = await verifyJwt<{ sub: string }>(token, c.env.JWT_SECRET);
  if (!payload?.sub) {
    return c.json(fail('UNAUTHORIZED', 'Invalid or expired admin token'), 401);
  }
  const key = url.pathname.replace(/^\/r2\//, '');
  const obj = await c.env.R2_PROOFS.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(obj.body, { headers });
});

app.notFound((c) => c.json(fail('NOT_FOUND', 'Route not found'), 404));

export default app;
