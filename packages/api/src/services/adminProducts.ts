import type {
  Product,
  ProductImage,
  ProductVariant,
  BulkPricingTier,
  ProductCreateInput,
  ProductUpdateInput,
  BulkPricingTierInput,
} from '@skipper/shared';
import { all, first, run } from '../utils/db';

export interface AdminProductListQuery {
  page: number;
  per_page: number;
  search?: string | undefined;
  category?: string | undefined;
  status?: 'active' | 'inactive' | 'all' | undefined;
}

export interface AdminProductListItem extends Product {
  category_name: string | null;
  category_slug: string | null;
  primary_image_url: string | null;
  image_count: number;
  bulk_tier_count: number;
}

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function adminListProducts(
  db: D1Database,
  query: AdminProductListQuery,
): Promise<{ products: AdminProductListItem[]; total: number }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  const status = query.status ?? 'all';
  if (status === 'active') clauses.push('p.is_active = 1');
  if (status === 'inactive') clauses.push('p.is_active = 0');

  if (query.search) {
    clauses.push('(LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.slug) LIKE ?)');
    const q = `%${query.search.toLowerCase()}%`;
    params.push(q, q, q);
  }

  if (query.category) {
    clauses.push('(c.slug = ? OR c.id = ?)');
    params.push(query.category, query.category);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const offset = (query.page - 1) * query.per_page;

  const listSql = `
    SELECT
      p.*,
      c.name AS category_name,
      c.slug AS category_slug,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS primary_image_url,
      (SELECT COUNT(*) FROM product_images WHERE product_id = p.id) AS image_count,
      (SELECT COUNT(*) FROM bulk_pricing_tiers WHERE product_id = p.id) AS bulk_tier_count
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const countSql = `
    SELECT COUNT(*) AS n
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${where}
  `;

  const [products, totalRow] = await Promise.all([
    all<AdminProductListItem>(db, listSql, [...params, query.per_page, offset]),
    first<{ n: number }>(db, countSql, params),
  ]);

  return { products, total: totalRow?.n ?? 0 };
}

export async function adminGetProduct(
  db: D1Database,
  id: string,
): Promise<(Product & {
  images: ProductImage[];
  variants: ProductVariant[];
  bulk_tiers: BulkPricingTier[];
  category: { id: string; name: string; slug: string } | null;
}) | null> {
  const product = await first<Product>(db, `SELECT * FROM products WHERE id = ?`, [id]);
  if (!product) return null;
  const [images, variants, bulk_tiers, category] = await Promise.all([
    all<ProductImage>(
      db,
      `SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC`,
      [id],
    ),
    all<ProductVariant>(
      db,
      `SELECT * FROM product_variants WHERE product_id = ? ORDER BY created_at ASC`,
      [id],
    ),
    all<BulkPricingTier>(
      db,
      `SELECT * FROM bulk_pricing_tiers WHERE product_id = ? ORDER BY min_quantity ASC`,
      [id],
    ),
    first<{ id: string; name: string; slug: string }>(
      db,
      `SELECT id, name, slug FROM categories WHERE id = ?`,
      [product.category_id],
    ),
  ]);
  return { ...product, images, variants, bulk_tiers, category };
}

export async function adminCreateProduct(
  db: D1Database,
  input: ProductCreateInput,
): Promise<Product> {
  const id = idHex();
  await run(
    db,
    `INSERT INTO products (
      id, name, slug, description, short_description, category_id, brand, sku,
      unit_price, compare_at_price, cost_price, stock_quantity, low_stock_threshold,
      weight_kg, is_active, is_featured, is_bulk_available, bulk_minimum_qty,
      tags, seo_title, seo_description, seo_keywords
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.slug,
      input.description,
      input.short_description ?? null,
      input.category_id,
      input.brand ?? null,
      input.sku ?? null,
      input.unit_price,
      input.compare_at_price ?? null,
      input.cost_price ?? null,
      input.stock_quantity,
      input.low_stock_threshold ?? 10,
      input.weight_kg ?? null,
      input.is_active === false ? 0 : 1,
      input.is_featured ? 1 : 0,
      input.is_bulk_available ? 1 : 0,
      input.bulk_minimum_qty ?? 10,
      input.tags ?? null,
      input.seo_title ?? null,
      input.seo_description ?? null,
      input.seo_keywords ?? null,
    ],
  );
  const created = await first<Product>(db, `SELECT * FROM products WHERE id = ?`, [id]);
  if (!created) throw new Error('Failed to insert product');
  return created;
}

