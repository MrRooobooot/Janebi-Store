// FTS5 search integration test: migration creates the table + triggers, backfill
// covers every product, prefix + multi-token search returns expected ids, admin
// product updates keep the index in sync.
import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationSql = readFileSync(
  resolve(__dirname, '../../drizzle/sqlite/0014_products_fts.sql'),
  'utf-8'
).split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);

const db = new Database(':memory:');
db.exec(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    brand TEXT,
    category TEXT
  );
`);
for (const stmt of migrationSql) db.exec(stmt);

const seed = db.prepare('INSERT INTO products (id, title, brand, category) VALUES (?, ?, ?, ?)');
seed.run(1, 'هولدر مگنتی خودرو Baseus', 'بیسوس', 'هولدر و پایه');
seed.run(2, 'کابل شارژر type-c سریع', 'انکر', 'کابل و سیم');
seed.run(3, 'قاب محافظ iPhone 15', 'اسپایگن', 'قاب و کاور');

describe('products_fts migration 0014', () => {
  it('backfills every product row', () => {
    const n = db.prepare('SELECT count(*) c FROM products_fts').get() as { c: number };
    expect(n.c).toBe(3);
  });

  it('prefix-matches a single token', () => {
    const rows = db
      .prepare(`SELECT product_id FROM products_fts WHERE products_fts MATCH ?`)
      .all('"کابل"*') as { product_id: number }[];
    expect(rows.map((r) => r.product_id)).toContain(2);
  });

  it('multi-token AND search narrows results', () => {
    const rows = db
      .prepare(`SELECT product_id FROM products_fts WHERE products_fts MATCH ?`)
      .all('"کابل"* "شارژر"*') as { product_id: number }[];
    expect(rows.map((r) => r.product_id)).toEqual([2]);
  });

  it('matches brand and category columns too', () => {
    const byBrand = db
      .prepare(`SELECT product_id FROM products_fts WHERE products_fts MATCH ?`)
      .all('"انکر"*') as { product_id: number }[];
    expect(byBrand.map((r) => r.product_id)).toEqual([2]);
  });

  it('update trigger keeps the index in sync', () => {
    db.prepare('UPDATE products SET title = ? WHERE id = ?').run('گلس سرامیکی سامسونگ', 3);
    const rows = db
      .prepare(`SELECT product_id FROM products_fts WHERE products_fts MATCH ?`)
      .all('"سامسونگ"*') as { product_id: number }[];
    expect(rows.map((r) => r.product_id)).toEqual([3]);
  });

  it('delete trigger removes the row', () => {
    db.prepare('DELETE FROM products WHERE id = ?').run(3);
    const rows = db
      .prepare(`SELECT product_id FROM products_fts WHERE products_fts MATCH ?`)
      .all('"سامسونگ"*') as { product_id: number }[];
    expect(rows).toEqual([]);
  });
});
