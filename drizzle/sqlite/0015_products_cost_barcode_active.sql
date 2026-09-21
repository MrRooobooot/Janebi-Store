-- Purchase price + barcode + soft-hide flag on products.
--   cost_price / barcode are admin-only: every public product read path excludes
--   costPrice explicitly (server/routes/products.ts), so wholesale never leaks.
--   is_active=0 hides a product from the storefront without deleting the row that
--   order_items.product_id FK-references (deleting it would break order history).
-- Additive only: existing rows default to is_active=1 (visible).
ALTER TABLE products ADD COLUMN cost_price integer;--> statement-breakpoint
ALTER TABLE products ADD COLUMN barcode text;--> statement-breakpoint
ALTER TABLE products ADD COLUMN is_active integer NOT NULL DEFAULT 1;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);