export async function adminUpdateProduct(
  db: D1Database,
  id: string,
  input: ProductUpdateInput,
): Promise<Product | null> {
  const existing = await first<Product>(db, `SELECT id FROM products WHERE id = ?`, [id]);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    sets.push(`${column} = ?`);
    params.push(value);
  };

  if (input.name !== undefined) assign('name', input.name);
  if (input.slug !== undefined) assign('slug', input.slug);
  if (input.description !== undefined) assign('description', input.description);
  if (input.short_description !== undefined) assign('short_description', input.short_description);
  if (input.category_id !== undefined) assign('category_id', input.category_id);
  if (input.brand !== undefined) assign('brand', input.brand);
  if (input.sku !== undefined) assign('sku', input.sku);
  if (input.unit_price !== undefined) assign('unit_price', input.unit_price);
  if (input.compare_at_price !== undefined) assign('compare_at_price', input.compare_at_price);
  if (input.cost_price !== undefined) assign('cost_price', input.cost_price);
  if (input.stock_quantity !== undefined) assign('stock_quantity', input.stock_quantity);
  if (input.low_stock_threshold !== undefined)
    assign('low_stock_threshold', input.low_stock_threshold);
  if (input.weight_kg !== undefined) assign('weight_kg', input.weight_kg);
  if (input.is_active !== undefined) assign('is_active', input.is_active ? 1 : 0);
  if (input.is_featured !== undefined) assign('is_featured', input.is_featured ? 1 : 0);
  if (input.is_bulk_available !== undefined)
    assign('is_bulk_available', input.is_bulk_available ? 1 : 0);
  if (input.bulk_minimum_qty !== undefined) assign('bulk_minimum_qty', input.bulk_minimum_qty);
  if (input.tags !== undefined) assign('tags', input.tags);
  if (input.seo_title !== undefined) assign('seo_title', input.seo_title);
  if (input.seo_description !== undefined) assign('seo_description', input.seo_description);
  if (input.seo_keywords !== undefined) assign('seo_keywords', input.seo_keywords);

  if (!sets.length) {
    return first<Product>(db, `SELECT * FROM products WHERE id = ?`, [id]);
  }

  sets.push(`updated_at = datetime('now')`);
  await run(db, `UPDATE products SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  return first<Product>(db, `SELECT * FROM products WHERE id = ?`, [id]);
}

export async function adminSoftDeleteProduct(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const result = await run(
    db,
    `UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
    [id],
  );
  return result.meta.changes > 0;
}

export async function adminReplaceBulkTiers(
  db: D1Database,
  productId: string,
  tiers: BulkPricingTierInput[],
): Promise<BulkPricingTier[]> {
  const statements: D1PreparedStatement[] = [];
  statements.push(db.prepare(`DELETE FROM bulk_pricing_tiers WHERE product_id = ?`).bind(productId));
  for (const tier of tiers) {
    statements.push(
      db
        .prepare(
          `INSERT INTO bulk_pricing_tiers (id, product_id, min_quantity, max_quantity, unit_price, discount_percent, label)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          idHex(),
          productId,
          tier.min_quantity,
          tier.max_quantity ?? null,
          tier.unit_price,
          tier.discount_percent ?? null,
          tier.label ?? null,
        ),
    );
  }
  await db.batch(statements);
  return all<BulkPricingTier>(
    db,
    `SELECT * FROM bulk_pricing_tiers WHERE product_id = ? ORDER BY min_quantity ASC`,
    [productId],
  );
}

export interface AddImageInput {
  product_id: string;
  url: string;
  alt_text?: string | null | undefined;
  is_primary?: boolean | undefined;
  sort_order?: number | undefined;
}

export async function addProductImage(
  db: D1Database,
  input: AddImageInput,
): Promise<ProductImage> {
  const id = idHex();
  const statements: D1PreparedStatement[] = [];
  if (input.is_primary) {
    statements.push(
      db
        .prepare(`UPDATE product_images SET is_primary = 0 WHERE product_id = ?`)
        .bind(input.product_id),
    );
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO product_images (id, product_id, url, alt_text, sort_order, is_primary)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.product_id,
        input.url,
        input.alt_text ?? null,
        input.sort_order ?? 0,
        input.is_primary ? 1 : 0,
      ),
  );
  await db.batch(statements);
  const created = await first<ProductImage>(db, `SELECT * FROM product_images WHERE id = ?`, [id]);
  if (!created) throw new Error('Failed to insert product image');
  return created;
}

export async function updateProductImage(
  db: D1Database,
  productId: string,
  imageId: string,
  input: {
    alt_text?: string | null | undefined;
    is_primary?: boolean | undefined;
    sort_order?: number | undefined;
  },
): Promise<ProductImage | null> {
  if (input.is_primary) {
    await run(
      db,
      `UPDATE product_images SET is_primary = 0 WHERE product_id = ? AND id != ?`,
      [productId, imageId],
    );
  }
  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.alt_text !== undefined) {
    sets.push('alt_text = ?');
    params.push(input.alt_text);
  }
  if (input.is_primary !== undefined) {
    sets.push('is_primary = ?');
    params.push(input.is_primary ? 1 : 0);
  }
  if (input.sort_order !== undefined) {
    sets.push('sort_order = ?');
    params.push(input.sort_order);
  }
  if (sets.length) {
    await run(
      db,
      `UPDATE product_images SET ${sets.join(', ')} WHERE id = ? AND product_id = ?`,
      [...params, imageId, productId],
    );
  }
  return first<ProductImage>(
    db,
    `SELECT * FROM product_images WHERE id = ? AND product_id = ?`,
    [imageId, productId],
  );
}

export async function deleteProductImage(
  db: D1Database,
  productId: string,
  imageId: string,
): Promise<ProductImage | null> {
  const row = await first<ProductImage>(
    db,
    `SELECT * FROM product_images WHERE id = ? AND product_id = ?`,
    [imageId, productId],
  );
  if (!row) return null;
  await run(db, `DELETE FROM product_images WHERE id = ?`, [imageId]);
  return row;
}
