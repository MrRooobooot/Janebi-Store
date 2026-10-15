-- Extra gallery photos per product (the cover stays in products.image).
-- Additive only: no existing row changes; products without rows keep a one-photo gallery.
CREATE TABLE IF NOT EXISTS product_images (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort integer NOT NULL DEFAULT 0
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, sort);
