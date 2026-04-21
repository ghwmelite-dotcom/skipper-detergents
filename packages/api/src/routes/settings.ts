import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ok } from '../utils/response';
import { getPublicSettings } from '../services/settings';

export const settingsRouter = new Hono<{ Bindings: Env }>();

settingsRouter.get('/public', async (c) => {
  const settings = await getPublicSettings(c.env.DB);
  return c.json(ok(settings));
});
