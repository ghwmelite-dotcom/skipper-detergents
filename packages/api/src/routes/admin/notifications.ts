import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { ok, fail } from '../../utils/response';
import { adminAuth, type AdminVariables } from '../../middleware/adminAuth';
import {
  listAdminNotifications,
  countUnreadAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '../../services/notifications';

export const adminNotificationsRouter = new Hono<{
  Bindings: Env;
  Variables: AdminVariables;
}>();
adminNotificationsRouter.use('*', adminAuth);

adminNotificationsRouter.get('/', async (c) => {
  const unreadParam = c.req.query('unread');
  const limitParam = Number.parseInt(c.req.query('limit') ?? '20', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20;

  const [items, unread] = await Promise.all([
    listAdminNotifications(c.env.DB, {
      limit,
      unreadOnly: unreadParam === '1' || unreadParam === 'true',
    }),
    countUnreadAdminNotifications(c.env.DB),
  ]);

  return c.json(ok({ items, unread }));
});

adminNotificationsRouter.post('/:id/read', async (c) => {
  const id = c.req.param('id');
  const updated = await markAdminNotificationRead(c.env.DB, id);
  if (!updated) return c.json(fail('NOT_FOUND', 'Notification not found or already read'), 404);
  return c.json(ok({ id, read: true }));
});

adminNotificationsRouter.post('/read-all', async (c) => {
  const count = await markAllAdminNotificationsRead(c.env.DB);
  return c.json(ok({ marked_read: count }));
});
