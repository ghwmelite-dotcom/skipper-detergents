import { Hono } from 'hono';
import { categoryCreateSchema, type Category } from '@skipper/shared';
import type { Env } from '../../types/env';
import { ok, fail } from '../../utils/response';
import { adminAuth, type AdminVariables } from '../../middleware/adminAuth';
import { all, first, run } from '../../utils/db';
import { logActivity } from '../../services/activity';

const categoryUpdateSchema = categoryCreateSchema.partial();

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const adminCategoriesRouter = new Hono<{ Bindings: Env; Variables: AdminVariables }>();
adminCategoriesRouter.use('*', adminAuth);

adminCategoriesRouter.get('/', async (c) => {
  const rows = await all<Category & { product_count: number }>(
    c.env.DB,
    `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`,
    [],
  );
  return c.json(ok(rows));
});

adminCategoriesRouter.post('/', async (c) => {
  const body = categoryCreateSchema.parse(await c.req.json());
  const id = idHex();
  await run(
    c.env.DB,
    `INSERT INTO categories (id, name, slug, description, image_url, parent_id, sort_order, is_active, seo_title, seo_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      body.name,
      body.slug,
      body.description ?? null,
      body.image_url ?? null,
      body.parent_id ?? null,
      body.sort_order ?? 0,
      body.is_active === false ? 0 : 1,
      body.seo_title ?? null,
      body.seo_description ?? null,
    ],
  );
  const created = await first<Category>(c.env.DB, `SELECT * FROM categories WHERE id = ?`, [id]);
  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'category.created',
    entity_type: 'category',
    entity_id: id,
    details: { name: body.name, slug: body.slug },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok(created), 201);
});

adminCategoriesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = categoryUpdateSchema.parse(await c.req.json());

  const sets: string[] = [];
  const params: unknown[] = [];
  const assign = (col: string, val: unknown): void => {
    sets.push(`${col} = ?`);
    params.push(val);
  };
  if (body.name !== undefined) assign('name', body.name);
  if (body.slug !== undefined) assign('slug', body.slug);
  if (body.description !== undefined) assign('description', body.description);
  if (body.image_url !== undefined) assign('image_url', body.image_url);
  if (body.parent_id !== undefined) assign('parent_id', body.parent_id);
  if (body.sort_order !== undefined) assign('sort_order', body.sort_order);
  if (body.is_active !== undefined) assign('is_active', body.is_active ? 1 : 0);
  if (body.seo_title !== undefined) assign('seo_title', body.seo_title);
  if (body.seo_description !== undefined) assign('seo_description', body.seo_description);

  if (sets.length) {
    sets.push(`updated_at = datetime('now')`);
    await run(c.env.DB, `UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  const updated = await first<Category>(c.env.DB, `SELECT * FROM categories WHERE id = ?`, [id]);
  if (!updated) return c.json(fail('NOT_FOUND', 'Category not found'), 404);
  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'category.updated',
    entity_type: 'category',
    entity_id: id,
    details: { fields: Object.keys(body) },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok(updated));
});

adminCategoriesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const inUse = await first<{ n: number }>(
    c.env.DB,
    `SELECT COUNT(*) AS n FROM products WHERE category_id = ?`,
    [id],
  );
  if ((inUse?.n ?? 0) > 0) {
    return c.json(
      fail('CONFLICT', `Cannot delete — ${inUse?.n ?? 0} product(s) still reference this category`),
      409,
    );
  }
  const res = await run(c.env.DB, `DELETE FROM categories WHERE id = ?`, [id]);
  if (res.meta.changes === 0) return c.json(fail('NOT_FOUND', 'Category not found'), 404);
  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'category.deleted',
    entity_type: 'category',
    entity_id: id,
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok({ id, deleted: true }));
});
