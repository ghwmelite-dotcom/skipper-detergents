import { Hono } from 'hono';
import { productListQuerySchema, productSearchQuerySchema } from '@skipper/shared';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import {
  listProducts,
  getFeaturedProducts,
  getProductBySlug,
  getProductById,
} from '../services/products';
import { searchProducts } from '../services/search';

export const productsRouter = new Hono<{ Bindings: Env }>();

productsRouter.get('/', async (c) => {
  const query = productListQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const { products, total } = await listProducts(c.env.DB, query);
  return c.json(ok(products, { page: query.page, per_page: query.per_page, total }));
});

productsRouter.get('/featured', async (c) => {
  const limitRaw = Number.parseInt(c.req.query('limit') ?? '12', 10);
  const safeLimit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 50 ? limitRaw : 12;
  const products = await getFeaturedProducts(c.env.DB, safeLimit);
  return c.json(ok(products));
});

productsRouter.get('/search', async (c) => {
  const query = productSearchQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const products = await searchProducts(c.env.DB, query.q, query.limit);
  return c.json(ok(products));
});

// Lookup by ID — used by the cart/checkout pages where we only keep the
// product id (not the slug) in the persisted cart state.
productsRouter.get('/id/:id', async (c) => {
  const id = c.req.param('id');
  const product = await getProductById(c.env.DB, id);
  if (!product) {
    return c.json(fail('NOT_FOUND', 'Product not found'), 404);
  }
  return c.json(ok(product));
});

productsRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const product = await getProductBySlug(c.env.DB, slug);
  if (!product) {
    return c.json(fail('NOT_FOUND', 'Product not found'), 404);
  }
  return c.json(ok(product));
});
