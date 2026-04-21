import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { buildSitemapUrls, renderSitemapXml } from '../../src/services/sitemap';
import { resetDatabase, seedCategories, seedProducts } from '../helpers/db-fixtures';

beforeEach(async () => {
  await resetDatabase(env.DB);
  await seedCategories(env.DB, [
    { id: 'c1', name: 'D', slug: 'detergents' },
    { id: 'c2', name: 'T', slug: 'toilet-paper', is_active: 0 },
  ]);
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
    {
      id: 'p2',
      name: 'B',
      slug: 'hidden',
      description: 'x',
      category_id: 'c1',
      brand: 'S',
      unit_price: 20,
      is_active: 0,
    },
  ]);
});

describe('buildSitemapUrls', () => {
  it('includes static home + shop + bulk + static info pages', async () => {
    const urls = await buildSitemapUrls(env.DB, 'https://skipper.test');
    const paths = urls.map((u) => u.loc);
    expect(paths).toContain('https://skipper.test/');
    expect(paths).toContain('https://skipper.test/shop');
    expect(paths).toContain('https://skipper.test/bulk');
    expect(paths).toContain('https://skipper.test/about');
    expect(paths).toContain('https://skipper.test/contact');
    expect(paths).toContain('https://skipper.test/faq');
  });

  it('includes only active category slugs', async () => {
    const urls = await buildSitemapUrls(env.DB, 'https://skipper.test');
    const paths = urls.map((u) => u.loc);
    expect(paths).toContain('https://skipper.test/shop/detergents');
    expect(paths).not.toContain('https://skipper.test/shop/toilet-paper');
  });

  it('includes only active product slugs', async () => {
    const urls = await buildSitemapUrls(env.DB, 'https://skipper.test');
    const paths = urls.map((u) => u.loc);
    expect(paths).toContain('https://skipper.test/product/skipper-2l');
    expect(paths).not.toContain('https://skipper.test/product/hidden');
  });
});

describe('renderSitemapXml', () => {
  it('produces valid <urlset> XML', () => {
    const xml = renderSitemapXml([
      { loc: 'https://skipper.test/', lastmod: '2026-04-21', changefreq: 'daily', priority: 1.0 },
      { loc: 'https://skipper.test/product/a', lastmod: '2026-04-20' },
    ]);
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://skipper.test/</loc>');
    expect(xml).toContain('<lastmod>2026-04-21</lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>1.0</priority>');
    expect(xml.endsWith('</urlset>')).toBe(true);
  });

  it('XML-escapes special characters in loc', () => {
    const xml = renderSitemapXml([{ loc: 'https://skipper.test/shop?q=a&b' }]);
    expect(xml).toContain('<loc>https://skipper.test/shop?q=a&amp;b</loc>');
  });
});
