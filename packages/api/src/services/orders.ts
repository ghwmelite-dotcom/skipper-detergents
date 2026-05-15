import type {
  Order,
  OrderItem,
  OrderWithItems,
  PaymentMethod,
  DeliveryMethod,
} from '@skipper/shared';
import { generateOrderNumber } from '@skipper/shared';
import { HTTPException } from 'hono/http-exception';
import { first, all } from '../utils/db';
import type { PricedCart } from './pricing';

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function dayKey(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export async function nextOrderNumber(db: D1Database, now: Date): Promise<string> {
  const day = dayKey(now);
  const results = await db.batch([
    db
      .prepare(`INSERT OR IGNORE INTO order_number_sequence (day, next_seq) VALUES (?, 1)`)
      .bind(day),
    db
      .prepare(
        `UPDATE order_number_sequence SET next_seq = next_seq + 1 WHERE day = ? RETURNING next_seq - 1 AS seq`,
      )
      .bind(day),
  ]);
  const seqRow = results[1]?.results?.[0] as { seq: number } | undefined;
  const seq = seqRow?.seq ?? 1;
  return generateOrderNumber(now, seq);
}

export interface CreateOrderInput {
  cart: PricedCart;
  payment_method: PaymentMethod;
  delivery_method: DeliveryMethod;
  delivery_name: string;
  delivery_email?: string;
  delivery_phone: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_region?: string;
  delivery_gps?: string;
  delivery_notes?: string;
  delivery_fee: number;
  now: Date;
  ip_address?: string;
  user_agent?: string;
}

async function upsertCustomerId(
  db: D1Database,
  email: string,
  name: string,
  phone: string,
): Promise<string> {
  const existing = await first<{ id: string }>(db, `SELECT id FROM customers WHERE email = ?`, [
    email,
  ]);
  if (existing) return existing.id;
  const id = idHex();
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');
  await db
    .prepare(
      `INSERT INTO customers (id, email, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, email, firstName ?? name, lastName || null, phone)
    .run();
  return id;
}

export async function createOrder(db: D1Database, input: CreateOrderInput): Promise<Order> {
  const email = input.delivery_email?.toLowerCase() ?? '';
  // Only link to a customer record when we actually have an email — it's the
  // natural key. Anonymous orders stay with customer_id = null.
  const customer_id = email
    ? await upsertCustomerId(db, email, input.delivery_name, input.delivery_phone)
    : null;

  const order_number = await nextOrderNumber(db, input.now);
  const order_id = idHex();

  const total_amount = input.cart.subtotal + input.delivery_fee;

  const statements: D1PreparedStatement[] = [];

  statements.push(
    db
      .prepare(
        `INSERT INTO orders (
          id, order_number, customer_id, status, payment_method, payment_status,
          subtotal, bulk_discount, delivery_fee, tax_amount, total_amount,
          delivery_method, delivery_name, delivery_email, delivery_phone,
          delivery_address, delivery_city, delivery_region, delivery_gps, delivery_notes,
          ip_address, user_agent
        ) VALUES (?, ?, ?, 'pending', ?, 'unpaid', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        order_id,
        order_number,
        customer_id,
        input.payment_method,
        input.cart.subtotal,
        input.cart.bulk_discount,
        input.delivery_fee,
        total_amount,
        input.delivery_method,
        input.delivery_name,
        email,
        input.delivery_phone,
        input.delivery_address ?? null,
        input.delivery_city ?? null,
        input.delivery_region ?? null,
        input.delivery_gps ?? null,
        input.delivery_notes ?? null,
        input.ip_address ?? null,
        input.user_agent ?? null,
      ),
  );

  for (const li of input.cart.line_items) {
    statements.push(
      db
        .prepare(
          `INSERT INTO order_items (
            id, order_id, product_id, variant_id, product_name, variant_name, sku,
            quantity, unit_price, is_bulk_order, bulk_tier_id, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          idHex(),
          order_id,
          li.product_id,
          li.variant_id,
          li.product_name,
          li.variant_name,
          li.sku,
          li.quantity,
          li.unit_price,
          li.is_bulk_order,
          li.bulk_tier_id,
          li.line_total,
        ),
    );
    statements.push(
      db
        .prepare(
          `UPDATE products SET stock_quantity = stock_quantity - ?, total_sold = total_sold + ?
           WHERE id = ? AND stock_quantity >= ?
           RETURNING id`,
        )
        .bind(li.quantity, li.quantity, li.product_id, li.quantity),
    );
  }

  const results = await db.batch<{ id: string }>(statements);

  for (let i = 0; i < results.length; i++) {
    const r = results[i] ?? null;
    if (!r?.success) {
      throw new HTTPException(409, { message: 'Failed to place order' });
    }
  }

  // Stock updates use `RETURNING id` — an empty results array means the
  // `stock_quantity >= ?` guard failed and no row was updated. D1 treats this
  // as success (zero rows is not an error), so the order + items + any earlier
  // stock decrements have already committed. We need to compensate by undoing
  // the partial state before raising.
  const failedItems: number[] = [];
  for (let i = 0; i < input.cart.line_items.length; i++) {
    const stockUpdateIdx = 1 + i * 2 + 1;
    const r = results[stockUpdateIdx] ?? null;
    if (!r?.results || r.results.length !== 1) {
      failedItems.push(i);
    }
  }

  if (failedItems.length > 0) {
    const compensations: D1PreparedStatement[] = [];
    // Roll back the stock decrements that succeeded — anything not in
    // failedItems came back with exactly one updated row.
    for (let i = 0; i < input.cart.line_items.length; i++) {
      if (failedItems.includes(i)) continue;
      const li = input.cart.line_items[i];
      if (!li) continue;
      compensations.push(
        db
          .prepare(
            `UPDATE products SET stock_quantity = stock_quantity + ?, total_sold = total_sold - ? WHERE id = ?`,
          )
          .bind(li.quantity, li.quantity, li.product_id),
      );
    }
    compensations.push(db.prepare(`DELETE FROM order_items WHERE order_id = ?`).bind(order_id));
    compensations.push(db.prepare(`DELETE FROM orders WHERE id = ?`).bind(order_id));
    await db.batch(compensations);
    throw new HTTPException(409, { message: 'Insufficient stock' });
  }

  const order = await first<Order>(db, `SELECT * FROM orders WHERE id = ?`, [order_id]);
  if (!order) {
    throw new HTTPException(500, { message: 'Order vanished after insert' });
  }
  return order;
}

/**
 * Reduce a phone string to just its digits so `"+233 244 123 456"` and
 * `"0244123456"` compare cleanly. Matches on the last 9 digits so Ghana
 * numbers with/without the `+233` country prefix both resolve.
 */
function phoneDigits(value: string): string {
  return value.replace(/\D+/g, '').slice(-9);
}

export async function getOrderForCustomer(
  db: D1Database,
  orderNumber: string,
  by: { email?: string; phone?: string },
): Promise<OrderWithItems | null> {
  let order: Order | null = null;
  if (by.email) {
    order = await first<Order>(
      db,
      `SELECT * FROM orders WHERE order_number = ? AND LOWER(delivery_email) = LOWER(?)`,
      [orderNumber, by.email],
    );
  } else if (by.phone) {
    const digits = phoneDigits(by.phone);
    if (digits.length < 7) return null;
    // Load the order by number first, then match phone digits server-side —
    // simpler and safer than trying to do the digit-normalization in SQLite.
    const candidate = await first<Order>(
      db,
      `SELECT * FROM orders WHERE order_number = ?`,
      [orderNumber],
    );
    if (candidate && phoneDigits(candidate.delivery_phone) === digits) {
      order = candidate;
    }
  }
  if (!order) return null;
  const items = await all<OrderItem>(
    db,
    `SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC`,
    [order.id],
  );
  return { ...order, items };
}

export async function updateOrderProof(
  db: D1Database,
  orderId: string,
  proofUrl: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE orders SET manual_payment_proof_url = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(proofUrl, orderId)
    .run();
  return (result.meta?.changes ?? 0) === 1;
}
