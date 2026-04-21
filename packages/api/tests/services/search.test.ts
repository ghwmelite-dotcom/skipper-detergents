import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { searchProducts, sanitizeFtsQuery } from '../../src/services/search';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [{ id: 'c1', name: 'D', slug: 'd' }]);
  await seedProducts(env.DB, [
    { id: 'p1', name: 'Skipper Liquid Detergent', slug: 'p1', description: 'Ocean fresh scent', category_id: 'c1', brand: 'Skipper', unit_price: 45, tags: 'liquid,detergent,fresh' },
    { id: 'p2', name: 'Ariel Powder', slug: 'p2', description: 'Stain remover', category_id: 'c1', brand: 'Ariel', unit_price: 62, tags: 'powder,stain' },
    { id: 'p3', name: 'Softcare Toilet Roll', slug: 'p3', description: '2-ply soft rolls', category_id: 'c1', brand: 'Softcare', unit_price: 35, tags: 'toilet,soft' },
  ]);
});

describe('sanitizeFtsQuery', () => {
  it('lowercases and trims', () => {
    expect(sanitizeFtsQuery('  SKIPPER  ')).toBe('skipper*');
  });

  it('strips FTS special characters', () => {
    expect(sanitizeFtsQuery('"drop table" -- ')).toBe('drop table*');
  });

  it('collapses whitespace', () => {
    expect(sanitizeFtsQuery('soft   soft')).toBe('soft soft*');
  });

  it('removes leading asterisk from individual tokens but adds trailing prefix glob', () => {
    expect(sanitizeFtsQuery('skip')).toBe('skip*');
    expect(sanitizeFtsQuery('skip omo')).toBe('skip omo*');
  });
});

describe('searchProducts', () => {
  it('finds products by name prefix', async () => {
    const results = await searchProducts(env.DB, 'skip', 20);
    expect(results.map((p) => p.id)).toContain('p1');
  });

  it('finds products by tag', async () => {
    const results = await searchProducts(env.DB, 'stain', 20);
    expect(results.map((p) => p.id)).toContain('p2');
  });

  it('returns an empty array for no matches', async () => {
    const results = await searchProducts(env.DB, 'zzzzzzzz', 20);
    expect(results).toEqual([]);
  });

  it('respects the limit', async () => {
    const results = await searchProducts(env.DB, 'soft', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('excludes inactive products', async () => {
    await env.DB.prepare(`UPDATE products SET is_active = 0 WHERE id = ?`).bind('p1').run();
    const results = await searchProducts(env.DB, 'skipper', 20);
    expect(results.find((p) => p.id === 'p1')).toBeUndefined();
  });
});
