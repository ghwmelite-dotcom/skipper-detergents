import type {
  Product,
  ProductImage,
  ProductVariant,
  BulkPricingTier,
  ProductWithRelations,
  ProductListQuery,
} from '@skipper/shared';
import { first, all } from '../utils/db';

const SORT_CLAUSES: Record<NonNullable<ProductListQuery['sort']>, string> = {
  newest: 'created_at DESC',
  price_asc: 'unit_price ASC',
  price_desc: 'unit_price DESC',
  name_asc: 'name ASC',
  popular: 'total_sold DESC, created_at DESC',
};

export interface ProductListResult {
  products: Product[];
  total: number;
}

export async function listProducts(
  db: D1Database,
  query: ProductListQuery,
): Promise<ProductListResult> {
  const clauses: string[] = ['p.is_active = 1'];
  const params: unknown[] = [];

  if (query.category) {
    clauses.push('c.slug = ?');
    params.push(query.category);
  }
  if (query.brand) {
    clauses.push('p.brand = ?');
    params.push(query.brand);
  }
  if (query.bulk_only) {
    clauses.push('p.is_bulk_available = 1');
  }
  if (query.min_price !== undefined) {
    clauses.push('p.unit_price >= ?');
    params.push(query.min_price);
  }
  if (query.max_price !== undefined) {
    clauses.push('p.unit_price <= ?');
    params.push(query.max_price);
  }

  const where = clauses.join(' AND ');
  const orderBy = SORT_CLAUSES[query.sort];
  const offset = (query.page - 1) * query.per_page;

  const listSql = `
    SELECT p.*
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const countSql = `
    SELECT COUNT(*) AS n
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE ${where}
  `;

  const [products, totalRow] = await Promise.all([
    all<Product>(db, listSql, [...params, query.per_page, offset]),
    first<{ n: number }>(db, countSql, params),
  ]);

  return { products, total: totalRow?.n ?? 0 };
}

export async function getFeaturedProducts(db: D1Database, limit: number): Promise<Product[]> {
  return all<Product>(
    db,
    `SELECT * FROM products
     WHERE is_active = 1 AND is_featured = 1
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit],
  );
}

export async function getProductBySlug(
  db: D1Database,
  slug: string,
): Promise<ProductWithRelations | null> {
  const product = await first<Product>(
    db,
    `SELECT * FROM products WHERE slug = ? AND is_active = 1`,
    [slug],
  );
  if (!product) return null;

  const [images, variants, bulk_tiers, category] = await Promise.all([
    all<ProductImage>(
      db,
      `SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC`,
      [product.id],
    ),
    all<ProductVariant>(
      db,
      `SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY created_at ASC`,
      [product.id],
    ),
    all<BulkPricingTier>(
      db,
      `SELECT * FROM bulk_pricing_tiers WHERE product_id = ? ORDER BY min_quantity ASC`,
      [product.id],
    ),
    first<{ id: string; name: string; slug: string }>(
      db,
      `SELECT id, name, slug FROM categories WHERE id = ?`,
      [product.category_id],
    ),
  ]);

  return {
    ...product,
    images,
    variants,
    bulk_tiers,
    category: category ?? { id: product.category_id, name: '', slug: '' },
  };
}
