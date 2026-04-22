import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { ok } from '../../utils/response';
import { adminAuth, type AdminVariables } from '../../middleware/adminAuth';
import { all, first } from '../../utils/db';

export const adminDashboardRouter = new Hono<{ Bindings: Env; Variables: AdminVariables }>();
adminDashboardRouter.use('*', adminAuth);

interface PeriodStats {
  revenue: number;
  orders: number;
  new_customers?: number;
}

adminDashboardRouter.get('/stats', async (c) => {
  const db = c.env.DB;

  // All stats are against paid/non-cancelled orders.
  // Today (UTC): orders where date(created_at) = date('now')
  const [today, last7, last30, lowStockRows, recent, topProducts] = await Promise.all([
    first<PeriodStats & { new_customers: number }>(
      db,
      `SELECT
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END), 0) AS orders,
         (SELECT COUNT(*) FROM customers WHERE date(created_at) = date('now')) AS new_customers
       FROM orders
       WHERE date(created_at) = date('now')`,
      [],
    ),
    first<PeriodStats>(
      db,
      `SELECT
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END), 0) AS orders
       FROM orders
       WHERE created_at >= datetime('now', '-7 days')`,
      [],
    ),
    first<PeriodStats>(
      db,
      `SELECT
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END), 0) AS orders
       FROM orders
       WHERE created_at >= datetime('now', '-30 days')`,
      [],
    ),
    all<{ id: string; name: string; stock_quantity: number; low_stock_threshold: number }>(
      db,
      `SELECT id, name, stock_quantity, low_stock_threshold
         FROM products
        WHERE is_active = 1
          AND stock_quantity <= low_stock_threshold
        ORDER BY stock_quantity ASC
        LIMIT 5`,
      [],
    ),
    all(
      db,
      `SELECT
         o.id, o.order_number, o.created_at, o.status, o.payment_status,
         o.total_amount, o.delivery_name, o.delivery_email, o.payment_method
       FROM orders o
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [],
    ),
    all<{ product_id: string; name: string; units_sold: number; revenue: number }>(
      db,
      `SELECT oi.product_id,
              COALESCE(p.name, oi.product_name) AS name,
              SUM(oi.quantity) AS units_sold,
              SUM(oi.line_total) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.created_at >= datetime('now', '-30 days')
          AND o.status != 'cancelled'
        GROUP BY oi.product_id
        ORDER BY units_sold DESC
        LIMIT 5`,
      [],
    ),
  ]);

  return c.json(
    ok({
      today: {
        revenue: today?.revenue ?? 0,
        orders: today?.orders ?? 0,
        new_customers: today?.new_customers ?? 0,
      },
      last_7d: {
        revenue: last7?.revenue ?? 0,
        orders: last7?.orders ?? 0,
      },
      last_30d: {
        revenue: last30?.revenue ?? 0,
        orders: last30?.orders ?? 0,
      },
      low_stock: lowStockRows,
      recent_orders: recent,
      top_products_30d: topProducts,
    }),
  );
});

adminDashboardRouter.get('/revenue', async (c) => {
  const period = c.req.query('period') ?? '30d';
  let days = 30;
  if (period === '7d') days = 7;
  else if (period === '90d') days = 90;

  const rows = await all<{ day: string; revenue: number; orders: number }>(
    c.env.DB,
    `SELECT date(created_at) AS day,
            COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END), 0) AS orders
       FROM orders
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY day
      ORDER BY day ASC`,
    [days],
  );

  // Fill gaps so the chart has an entry per day.
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const result: { day: string; revenue: number; orders: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    const row = byDay.get(day);
    result.push({ day, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 });
  }

  return c.json(ok({ period, series: result }));
});
