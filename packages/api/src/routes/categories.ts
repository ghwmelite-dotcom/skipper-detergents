import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ok, fail } from '../utils/response';
import { listCategories, getCategoryBySlugWithProducts } from '../services/categories';

export const categoriesRouter = new Hono<{ Bindings: Env }>();

categoriesRouter.get('/', async (c) => {
  const categories = await listCategories(c.env.DB);
  return c.json(ok(categories));
});

categoriesRouter.get('/:slug/products', async (c) => {
  const slug = c.req.param('slug');
  const page = Math.max(1, Number.parseInt(c.req.query('page') ?? '1', 10) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number.parseInt(c.req.query('per_page') ?? '20', 10) || 20),
  );
  const result = await getCategoryBySlugWithProducts(c.env.DB, slug, { page, per_page: perPage });
  if (!result) {
    return c.json(fail('NOT_FOUND', 'Category not found'), 404);
  }
  return c.json(
    ok(
      { category: result.category, products: result.products },
      { page, per_page: perPage, total: result.total },
    ),
  );
});
