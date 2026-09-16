-- Hot-path indexes, PostgreSQL parity for drizzle/sqlite/0013_hot_path_indexes.sql
-- (products category/brand/price filters + orders status chronology).
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at);
