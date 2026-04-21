import type { BulkPricingTier, CartItemInput, Product } from '@skipper/shared';
import { resolveBulkPrice } from '@skipper/shared';
import { HTTPException } from 'hono/http-exception';
import { all, first } from '../utils/db';

export interface PricedLineItem {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  is_bulk_order: 0 | 1;
  bulk_tier_id: string | null;
  line_total: number;
}

export interface PricedCart {
  line_items: PricedLineItem[];
  subtotal: number;
  bulk_discount: number;
}

export async function validateAndPriceCart(
  db: D1Database,
  items: CartItemInput[],
): Promise<PricedCart> {
  if (items.length === 0) {
    throw new HTTPException(400, { message: 'Cart is empty' });
  }

  const line_items: PricedLineItem[] = [];
  let subtotal = 0;
  let bulk_discount = 0;

  for (const item of items) {
    const product = await first<Product>(
      db,
      `SELECT * FROM products WHERE id = ? AND is_active = 1`,
      [item.product_id],
    );
    if (!product) {
      throw new HTTPException(400, {
        message: `Product ${item.product_id} is not available`,
      });
    }
    if (product.stock_quantity < item.quantity) {
      throw new HTTPException(400, {
        message: `Only ${product.stock_quantity} of ${product.name} in stock`,
      });
    }

    const tiers = await all<BulkPricingTier>(
      db,
      `SELECT * FROM bulk_pricing_tiers WHERE product_id = ? ORDER BY min_quantity ASC`,
      [product.id],
    );
    const resolved = resolveBulkPrice(item.quantity, product.unit_price, tiers);
    const unit_price = resolved.unit_price;
    const line_total = unit_price * item.quantity;
    const base_total = product.unit_price * item.quantity;

    line_items.push({
      product_id: product.id,
      variant_id: item.variant_id ?? null,
      product_name: product.name,
      variant_name: null,
      sku: product.sku,
      quantity: item.quantity,
      unit_price,
      is_bulk_order: resolved.tier ? 1 : 0,
      bulk_tier_id: resolved.tier?.id ?? null,
      line_total,
    });
    subtotal += line_total;
    bulk_discount += base_total - line_total;
  }

  return { line_items, subtotal, bulk_discount };
}
