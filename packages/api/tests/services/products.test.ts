import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { listProducts, getFeaturedProducts, getProductBySlug } from '../../src/services/products';
import {
  resetDatabase,
  seedCategories,
  seedProducts,
  seedBulkTiers,
  seedImages,
} from '../helpers/db-fixtures';

// Miniflare auto-applies migrations from wrangler.toml `migrations_dir`
// before this test file runs, so tables already exist by beforeEach.

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [
    { id: 'c1', name: 'Detergents', slug: 'detergents', sort_order: 1 },
    { id: 'c2', name: 'Toilet Paper', slug: 'toilet-paper', sort_order: 2 },
  ]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'Skipper Liquid 2L',
      slug: 'skipper-liquid-2l',
      description: 'Liquid detergent',
      category_id: 'c1',
      brand: 'Skipper',
      unit_price: 45,
      stock_quantity: 100,
      is_featured: 1,
      is_bulk_available: 1,
      tags: 'liquid,detergent',
    },
    {
      id: 'p2',
      name: 'Ariel 3kg',
      slug: 'ariel-3kg',
      description: 'Ariel powder',
      category_id: 'c1',
      brand: 'Ariel',
      unit_price: 62,
      stock_quantity: 80,
      tags: 'powder,ariel',
    },
    {
      id: 'p3',
      name: 'Softcare 10-Pack',
      slug: 'softcare-10-pack',
      description: 'Toilet rolls',
      category_id: 'c2',
      brand: 'Softcare',
      unit_price: 35,
      stock_quantity: 200,
      is_featured: 1,
      tags: 'toilet-roll',
    },
    {
      id: 'p4',
      name: 'Inactive Product',
      slug: 'inactive',
      description: 'Hidden',
      category_id: 'c1',
      brand: 'X',
      unit_price: 10,
      is_active: 0,
    },
  ]);
  await seedImages(env.DB, [
    { id: 'i1', product_id: 'p1', url: 'https://example/p1.jpg', is_primary: 1 },
    { id: 'i2', product_id: 'p1', url: 'https://example/p1-alt.jpg', is_primary: 0 },
  ]);
  await seedBulkTiers(env.DB, [
    {
      id: 'b1',
      product_id: 'p1',
      min_quantity: 10,
      max_quantity: 49,
      unit_price: 38,
      label: 'Bulk',
    },
    {
      id: 'b2',
      product_id: 'p1',
      min_quantity: 50,
      max_quantity: null,
      unit_price: 33,
      label: 'Wholesale',
    },
  ]);
});

describe('listProducts', () => {
  it('returns only active products by default', async () => {
    const { products, total } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: false,
    });
    expect(total).toBe(3);
    expect(products.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('filters by category slug', async () => {
    const { products, total } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: false,
      category: 'toilet-paper',
    });
    expect(total).toBe(1);
    expect(products[0]?.id).toBe('p3');
  });

  it('filters by brand', async () => {
    const { products } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: false,
      brand: 'Ariel',
    });
    expect(products.map((p) => p.id)).toEqual(['p2']);
  });

  it('filters bulk_only', async () => {
    const { products } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: true,
    });
    expect(products.map((p) => p.id)).toEqual(['p1']);
  });

  it('paginates correctly', async () => {
    const page1 = await listProducts(env.DB, {
      page: 1,
      per_page: 2,
      sort: 'name_asc',
      bulk_only: false,
    });
    const page2 = await listProducts(env.DB, {
      page: 2,
      per_page: 2,
      sort: 'name_asc',
      bulk_only: false,
    });
    expect(page1.products).toHaveLength(2);
    expect(page2.products).toHaveLength(1);
    expect([...page1.products, ...page2.products].map((p) => p.id).sort()).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('sorts by price_asc', async () => {
    const { products } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'price_asc',
      bulk_only: false,
    });
    expect(products.map((p) => p.unit_price)).toEqual([35, 45, 62]);
  });

  it('respects min_price and max_price', async () => {
    const { products } = await listProducts(env.DB, {
      page: 1,
      per_page: 20,
      sort: 'newest',
      bulk_only: false,
      min_price: 40,
      max_price: 50,
    });
    expect(products.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('getFeaturedProducts', () => {
  it('returns only is_featured products', async () => {
    const products = await getFeaturedProducts(env.DB, 10);
    expect(products.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
  });

  it('respects the limit', async () => {
    const products = await getFeaturedProducts(env.DB, 1);
    expect(products).toHaveLength(1);
  });
});

describe('getProductBySlug', () => {
  it('returns product with images, bulk tiers, and variants arrays', async () => {
    const product = await getProductBySlug(env.DB, 'skipper-liquid-2l');
    expect(product).not.toBeNull();
    expect(product!.id).toBe('p1');
    expect(product!.images).toHaveLength(2);
    expect(product!.bulk_tiers).toHaveLength(2);
    expect(product!.variants).toEqual([]);
  });

  it('orders primary image first', async () => {
    const product = await getProductBySlug(env.DB, 'skipper-liquid-2l');
    expect(product!.images[0]?.is_primary).toBe(1);
  });

  it('returns null for unknown slug', async () => {
    const product = await getProductBySlug(env.DB, 'nope');
    expect(product).toBeNull();
  });

  it('returns null for inactive product', async () => {
    const product = await getProductBySlug(env.DB, 'inactive');
    expect(product).toBeNull();
  });
});
