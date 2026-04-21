import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [
    { id: 'c1', name: 'Detergents', slug: 'detergents', sort_order: 1 },
    { id: 'c2', name: 'Tissue', slug: 'tissue', sort_order: 2 },
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
  ]);
});

describe('GET /api/categories', () => {
  it('returns all active categories with product_count', async () => {
    const res = await app.request('/api/categories', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{ data: Array<{ slug: string; product_count: number }> }>();
    expect(body.data.map((c) => c.slug)).toEqual(['detergents', 'tissue']);
    expect(body.data.find((c) => c.slug === 'detergents')?.product_count).toBe(1);
  });
});

describe('GET /api/categories/:slug/products', () => {
  it('returns category + products', async () => {
    const res = await app.request('/api/categories/detergents/products', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: { category: { slug: string }; products: Array<{ id: string }> };
      meta: { total: number };
    }>();
    expect(body.data.category.slug).toBe('detergents');
    expect(body.data.products.map((p) => p.id)).toEqual(['p1']);
    expect(body.meta.total).toBe(1);
  });

  it('returns 404 for unknown category', async () => {
    const res = await app.request('/api/categories/nope/products', {}, env);
    expect(res.status).toBe(404);
  });
});
