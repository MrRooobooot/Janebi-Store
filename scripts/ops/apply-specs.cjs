// Insert product_features (spec pills) for products that have none, from a reviewed JSON worksheet
// [{ "id": 5696, "features": ["...", "..."] }, ...], and write one audit row per product.
// Never replaces existing features: a product that already has any is skipped and reported.
// Rows written here bypass logAudit/appCache.invalidate, so the audit row is written here and the
// app container must be restarted afterwards (release notes say so).
//
// Run inside the app container so better-sqlite3 resolves from /app/node_modules:
//   node apply-specs.cjs specs.json            (default: dry-run, writes nothing)
//   node apply-specs.cjs specs.json --apply
const fs = require('fs');
const Database = require('better-sqlite3');

const DB = '/app/data/janebi.db';
const file = process.argv[2];
const apply = process.argv.includes('--apply');
if (!file) { console.error('usage: apply-specs.cjs specs.json [--apply]'); process.exit(1); }

const sheet = JSON.parse(fs.readFileSync(file, 'utf8'));
const db = new Database(DB, { fileMustExist: true, readonly: !apply });
const find = db.prepare('SELECT id, title FROM products WHERE id = ?');
const count = db.prepare('SELECT count(*) AS n FROM product_features WHERE product_id = ?');

const plan = [];
const skipped = [];
for (const row of sheet) {
  const features = (row.features || []).map((f) => String(f).trim()).filter(Boolean).slice(0, 20);
  const p = find.get(row.id);
  if (!p) { skipped.push({ id: row.id, why: 'no such product' }); continue; }
  if (count.get(row.id).n > 0) { skipped.push({ id: row.id, why: 'already has features' }); continue; }
  if (!features.length) { skipped.push({ id: row.id, why: 'empty worksheet row' }); continue; }
  plan.push({ id: row.id, title: p.title, features });
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', willWrite: plan.length, skipped }));
for (const p of plan.slice(0, 5)) console.log(p.id, p.features.join(' | '));

if (apply) {
  const ins = db.prepare('INSERT INTO product_features (product_id, feature) VALUES (?, ?)');
  const audit = db.prepare('INSERT INTO audit_logs (id, admin_user_id, action, entity, entity_id, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (const p of plan) {
      for (const f of p.features) ins.run(p.id, f);
      audit.run(
        `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        'system:specs-import', 'product.features.import', 'product', String(p.id),
        JSON.stringify({ features: p.features, source: 'title/description facts, owner-approved 2026-10-17' }),
        new Date().toISOString(),
      );
    }
  })();
  console.log(JSON.stringify({ applied: plan.length, integrity: Object.values(db.prepare('PRAGMA integrity_check').get())[0] }));
}
db.close();
