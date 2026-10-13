// Set the sale price of every product that has a purchase price (cost_price) to
// cost × (1 + markup), rounded UP to the next 5,000 toman, and write one audit row per change.
// Products without cost_price (e.g. the MCdodo and Earldom lines, priced by the owner) are not touched.
//
// Run inside the app container so better-sqlite3 resolves from /app/node_modules:
//   node reprice-from-cost.cjs --dry-run                 (default: prints the plan, writes nothing)
//   node reprice-from-cost.cjs --apply [--markup 20]     (one transaction + audit rows)
//   node reprice-from-cost.cjs --apply --publish         (also sets is_active = 1 for costed products)
//
// Floor: a price below cost × 1.10 is refused (the admin UI marks such rows «زیر کف»).
const Database = require('better-sqlite3');

const DB = '/app/data/janebi.db';
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const publish = args.includes('--publish');
const mIdx = args.indexOf('--markup');
const MARKUP_PCT = mIdx >= 0 ? Number(args[mIdx + 1]) : 20;
const FLOOR_PCT = 10;
const STEP = 5000;

if (!Number.isFinite(MARKUP_PCT) || MARKUP_PCT < FLOOR_PCT) {
  console.error(`markup must be a number ≥ ${FLOOR_PCT}`);
  process.exit(1);
}

const db = new Database(DB, { fileMustExist: true, readonly: !apply });
const rows = db.prepare('SELECT id, sku, title, price, cost_price AS cost, is_active AS active FROM products WHERE cost_price IS NOT NULL ORDER BY id').all();

const plan = rows.map((r) => {
  const target = r.cost * (1 + MARKUP_PCT / 100);
  const newPrice = Math.ceil(target / STEP) * STEP;
  const floor = r.cost * (1 + FLOOR_PCT / 100);
  if (newPrice < floor) throw new Error(`floor breach for ${r.sku}`);
  return { ...r, newPrice, changed: newPrice !== r.price, activeAfter: publish ? 1 : r.active };
});

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', markupPct: MARKUP_PCT, publish, costedProducts: plan.length, changedPrices: plan.filter((p) => p.changed).length }));
for (const p of plan) {
  console.log([p.sku, p.cost, p.price, '→', p.newPrice, `margin=${(((p.newPrice - p.cost) / p.newPrice) * 100).toFixed(1)}%`, `active ${p.active}→${p.activeAfter}`].join('\t'));
}

if (apply) {
  const upd = db.prepare('UPDATE products SET price = ?, is_active = ? WHERE id = ?');
  const audit = db.prepare('INSERT INTO audit_logs (id, admin_user_id, action, entity, entity_id, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const tx = db.transaction(() => {
    for (const p of plan) {
      upd.run(p.newPrice, p.activeAfter, p.id);
      audit.run(
        `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        'system:reprice',
        'product.reprice',
        'product',
        String(p.id),
        JSON.stringify({ sku: p.sku, cost: p.cost, priceBefore: p.price, priceAfter: p.newPrice, markupPct: MARKUP_PCT, publish, activeBefore: p.active, activeAfter: p.activeAfter }),
        new Date().toISOString(),
      );
    }
  });
  tx();
  const integrity = Object.values(db.prepare('PRAGMA integrity_check').get())[0];
  console.log(JSON.stringify({ applied: plan.length, integrity }));
}
db.close();
