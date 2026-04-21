import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { listCategories, getCategoryBySlugWithProducts } from '../../src/services/categories';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [
    { id: 'c1', name: 'Detergents', slug: 'detergents', sort_order: 1 },
    { id: 'c2', name: 'Toilet Paper', slug: 'toilet-paper', sort_order: 2 },
    { id: 'c3', name: 'Hidden', slug: 'hidden', sort_order: 3, is_active: 0 },
  ]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'A',
      slug: 'a',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 10,
    },
    {
      id: 'p2',
      name: 'B',
      slug: 'b',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 20,
    },
    {
      id: 'p3',
      name: 'C',
      slug: 'c',
      description: 'x',
      category_id: 'c2',
      brand: 'S',
      unit_price: 30,
    },
  ]);
});

describe('listCategories', () => {
  it('returns only active categories with product counts', async () => {
    const cats = await listCategories(env.DB);
    expect(cats.map((c) => c.slug)).toEqual(['detergents', 'toilet-paper']);
    expect(cats.find((c) => c.slug === 'detergents')?.product_count).toBe(2);
    expect(cats.find((c) => c.slug === 'toilet-paper')?.product_count).toBe(1);
  });

  it('orders by sort_order', async () => {
    const cats = await listCategories(env.DB);
    expect(cats.map((c) => c.sort_order)).toEqual([1, 2]);
  });
});

describe('getCategoryBySlugWithProducts', () => {
  it('returns category + products', async () => {
    const result = await getCategoryBySlugWithProducts(env.DB, 'detergents', {
      page: 1,
      per_page: 20,
    });
    expect(result).not.toBeNull();
    expect(result!.category.slug).toBe('detergents');
    expect(result!.products.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    expect(result!.total).toBe(2);
  });

  it('returns null for unknown or inactive slug', async () => {
    expect(
      await getCategoryBySlugWithProducts(env.DB, 'nope', { page: 1, per_page: 20 }),
    ).toBeNull();
    expect(
      await getCategoryBySlugWithProducts(env.DB, 'hidden', { page: 1, per_page: 20 }),
    ).toBeNull();
  });

  it('paginates the products list', async () => {
    const p1 = await getCategoryBySlugWithProducts(env.DB, 'detergents', { page: 1, per_page: 1 });
    const p2 = await getCategoryBySlugWithProducts(env.DB, 'detergents', { page: 2, per_page: 1 });
    expect(p1!.products).toHaveLength(1);
    expect(p2!.products).toHaveLength(1);
    expect(p1!.total).toBe(2);
  });
});
