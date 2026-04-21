export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  sort_order?: number;
  is_active?: number;
}

export interface SeedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  brand?: string | null;
  unit_price: number;
  stock_quantity?: number;
  is_active?: number;
  is_featured?: number;
  is_bulk_available?: number;
  tags?: string | null;
}

export interface SeedBulkTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  label?: string;
}

export interface SeedImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  is_primary?: number;
}

export async function resetDatabase(db: D1Database): Promise<void> {
  const tables = [
    'activity_log',
    'order_items',
    'orders',
    'customers',
    'bulk_pricing_tiers',
    'product_variants',
    'product_images',
    'products',
    'categories',
    'admin_users',
    'delivery_zones',
    'store_settings',
    'order_number_sequence',
  ];
  for (const t of tables) {
    await db.prepare(`DELETE FROM ${t}`).run();
  }
}

export async function seedCategories(
  db: D1Database,
  categories: SeedCategory[],
): Promise<void> {
  for (const c of categories) {
    await db
      .prepare(
        `INSERT INTO categories (id, name, slug, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(c.id, c.name, c.slug, c.sort_order ?? 0, c.is_active ?? 1)
      .run();
  }
}

export async function seedProducts(db: D1Database, products: SeedProduct[]): Promise<void> {
  for (const p of products) {
    await db
      .prepare(
        `INSERT INTO products (
          id, name, slug, description, category_id, brand,
          unit_price, stock_quantity, is_active, is_featured, is_bulk_available, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        p.id,
        p.name,
        p.slug,
        p.description,
        p.category_id,
        p.brand ?? null,
        p.unit_price,
        p.stock_quantity ?? 0,
        p.is_active ?? 1,
        p.is_featured ?? 0,
        p.is_bulk_available ?? 0,
        p.tags ?? null,
      )
      .run();
  }
}

export async function seedBulkTiers(db: D1Database, tiers: SeedBulkTier[]): Promise<void> {
  for (const t of tiers) {
    await db
      .prepare(
        `INSERT INTO bulk_pricing_tiers (id, product_id, min_quantity, max_quantity, unit_price, label)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(t.id, t.product_id, t.min_quantity, t.max_quantity, t.unit_price, t.label ?? null)
      .run();
  }
}

export async function seedImages(db: D1Database, images: SeedImage[]): Promise<void> {
  for (const i of images) {
    await db
      .prepare(
        `INSERT INTO product_images (id, product_id, url, alt_text, is_primary)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(i.id, i.product_id, i.url, i.alt_text ?? null, i.is_primary ?? 0)
      .run();
  }
}

export async function seedSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(`INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)`)
    .bind(key, value)
    .run();
}
