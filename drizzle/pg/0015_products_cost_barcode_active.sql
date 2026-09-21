-- PostgreSQL parity for drizzle/sqlite/0015_products_cost_barcode_active.sql
-- (purchase price + barcode + soft-hide flag; additive, existing rows visible).
ALTER TABLE products ADD COLUMN cost_price integer;--> statement-breakpoint
ALTER TABLE products ADD COLUMN barcode text;--> statement-breakpoint
ALTER TABLE products ADD COLUMN is_active integer NOT NULL DEFAULT 1;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);
