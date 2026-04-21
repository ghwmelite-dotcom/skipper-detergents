import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { HTTPException } from 'hono/http-exception';
import { validateAndPriceCart } from '../../src/services/pricing';
import { resetDatabase, seedCategories, seedProducts, seedBulkTiers } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [{ id: 'c1', name: 'D', slug: 'd' }]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'Skipper 2L',
      slug: 'p1',
      description: 'x',
      category_id: 'c1',
      brand: 'Skipper',
      unit_price: 45,
      stock_quantity: 100,
      is_bulk_available: 1,
    },
    {
      id: 'p2',
      name: 'Tissue',
      slug: 'p2',
      description: 'x',
      category_id: 'c1',
      brand: 'Premier',
      unit_price: 12,
      stock_quantity: 50,
    },
    {
      id: 'p3',
      name: 'Out of stock',
      slug: 'p3',
      description: 'x',
      category_id: 'c1',
      brand: 'X',
      unit_price: 10,
      stock_quantity: 0,
    },
    {
      id: 'p4',
      name: 'Inactive',
      slug: 'p4',
      description: 'x',
      category_id: 'c1',
      brand: 'X',
      unit_price: 5,
      stock_quantity: 100,
      is_active: 0,
    },
  ]);
  await seedBulkTiers(env.DB, [
    { id: 'b1', product_id: 'p1', min_quantity: 10, max_quantity: 49, unit_price: 38 },
    { id: 'b2', product_id: 'p1', min_quantity: 50, max_quantity: null, unit_price: 33 },
  ]);
});

describe('validateAndPriceCart', () => {
  it('prices a single non-bulk item at unit_price', async () => {
    const result = await validateAndPriceCart(env.DB, [{ product_id: 'p2', quantity: 3 }]);
    expect(result.subtotal).toBe(36);
    expect(result.bulk_discount).toBe(0);
    expect(result.line_items).toHaveLength(1);
    expect(result.line_items[0]).toMatchObject({
      product_id: 'p2',
      quantity: 3,
      unit_price: 12,
      line_total: 36,
      is_bulk_order: 0,
      bulk_tier_id: null,
    });
  });

  it('applies bulk pricing when quantity hits a tier', async () => {
    const result = await validateAndPriceCart(env.DB, [{ product_id: 'p1', quantity: 20 }]);
    // base: 20 * 45 = 900; bulk: 20 * 38 = 760; discount = 140
    expect(result.subtotal).toBe(760);
    expect(result.bulk_discount).toBe(140);
    expect(result.line_items[0]).toMatchObject({
      unit_price: 38,
      is_bulk_order: 1,
      bulk_tier_id: 'b1',
    });
  });

  it('uses the unbounded tier for quantities above all max_quantity', async () => {
    const result = await validateAndPriceCart(env.DB, [{ product_id: 'p1', quantity: 60 }]);
    expect(result.line_items[0]?.unit_price).toBe(33);
    expect(result.line_items[0]?.bulk_tier_id).toBe('b2');
  });

  it('sums across multiple items', async () => {
    const result = await validateAndPriceCart(env.DB, [
      { product_id: 'p1', quantity: 2 },
      { product_id: 'p2', quantity: 5 },
    ]);
    expect(result.subtotal).toBe(150);
    expect(result.line_items).toHaveLength(2);
  });

  it('throws when product does not exist', async () => {
    await expect(
      validateAndPriceCart(env.DB, [{ product_id: 'nope', quantity: 1 }]),
    ).rejects.toThrow(HTTPException);
  });

  it('throws when product is inactive', async () => {
    await expect(validateAndPriceCart(env.DB, [{ product_id: 'p4', quantity: 1 }])).rejects.toThrow(
      HTTPException,
    );
  });

  it('throws when stock is insufficient', async () => {
    await expect(validateAndPriceCart(env.DB, [{ product_id: 'p3', quantity: 1 }])).rejects.toThrow(
      HTTPException,
    );
    await expect(
      validateAndPriceCart(env.DB, [{ product_id: 'p2', quantity: 999 }]),
    ).rejects.toThrow(HTTPException);
  });

  it('throws when items is empty', async () => {
    await expect(validateAndPriceCart(env.DB, [])).rejects.toThrow(HTTPException);
  });
});
