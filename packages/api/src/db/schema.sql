-- ============================================================
-- Skipper Detergents — D1 schema (MVP)
-- Spec: docs/superpowers/specs/2026-04-21-skipper-detergents-design.md §4
-- ============================================================

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  image_url     TEXT,
  parent_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  seo_title     TEXT,
  seo_description TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT NOT NULL,
  short_description   TEXT,
  category_id         TEXT NOT NULL REFERENCES categories(id),
  brand               TEXT,
  sku                 TEXT UNIQUE,
  barcode             TEXT,
  unit_price          REAL NOT NULL,
  compare_at_price    REAL,
  cost_price          REAL,
  currency            TEXT NOT NULL DEFAULT 'GHS',
  stock_quantity      INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  weight_kg           REAL,
  dimensions_cm       TEXT,
  is_active           INTEGER NOT NULL DEFAULT 1,
  is_featured         INTEGER NOT NULL DEFAULT 0,
  is_bulk_available   INTEGER NOT NULL DEFAULT 0,
  bulk_minimum_qty    INTEGER NOT NULL DEFAULT 10,
  tags                TEXT,
  seo_title           TEXT,
  seo_description     TEXT,
  seo_keywords        TEXT,
  avg_rating          REAL NOT NULL DEFAULT 0,
  review_count        INTEGER NOT NULL DEFAULT 0,
  total_sold          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_bulk ON products(is_bulk_available);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- FTS5 virtual table for product search (milestone 2 populates this)
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,
  description,
  short_description,
  tags,
  content='products',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, name, description, short_description, tags)
  VALUES (new.rowid, new.name, new.description, new.short_description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, name, description, short_description, tags)
  VALUES ('delete', old.rowid, old.name, old.description, old.short_description, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, name, description, short_description, tags)
  VALUES ('delete', old.rowid, old.name, old.description, old.short_description, old.tags);
  INSERT INTO products_fts(rowid, name, description, short_description, tags)
  VALUES (new.rowid, new.name, new.description, new.short_description, new.tags);
END;

-- ------------------------------------------------------------
-- PRODUCT IMAGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- ------------------------------------------------------------
-- PRODUCT VARIANTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  sku              TEXT UNIQUE,
  price_adjustment REAL NOT NULL DEFAULT 0,
  stock_quantity   INTEGER NOT NULL DEFAULT 0,
  weight_kg        REAL,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

-- ------------------------------------------------------------
-- BULK PRICING TIERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bulk_pricing_tiers (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity     INTEGER NOT NULL,
  max_quantity     INTEGER,
  unit_price       REAL NOT NULL,
  discount_percent REAL,
  label            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product ON bulk_pricing_tiers(product_id);

-- ------------------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email         TEXT UNIQUE,
  first_name    TEXT,
  last_name     TEXT,
  phone         TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city          TEXT,
  region        TEXT,
  country       TEXT NOT NULL DEFAULT 'Ghana',
  gps_address   TEXT,
  total_orders  INTEGER NOT NULL DEFAULT 0,
  total_spent   REAL NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'regular',
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ------------------------------------------------------------
-- ADMIN USERS (created BEFORE orders because orders.manual_payment_confirmed_by references it)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  order_number                TEXT NOT NULL UNIQUE,
  customer_id                 TEXT REFERENCES customers(id),
  status                      TEXT NOT NULL DEFAULT 'pending',
  payment_method              TEXT NOT NULL,
  payment_status              TEXT NOT NULL DEFAULT 'unpaid',
  paystack_reference          TEXT,
  paystack_access_code        TEXT,
  manual_payment_proof_url    TEXT,
  manual_payment_confirmed_at TEXT,
  manual_payment_confirmed_by TEXT REFERENCES admin_users(id),
  subtotal                    REAL NOT NULL,
  bulk_discount               REAL NOT NULL DEFAULT 0,
  delivery_fee                REAL NOT NULL DEFAULT 0,
  tax_amount                  REAL NOT NULL DEFAULT 0,
  total_amount                REAL NOT NULL,
  delivery_method             TEXT NOT NULL DEFAULT 'delivery',
  delivery_name               TEXT NOT NULL,
  delivery_email              TEXT NOT NULL,
  delivery_phone              TEXT NOT NULL,
  delivery_address            TEXT,
  delivery_city               TEXT,
  delivery_region             TEXT,
  delivery_gps                TEXT,
  delivery_notes              TEXT,
  tracking_number             TEXT,
  tracking_url                TEXT,
  estimated_delivery          TEXT,
  delivered_at                TEXT,
  ip_address                  TEXT,
  user_agent                  TEXT,
  notes                       TEXT,
  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ------------------------------------------------------------
-- ORDER ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL REFERENCES products(id),
  variant_id    TEXT REFERENCES product_variants(id),
  product_name  TEXT NOT NULL,
  variant_name  TEXT,
  sku           TEXT,
  quantity      INTEGER NOT NULL,
  unit_price    REAL NOT NULL,
  is_bulk_order INTEGER NOT NULL DEFAULT 0,
  bulk_tier_id  TEXT REFERENCES bulk_pricing_tiers(id),
  line_total    REAL NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ------------------------------------------------------------
-- ACTIVITY LOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  admin_id    TEXT REFERENCES admin_users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     TEXT,
  ip_address  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_admin ON activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- ------------------------------------------------------------
-- STORE SETTINGS (key/value)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- DELIVERY ZONES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_zones (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name           TEXT NOT NULL,
  regions        TEXT NOT NULL,
  fee            REAL NOT NULL,
  estimated_days TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------
-- ORDER NUMBER SEQUENCE (day-scoped counter)
-- One row per YYYYMMDD date string, maintained by API logic.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_number_sequence (
  day       TEXT PRIMARY KEY,
  next_seq  INTEGER NOT NULL DEFAULT 1
);
