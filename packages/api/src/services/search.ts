import type { Product } from '@skipper/shared';
import { all } from '../utils/db';

export function sanitizeFtsQuery(q: string): string {
  const cleaned = q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return `${cleaned}*`;
}

export async function searchProducts(
  db: D1Database,
  q: string,
  limit: number,
): Promise<Product[]> {
  const ftsQuery = sanitizeFtsQuery(q);
  if (!ftsQuery) return [];

  return all<Product>(
    db,
    `SELECT p.*
     FROM products_fts fts
     JOIN products p ON p.rowid = fts.rowid
     WHERE products_fts MATCH ? AND p.is_active = 1
     ORDER BY rank
     LIMIT ?`,
    [ftsQuery, limit],
  );
}
