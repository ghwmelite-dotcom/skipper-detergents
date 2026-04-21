import { Hono } from 'hono';
import type { Env } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import { ok, fail } from './utils/response';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { settingsRouter } from './routes/settings';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);
app.onError(errorHandler);

app.get('/', (c) => c.text('Skipper API'));
app.get('/health', (c) =>
  c.json(ok({ status: 'ok', timestamp: new Date().toISOString(), env: c.env.APP_ENV })),
);

app.use('/api/*', rateLimit({ limit: 100, windowSeconds: 60, keyPrefix: 'rl:public' }));
app.route('/api/products', productsRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/settings', settingsRouter);

app.notFound((c) => c.json(fail('NOT_FOUND', 'Route not found'), 404));

export default app;
