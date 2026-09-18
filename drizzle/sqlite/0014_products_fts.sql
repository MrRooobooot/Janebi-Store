-- FTS5 catalogue search (prefix queries over title/brand/category).
-- The LIKE '%q%' filter is a full table scan that cannot use any index; FTS5 keeps
-- search O(log n) as the catalogue grows. products_fts is kept in sync with triggers.
-- PG parity: PG keeps the LIKE path (to_tsvector migration is a follow-up); the app
-- feature-detects FTS5 availability and falls back to LIKE transparently.
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  product_id UNINDEXED,
  title,
  brand,
  category,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products BEGIN
  INSERT INTO products_fts (product_id, title, brand, category)
  VALUES (new.id, new.title, new.brand, new.category);
END;

CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products BEGIN
  DELETE FROM products_fts WHERE product_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE OF title, brand, category ON products BEGIN
  DELETE FROM products_fts WHERE product_id = old.id;
  INSERT INTO products_fts (product_id, title, brand, category)
  VALUES (new.id, new.title, new.brand, new.category);
END;

-- Backfill for pre-existing rows (idempotent: clear then rebuild).
DELETE FROM products_fts;
INSERT INTO products_fts (product_id, title, brand, category)
SELECT id, title, brand, category FROM products;
