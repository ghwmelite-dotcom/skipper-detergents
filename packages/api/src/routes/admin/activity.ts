import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../../types/env';
import { ok } from '../../utils/response';
import { adminAuth, type AdminVariables } from '../../middleware/adminAuth';
import { listActivity } from '../../services/activity';

const numericFromString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((v) => !Number.isNaN(v), { message: 'must be a number' });

const querySchema = z.object({
  entity_type: z.string().min(1).max(100).optional(),
  entity_id: z.string().min(1).max(100).optional(),
  admin_id: z.string().min(1).max(100).optional(),
  limit: numericFromString.pipe(z.number().int().positive().max(200)).default(50),
  offset: numericFromString.pipe(z.number().int().nonnegative()).default(0),
});

export const adminActivityRouter = new Hono<{ Bindings: Env; Variables: AdminVariables }>();
adminActivityRouter.use('*', adminAuth);

adminActivityRouter.get('/', async (c) => {
  const query = querySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const { entries, total } = await listActivity(c.env.DB, query);
  return c.json(ok(entries, { total, per_page: query.limit }));
});
