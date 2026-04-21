import { Hono } from 'hono';
import type { Env } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { ok, fail } from './utils/response';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);
app.onError(errorHandler);

app.get('/', (c) => c.text('Skipper API'));

app.get('/health', (c) =>
  c.json(
    ok({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: c.env.APP_ENV,
    }),
  ),
);

app.notFound((c) => c.json(fail('NOT_FOUND', 'Route not found'), 404));

export default app;
