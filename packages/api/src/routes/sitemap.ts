import { Hono } from 'hono';
import type { Env } from '../types/env';
import { buildSitemapUrls, renderSitemapXml } from '../services/sitemap';

export const sitemapRouter = new Hono<{ Bindings: Env }>();

sitemapRouter.get('/sitemap.xml', async (c) => {
  const base = c.env.STOREFRONT_ORIGIN || 'https://skipperdetergents.com.gh';
  const urls = await buildSitemapUrls(c.env.DB, base);
  const xml = renderSitemapXml(urls);
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});
