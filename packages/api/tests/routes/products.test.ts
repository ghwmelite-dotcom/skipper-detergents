import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import {
  resetDatabase,
  seedCategories,
  seedProducts,
  seedImages,
  seedBulkTiers,
} from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [{ id: 'c1', name: 'D', slug: 'd', sort_order: 1 }]);
  await seedProducts(env.DB, [
    { id: 'p1', name: 'Alpha', slug: 'alpha', description: 'first', category_id: 'c1', brand: 'S', unit_price: 10, is_featured: 1, is_bulk_available: 1, tags: 'alpha,first' },
    { id: 'p2', name: 'Beta', slug: 'beta', description: 'second', category_id: 'c1', brand: 'A', unit_price: 20, tags: 'beta' },
  ]);
  await seedImages(env.DB, [{ id: 'i1', product_id: 'p1', url: 'https://example/a.jpg', is_primary: 1 }]);
  await seedBulkTiers(env.DB, [{ id: 'b1', product_id: 'p1', min_quantity: 10, max_quantity: null, unit_price: 8 }]);
});

describe('GET /api/products', () => {
  it('returns envelope with data + meta', async () => {
    const res = await app.request('/api/products', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      success: boolean;
      data: unknown[];
      meta: { page: number; per_page: number; total: number };
    }>();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.total).toBe(2);
  });

  it('filters by brand query param', async () => {
    const res = await app.request('/api/products?brand=A', {}, env);
    const body = await res.json<{ data: Array<{ id: string }> }>();
    expect(body.data.map((p) => p.id)).toEqual(['p2']);
  });

  it('rejects invalid per_page', async () => {
    const res = await app.request('/api/products?per_page=9999', {}, env);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/featured', () => {
  it('returns only featured products', async () => {
    const res = await app.request('/api/products/featured', {}, env);
    const body = await res.json<{ data: Array<{ id: string }> }>();
    expect(body.data.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('GET /api/products/search', () => {
  it('returns matches and 400 when q missing', async () => {
    const hit = await app.request('/api/products/search?q=alph', {}, env);
    expect(hit.status).toBe(200);
    const body = await hit.json<{ data: Array<{ id: string }> }>();
    expect(body.data.map((p) => p.id)).toContain('p1');

    const missing = await app.request('/api/products/search', {}, env);
    expect(missing.status).toBe(400);
  });
});

describe('GET /api/products/:slug', () => {
  it('returns a product with relations', async () => {
    const res = await app.request('/api/products/alpha', {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: {
        id: string;
        images: Array<{ url: string }>;
        bulk_tiers: Array<{ id: string }>;
        variants: unknown[];
      };
    }>();
    expect(body.data.id).toBe('p1');
    expect(body.data.images).toHaveLength(1);
    expect(body.data.bulk_tiers).toHaveLength(1);
    expect(body.data.variants).toEqual([]);
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await app.request('/api/products/nope', {}, env);
    expect(res.status).toBe(404);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
