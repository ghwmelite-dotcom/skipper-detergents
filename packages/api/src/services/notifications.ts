import type { AdminNotification, AdminNotificationType } from '@skipper/shared';
import { all, first, run } from '../utils/db';

export interface CreateNotificationInput {
  type: AdminNotificationType;
  title: string;
  entity_type?: string;
  entity_id?: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append a notification to the admin feed. Never throws — any DB failure
 * is logged and swallowed so the triggering workflow (order creation,
 * webhook, etc.) doesn't fail because the feed has a hiccup.
 */
export async function createAdminNotification(
  db: D1Database,
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await run(
      db,
      `INSERT INTO admin_notifications (type, title, entity_type, entity_id, body, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.type,
        input.title,
        input.entity_type ?? null,
        input.entity_id ?? null,
        input.body ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    );
  } catch (err) {
    console.error('[notifications] insert failed', err);
  }
}

export async function listAdminNotifications(
  db: D1Database,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<AdminNotification[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const where = options.unreadOnly ? 'WHERE read_at IS NULL' : '';
  return all<AdminNotification>(
    db,
    `SELECT id, type, entity_type, entity_id, title, body, metadata, read_at, created_at
       FROM admin_notifications
       ${where}
       ORDER BY created_at DESC
       LIMIT ?`,
    [limit],
  );
}

export async function countUnreadAdminNotifications(db: D1Database): Promise<number> {
  const row = await first<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM admin_notifications WHERE read_at IS NULL`,
    [],
  );
  return row?.n ?? 0;
}

export async function markAdminNotificationRead(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const res = await run(
    db,
    `UPDATE admin_notifications SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL`,
    [id],
  );
  return (res.meta.changes ?? 0) > 0;
}

export async function markAllAdminNotificationsRead(db: D1Database): Promise<number> {
  const res = await run(
    db,
    `UPDATE admin_notifications SET read_at = datetime('now') WHERE read_at IS NULL`,
    [],
  );
  return res.meta.changes ?? 0;
}
