import { all } from '../utils/db';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const STATIC_ENTRIES: Array<Omit<SitemapUrl, 'loc'> & { path: string }> = [
  { path: '/', changefreq: 'daily', priority: 1.0 },
  { path: '/shop', changefreq: 'daily', priority: 0.9 },
  { path: '/bulk', changefreq: 'weekly', priority: 0.8 },
  { path: '/about', changefreq: 'monthly', priority: 0.5 },
  { path: '/contact', changefreq: 'monthly', priority: 0.5 },
  { path: '/faq', changefreq: 'monthly', priority: 0.5 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
];

export async function buildSitemapUrls(db: D1Database, baseUrl: string): Promise<SitemapUrl[]> {
  const trimmed = baseUrl.replace(/\/$/, '');
  const urls: SitemapUrl[] = STATIC_ENTRIES.map(({ path, ...rest }) => ({
    ...rest,
    loc: `${trimmed}${path}`,
  }));

  const [categories, products] = await Promise.all([
    all<{ slug: string; updated_at: string }>(
      db,
      `SELECT slug, updated_at FROM categories WHERE is_active = 1`,
      [],
    ),
    all<{ slug: string; updated_at: string }>(
      db,
      `SELECT slug, updated_at FROM products WHERE is_active = 1`,
      [],
    ),
  ]);

  for (const cat of categories) {
    const catEntry: SitemapUrl = {
      loc: `${trimmed}/shop/${cat.slug}`,
      changefreq: 'weekly',
      priority: 0.7,
    };
    const catLastmod = cat.updated_at.split(' ')[0];
    if (catLastmod) catEntry.lastmod = catLastmod;
    urls.push(catEntry);
  }
  for (const prod of products) {
    const prodEntry: SitemapUrl = {
      loc: `${trimmed}/product/${prod.slug}`,
      changefreq: 'weekly',
      priority: 0.6,
    };
    const prodLastmod = prod.updated_at.split(' ')[0];
    if (prodLastmod) prodEntry.lastmod = prodLastmod;
    urls.push(prodEntry);
  }

  return urls;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderSitemapXml(urls: SitemapUrl[]): string {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const u of urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(u.loc)}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${u.lastmod}</lastmod>`);
    if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
    if (u.priority !== undefined) lines.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n');
}
