ALTER TABLE orders ADD COLUMN created_at TEXT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features (product_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status, created_at);
