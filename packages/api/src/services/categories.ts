import type { Category, Product } from '@skipper/shared';
import { all, first } from '../utils/db';

export interface CategoryWithCount extends Category {
  product_count: number;
}

export async function listCategories(db: D1Database): Promise<CategoryWithCount[]> {
  return all<CategoryWithCount>(
    db,
    `SELECT c.*, COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     WHERE c.is_active = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`,
    [],
  );
}

export interface CategoryWithProducts {
  category: Category;
  products: Product[];
  total: number;
}

export async function getCategoryBySlugWithProducts(
  db: D1Database,
  slug: string,
  pagination: { page: number; per_page: number },
): Promise<CategoryWithProducts | null> {
  const category = await first<Category>(
    db,
    `SELECT * FROM categories WHERE slug = ? AND is_active = 1`,
    [slug],
  );
  if (!category) return null;

  const offset = (pagination.page - 1) * pagination.per_page;
  const [products, totalRow] = await Promise.all([
    all<Product>(
      db,
      `SELECT * FROM products
       WHERE category_id = ? AND is_active = 1
       ORDER BY is_featured DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [category.id, pagination.per_page, offset],
    ),
    first<{ n: number }>(
      db,
      `SELECT COUNT(*) AS n FROM products WHERE category_id = ? AND is_active = 1`,
      [category.id],
    ),
  ]);

  return { category, products, total: totalRow?.n ?? 0 };
}
