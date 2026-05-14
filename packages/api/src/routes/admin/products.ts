import { Hono } from 'hono';
import { z } from 'zod';
import {
  productCreateSchema,
  productUpdateSchema,
  bulkPricingTierSchema,
  type BulkPricingTierInput,
} from '@skipper/shared';
import type { Env } from '../../types/env';
import { ok, fail } from '../../utils/response';
import { adminAuth, requireSuperAdmin, type AdminVariables } from '../../middleware/adminAuth';
import { first, all, run } from '../../utils/db';
import {
  adminListProducts,
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminSoftDeleteProduct,
  adminReplaceBulkTiers,
  addProductImage,
  updateProductImage,
  deleteProductImage,
} from '../../services/adminProducts';
import { logActivity } from '../../services/activity';

const numericFromString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((v) => !Number.isNaN(v), { message: 'must be a number' });

const adminProductListQuerySchema = z.object({
  page: numericFromString.pipe(z.number().int().positive()).default(1),
  per_page: numericFromString.pipe(z.number().int().positive().max(200)).default(25),
  search: z.string().trim().min(1).max(200).optional(),
  category: z.string().min(1).max(200).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
});

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const adminProductsRouter = new Hono<{ Bindings: Env; Variables: AdminVariables }>();

adminProductsRouter.use('*', adminAuth);

adminProductsRouter.get('/', async (c) => {
  const query = adminProductListQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  const { products, total } = await adminListProducts(c.env.DB, query);
  return c.json(ok(products, { page: query.page, per_page: query.per_page, total }));
});

adminProductsRouter.get('/:id', async (c) => {
  const product = await adminGetProduct(c.env.DB, c.req.param('id'));
  if (!product) return c.json(fail('NOT_FOUND', 'Product not found'), 404);
  return c.json(ok(product));
});

adminProductsRouter.post('/', async (c) => {
  const body = productCreateSchema.parse(await c.req.json());
  const admin = c.get('adminUser');
  const created = await adminCreateProduct(c.env.DB, body);
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'product.created',
    entity_type: 'product',
    entity_id: created.id,
    details: { name: created.name, slug: created.slug },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok(created), 201);
});

adminProductsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = productUpdateSchema.parse(await c.req.json());
  const updated = await adminUpdateProduct(c.env.DB, id, body);
  if (!updated) return c.json(fail('NOT_FOUND', 'Product not found'), 404);
  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'product.updated',
    entity_type: 'product',
    entity_id: id,
    details: { fields: Object.keys(body) },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok(updated));
});

adminProductsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const did = await adminSoftDeleteProduct(c.env.DB, id);
  if (!did) return c.json(fail('NOT_FOUND', 'Product not found'), 404);
  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'product.deleted',
    entity_type: 'product',
    entity_id: id,
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok({ id, is_active: false }));
});

/**
 * Permanent delete — removes the product row, its images (R2 + DB),
 * variants, and bulk pricing tiers. Refuses if any order_items reference
 * the product (those are historical records and must be preserved).
 * Super-admin only.
 */
adminProductsRouter.delete('/:id/permanent', requireSuperAdmin, async (c) => {
  const id = c.req.param('id');

  const existing = await first<{ id: string; name: string }>(
    c.env.DB,
    `SELECT id, name FROM products WHERE id = ?`,
    [id],
  );
  if (!existing) return c.json(fail('NOT_FOUND', 'Product not found'), 404);

  // Past orders reference products via order_items.product_id (no cascade).
  // If any exist, the row can't be removed without losing order history;
  // tell the admin to deactivate instead.
  const linked = await first<{ n: number }>(
    c.env.DB,
    `SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?`,
    [id],
  );
  if ((linked?.n ?? 0) > 0) {
    return c.json(
      fail(
        'PRODUCT_HAS_ORDERS',
        `This product appears in ${linked?.n ?? 0} past order item(s) and can't be permanently deleted. Deactivate it instead.`,
      ),
      409,
    );
  }

  // Collect image URLs first so we can clean R2 after the DB cascade.
  const images = await all<{ url: string }>(
    c.env.DB,
    `SELECT url FROM product_images WHERE product_id = ?`,
    [id],
  );

  // Cascade deletes product_images, product_variants, bulk_pricing_tiers
  // (per schema FK ON DELETE CASCADE).
  await run(c.env.DB, `DELETE FROM products WHERE id = ?`, [id]);

  // R2 cleanup — best-effort, non-fatal on individual failures.
  for (const img of images) {
    try {
      const m = img.url.match(/\/r2\/products\/(products\/[^?]+)/);
      const key = m?.[1];
      if (key) await c.env.R2_PRODUCTS.delete(key);
    } catch (err) {
      console.warn('[products] R2 cleanup failed for', img.url, err);
    }
  }

  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'product.deleted_permanently',
    entity_type: 'product',
    entity_id: id,
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });

  return c.json(ok({ id, deleted: true, name: existing.name }));
});

