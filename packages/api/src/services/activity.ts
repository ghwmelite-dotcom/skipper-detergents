import type { ActivityLogEntry } from '@skipper/shared';
import { all, first, run } from '../utils/db';

export interface LogActivityInput {
  admin_id: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: unknown;
  ip_address?: string | null;
}

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function logActivity(db: D1Database, input: LogActivityInput): Promise<void> {
  const id = idHex();
  const details =
    input.details === undefined
      ? null
      : typeof input.details === 'string'
        ? input.details
        : JSON.stringify(input.details);
  await run(
    db,
    `INSERT INTO activity_log (id, admin_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.admin_id,
      input.action,
      input.entity_type ?? null,
      input.entity_id ?? null,
      details,
      input.ip_address ?? null,
    ],
  );
}

export interface ActivityQuery {
  entity_type?: string | undefined;
  entity_id?: string | undefined;
  admin_id?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface ActivityListResult {
  entries: (ActivityLogEntry & { admin_name: string | null; admin_email: string | null })[];
  total: number;
}

export async function listActivity(db: D1Database, query: ActivityQuery): Promise<ActivityListResult> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (query.entity_type) {
    clauses.push('a.entity_type = ?');
    params.push(query.entity_type);
  }
  if (query.entity_id) {
    clauses.push('a.entity_id = ?');
    params.push(query.entity_id);
  }
  if (query.admin_id) {
    clauses.push('a.admin_id = ?');
    params.push(query.admin_id);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);

  const listSql = `
    SELECT a.*, u.name AS admin_name, u.email AS admin_email
    FROM activity_log a
    LEFT JOIN admin_users u ON u.id = a.admin_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const countSql = `SELECT COUNT(*) AS n FROM activity_log a ${where}`;

  const [entries, totalRow] = await Promise.all([
    all<ActivityLogEntry & { admin_name: string | null; admin_email: string | null }>(
      db,
      listSql,
      [...params, limit, offset],
    ),
    first<{ n: number }>(db, countSql, params),
  ]);
  return { entries, total: totalRow?.n ?? 0 };
}
