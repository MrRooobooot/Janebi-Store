#!/usr/bin/env node
// One-shot idempotent: merge duplicate/orphan categories into canonical approved ones.
// Category Tree Rule: consolidation of exact-subset dupes only — no renames, no new cats.
const path = require('path');
const dbPath = process.argv[2] || path.join(__dirname, '..', 'data', 'janebi.db');
const db = require('better-sqlite3')(dbPath);
const MERGES = {
  'شارژر': 'شارژر و آداپتور',
  'قاب و کاور': 'قاب و کاور موبایل',
  'گلس': 'گلس و محافظ صفحه',
  'هندزفری': 'هندزفری و ایرباد',
  'هولدر و پایه': 'هولدر و نگهدارنده',
  'کابل': 'کابل و سیم',
  'محافظ کابل': 'کابل و سیم',
};
let total = 0;
const tx = db.transaction(() => {
  for (const [dupe, target] of Object.entries(MERGES)) {
    const r = db.prepare('UPDATE products SET category=? WHERE category=?').run(target, dupe);
    if (r.changes) console.log(`${dupe} (${r.changes}) → ${target}`);
    total += r.changes;
  }
});
tx();
const cats = db.prepare('SELECT COUNT(DISTINCT category) c FROM products').get().c;
console.log(`merged=${total} distinct-categories=${cats} db=${dbPath}`);
