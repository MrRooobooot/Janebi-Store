#!/usr/bin/env node
// One-shot idempotent: merge Latin/English brand values into the canonical Persian
// brand name (store is RTL; seed faName = display brand; BrandLogo maps both forms).
const path = require('path');
const dbPath = process.argv[2] || path.join(__dirname, '..', 'data', 'janebi.db');
const db = require('better-sqlite3')(dbPath);
const MERGES = {
  'Anker': 'انکر',
  'Apple': 'اپل',
  'Samsung': 'سامسونگ',
  'Baseus': 'بیسوس',
  'Xiaomi': 'شیائومی',
};
let total = 0;
const tx = db.transaction(() => {
  for (const [en, fa] of Object.entries(MERGES)) {
    const r = db.prepare('UPDATE products SET brand=? WHERE brand=?').run(fa, en);
    if (r.changes) console.log(`${en} (${r.changes}) → ${fa}`);
    total += r.changes;
  }
});
tx();
const brands = db.prepare('SELECT COUNT(DISTINCT brand) c FROM products').get().c;
console.log(`merged=${total} distinct-brands=${brands} db=${dbPath}`);