adminProductsRouter.post('/:id/images', async (c) => {
  const productId = c.req.param('id');
  const form = await c.req.formData();
  const fileUnknown = form.get('file') as unknown;
  const altText = form.get('alt_text');
  const isPrimaryRaw = form.get('is_primary');
  const sortOrderRaw = form.get('sort_order');

  if (
    !fileUnknown ||
    typeof (fileUnknown as Record<string, unknown>).arrayBuffer !== 'function' ||
    typeof (fileUnknown as Record<string, unknown>).type !== 'string'
  ) {
    return c.json(fail('BAD_REQUEST', 'file is required'), 400);
  }
  const file = fileUnknown as { arrayBuffer(): Promise<ArrayBuffer>; type: string; size?: number };
  const ext = MIME_EXT[file.type];
  if (!ext) {
    return c.json(fail('UNSUPPORTED_MEDIA', 'Only jpg, png, webp, gif allowed'), 415);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return c.json(fail('PAYLOAD_TOO_LARGE', 'Image exceeds 5 MB limit'), 413);
  }

  const key = `products/${productId}/${idHex()}.${ext}`;
  await c.env.R2_PRODUCTS.put(key, bytes, { httpMetadata: { contentType: file.type } });

  const publicBase =
    // Prefer explicit env, falling back to r2.dev-style proxy via Worker host
    `${new URL(c.req.url).origin}/r2/products`;

  const image = await addProductImage(c.env.DB, {
    product_id: productId,
    url: `${publicBase}/${key}`,
    alt_text: typeof altText === 'string' ? altText : null,
    is_primary: typeof isPrimaryRaw === 'string' && (isPrimaryRaw === 'true' || isPrimaryRaw === '1'),
    sort_order:
      typeof sortOrderRaw === 'string' ? Number.parseInt(sortOrderRaw, 10) || 0 : undefined,
  });

  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'product.image_uploaded',
    entity_type: 'product',
    entity_id: productId,
    details: { image_id: image.id, key },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });

  return c.json(ok({ image, r2_key: key }), 201);
});

const imageUpdateSchema = z.object({
  alt_text: z.string().nullable().optional(),
  is_primary: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

adminProductsRouter.patch('/:id/images/:image_id', async (c) => {
  const productId = c.req.param('id');
  const imageId = c.req.param('image_id');
  const body = imageUpdateSchema.parse(await c.req.json());
  const updated = await updateProductImage(c.env.DB, productId, imageId, body);
  if (!updated) return c.json(fail('NOT_FOUND', 'Image not found'), 404);
  return c.json(ok(updated));
});

adminProductsRouter.delete('/:id/images/:image_id', async (c) => {
  const productId = c.req.param('id');
  const imageId = c.req.param('image_id');
  const removed = await deleteProductImage(c.env.DB, productId, imageId);
  if (!removed) return c.json(fail('NOT_FOUND', 'Image not found'), 404);
  // Attempt R2 deletion — extract key from the URL if it matches our own layout.
  try {
    const m = removed.url.match(/\/r2\/products\/(products\/[^?]+)/);
    const key = m?.[1];
    if (key) await c.env.R2_PRODUCTS.delete(key);
  } catch {
    // non-fatal
  }
  return c.json(ok({ id: imageId, deleted: true }));
});

const replaceBulkTiersSchema = z.object({
  tiers: z.array(bulkPricingTierSchema).max(20),
});

adminProductsRouter.put('/:id/bulk-tiers', async (c) => {
  const productId = c.req.param('id');
  const body = replaceBulkTiersSchema.parse(await c.req.json());
  const tiers = await adminReplaceBulkTiers(
    c.env.DB,
    productId,
    body.tiers as BulkPricingTierInput[],
  );
  const admin = c.get('adminUser');
  await logActivity(c.env.DB, {
    admin_id: admin.id,
    action: 'product.bulk_tiers_updated',
    entity_type: 'product',
    entity_id: productId,
    details: { count: tiers.length },
    ip_address: c.req.header('cf-connecting-ip') ?? null,
  });
  return c.json(ok(tiers));
});
