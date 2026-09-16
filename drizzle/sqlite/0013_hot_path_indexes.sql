-- Hot-path indexes (audited with EXPLAIN QUERY PLAN):
--   products by category/brand and price sorting were full SCANs, and a
--   price-ordered page sorted through a TEMP B-TREE.
--   orders(status, created_at) serves the admin status filter and the
--   pending_payment reaper without falling back to a status scan.
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at);
