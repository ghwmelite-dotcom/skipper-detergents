import { Hono } from 'hono';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.text('Skipper API'));

export default app;
