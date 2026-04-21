import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [{ id: 'c1', name: 'D', slug: 'detergents' }]);
  await seedProducts(env.DB, [
    {
      id: 'p1',
      name: 'A',
      slug: 'skipper-2l',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 45,
    },
  ]);
});

describe('GET /api/sitemap.xml', () => {
  it('returns XML with correct content type', async () => {
    const res = await app.request('/api/sitemap.xml', {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/xml');
    const xml = await res.text();
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain('<urlset');
  });

  it('includes product + category URLs', async () => {
    const res = await app.request('/api/sitemap.xml', {}, env);
    const xml = await res.text();
    expect(xml).toContain('/shop/detergents</loc>');
    expect(xml).toContain('/product/skipper-2l</loc>');
  });
});
