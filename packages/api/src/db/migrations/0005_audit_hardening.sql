-- 0005_audit_hardening.sql
-- Pulled from the May 2026 codebase audit:
--   - Case-insensitive uniqueness for admin login emails (the column is already
--     UNIQUE on raw email, but two admins with different case slipped through).
--   - Cover the foreign-key columns we routinely filter/join on.
--   - Introduce processed_webhook_events so Paystack replays can't re-flip an
--     order back to paid.

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_lower
  ON admin_users(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_manual_payment_confirmed_by ON orders(manual_payment_confirmed_by);
CREATE INDEX IF NOT EXISTS idx_orders_paystack_reference ON orders(paystack_reference);

CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_bulk_tier ON order_items(bulk_tier_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_admin ON activity_log(admin_id);

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id     TEXT PRIMARY KEY,
  source       TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_source
  ON processed_webhook_events(source, processed_at);
