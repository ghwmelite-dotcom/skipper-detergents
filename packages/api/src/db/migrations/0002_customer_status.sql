-- Migration: add customer status + notes for admin management.

ALTER TABLE customers ADD COLUMN status TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE customers ADD COLUMN notes TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
