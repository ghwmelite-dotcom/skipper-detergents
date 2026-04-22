import type {
  Order,
  OrderItem,
  OrderStatus,
  Customer,
  ActivityLogEntry,
} from '@skipper/shared';
import { all, first, run } from '../utils/db';

export interface AdminOrderListQuery {
  page: number;
  per_page: number;
  status?: OrderStatus | undefined;
  payment_method?: string | undefined;
  payment_status?: string | undefined;
  search?: string | undefined;
  date_from?: string | undefined;
  date_to?: string | undefined;
}

export interface AdminOrderListItem extends Order {
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  item_count: number;
}

export async function adminListOrders(
  db: D1Database,
  query: AdminOrderListQuery,
): Promise<{ orders: AdminOrderListItem[]; total: number }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (query.status) {
    clauses.push('o.status = ?');
    params.push(query.status);
  }
  if (query.payment_method) {
    clauses.push('o.payment_method = ?');
    params.push(query.payment_method);
  }
  if (query.payment_status) {
    clauses.push('o.payment_status = ?');
    params.push(query.payment_status);
  }
  if (query.search) {
    clauses.push(
      '(LOWER(o.order_number) LIKE ? OR LOWER(o.delivery_name) LIKE ? OR LOWER(o.delivery_email) LIKE ?)',
    );
    const q = `%${query.search.toLowerCase()}%`;
    params.push(q, q, q);
  }
  if (query.date_from) {
    clauses.push('o.created_at >= ?');
    params.push(query.date_from);
  }
  if (query.date_to) {
    clauses.push('o.created_at <= ?');
    params.push(query.date_to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const offset = (query.page - 1) * query.per_page;

  const listSql = `
    SELECT
      o.*,
      c.email AS customer_email,
      c.first_name AS customer_first_name,
      c.last_name AS customer_last_name,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const countSql = `SELECT COUNT(*) AS n FROM orders o ${where}`;

  const [orders, totalRow] = await Promise.all([
    all<AdminOrderListItem>(db, listSql, [...params, query.per_page, offset]),
    first<{ n: number }>(db, countSql, params),
  ]);
  return { orders, total: totalRow?.n ?? 0 };
}

export interface AdminOrderDetail extends Order {
  items: (OrderItem & { primary_image_url: string | null })[];
  customer: Customer | null;
  activity: ActivityLogEntry[];
}

export async function adminGetOrder(
  db: D1Database,
  id: string,
): Promise<AdminOrderDetail | null> {
  const order = await first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [id]);
  if (!order) return null;
  const [items, customer, activity] = await Promise.all([
    all<OrderItem & { primary_image_url: string | null }>(
      db,
      `SELECT oi.*,
              (SELECT url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS primary_image_url
         FROM order_items oi
        WHERE oi.order_id = ?
        ORDER BY oi.created_at ASC`,
      [id],
    ),
    order.customer_id
      ? first<Customer>(db, `SELECT * FROM customers WHERE id = ?`, [order.customer_id])
      : Promise.resolve(null),
    all<ActivityLogEntry>(
      db,
      `SELECT * FROM activity_log WHERE entity_type = 'order' AND entity_id = ? ORDER BY created_at DESC LIMIT 50`,
      [id],
    ),
  ]);
  return { ...order, items, customer, activity };
}

export async function adminUpdateOrderStatus(
  db: D1Database,
  orderId: string,
  status: OrderStatus,
  tracking_number?: string,
  tracking_url?: string,
): Promise<Order | null> {
  const existing = await first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);
  if (!existing) return null;

  // Stock is deducted on order creation. If this transition moves the order
  // into cancelled/refunded for the first time, give that stock back. The
  // `existing.status` check keeps it idempotent — a second PATCH to cancelled
  // won't double-restock.
  const wasLive = existing.status !== 'cancelled' && existing.status !== 'refunded';
  const nowDead = status === 'cancelled' || status === 'refunded';
  const shouldRestock = wasLive && nowDead;

  const sets: string[] = [`status = ?`, `updated_at = datetime('now')`];
  const params: unknown[] = [status];

  if (tracking_number !== undefined) {
    sets.push('tracking_number = ?');
    params.push(tracking_number);
  }
  if (tracking_url !== undefined) {
    sets.push('tracking_url = ?');
    params.push(tracking_url);
  }
  if (status === 'delivered') {
    sets.push(`delivered_at = datetime('now')`);
  }

  if (shouldRestock) {
    const items = await all<{ product_id: string; quantity: number }>(
      db,
      `SELECT product_id, quantity FROM order_items WHERE order_id = ?`,
      [orderId],
    );
    const statements: D1PreparedStatement[] = [
      db
        .prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`)
        .bind(...params, orderId),
    ];
    for (const item of items) {
      statements.push(
        db
          .prepare(
            `UPDATE products
               SET stock_quantity = stock_quantity + ?,
                   total_sold    = MAX(total_sold - ?, 0),
                   updated_at    = datetime('now')
             WHERE id = ?`,
          )
          .bind(item.quantity, item.quantity, item.product_id),
      );
    }
    await db.batch(statements);
  } else {
    await run(db, `UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, [...params, orderId]);
  }

  return first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);
}

export async function adminConfirmManualPayment(
  db: D1Database,
  orderId: string,
  adminId: string,
): Promise<Order | null> {
  const existing = await first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);
  if (!existing) return null;
  await run(
    db,
    `UPDATE orders
       SET payment_status = 'paid',
           status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
           manual_payment_confirmed_at = datetime('now'),
           manual_payment_confirmed_by = ?,
           updated_at = datetime('now')
     WHERE id = ?`,
    [adminId, orderId],
  );
  return first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);
}

export async function adminUpdateDeliveryFee(
  db: D1Database,
  orderId: string,
  deliveryFee: number,
): Promise<Order | null> {
  const existing = await first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);
  if (!existing) return null;
  // We only let the admin adjust fees while the order is still unpaid.
  // Anything else (refund, partial adjustment) is a different operation.
  if (existing.payment_status === 'paid') return null;
  const newTotal = existing.subtotal - (existing.bulk_discount ?? 0) + deliveryFee;
  await run(
    db,
    `UPDATE orders
        SET delivery_fee = ?,
            total_amount = ?,
            updated_at   = datetime('now')
      WHERE id = ?`,
    [deliveryFee, newTotal, orderId],
  );
  return first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);
}

export async function adminAppendOrderNote(
  db: D1Database,
  orderId: string,
  text: string,
  adminName: string,
): Promise<Order | null> {
  const existing = await first<Order>(db, `SELECT notes FROM orders WHERE id = ?`, [orderId]);
  if (!existing) return null;
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${adminName}: ${text}`;
  const merged = existing.notes ? `${existing.notes}\n${line}` : line;
  await run(
    db,
    `UPDATE orders SET notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [merged, orderId],
  );
  return first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);
}
