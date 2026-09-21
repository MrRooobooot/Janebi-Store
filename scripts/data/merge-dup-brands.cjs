#!/usr/bin/env node
// One-shot idempotent: merge Latin/English brand values into the canonical Persian
// brand name (the store is RTL; the seed faName is the display brand and BrandLogo
// maps both forms). Re-running is a no-op once the Latin values are gone.
//
// Usage: node scripts/data/merge-dup-brands.cjs [path/to/janebi.db]
const path = require('path');
const dbPath = process.argv[2] || path.join(__dirname, '..', '..', 'data', 'janebi.db');
const db = require('better-sqlite3')(dbPath);

const MERGES = {
  Anker: 'انکر',
  Apple: 'اپل',
  Samsung: 'سامسونگ',
  Baseus: 'بیسوس',
  Xiaomi: 'شیائومی',
};

const before = db.prepare('SELECT COUNT(DISTINCT brand) c FROM products').get().c;
let total = 0;
const tx = db.transaction(() => {
  for (const [en, fa] of Object.entries(MERGES)) {
    const r = db.prepare('UPDATE products SET brand=? WHERE brand=?').run(fa, en);
    if (r.changes) console.log(`${en} (${r.changes}) → ${fa}`);
    total += r.changes;
  }
});
tx();
const after = db.prepare('SELECT COUNT(DISTINCT brand) c FROM products').get().c;
console.log(`merged=${total} distinct-brands ${before} → ${after} db=${dbPath}`);
db.close();
