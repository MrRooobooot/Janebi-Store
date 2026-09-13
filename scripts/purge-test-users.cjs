// purge-test-users.cjs — run INSIDE janebi-store container.
// Deletes every non-admin user plus their dependent rows, in one transaction.
// Usage: node purge-test-users.cjs inspect   (report only)
//        node purge-test-users.cjs apply     (delete, after backup)
const fs = require('fs');
const Database = require('better-sqlite3');
const DB = process.env.DATABASE_FILE || '/app/data/janebi.db';
const mode = process.argv[2] || 'inspect';
const db = new Database(DB);

// KEEP_IDS (comma list) overrides the role-based rule — used for local cleanup, where
// hundreds of test-created admins would otherwise survive a role-based purge.
const KEEP_IDS = (process.env.KEEP_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const NON_ADMIN = KEEP_IDS.length
  ? db.prepare(`select id, phone, role, vip_points from users where id not in (${KEEP_IDS.map(() => '?').join(',')})`).all(...KEEP_IDS)
  : db.prepare("select id, phone, role, vip_points from users where role <> 'admin' or role is null").all();
const admins = db.prepare("select id, phone, role from users where role = 'admin'").all();
console.log(JSON.stringify({ users_total: db.prepare('select count(*) n from users').get().n, admins: admins.length, non_admins: NON_ADMIN.length }, null, 0));

function countsFor(table, col) {
  if (!db.prepare("select name from sqlite_master where type='table' and name=?").get(table)) return null;
  const cols = db.prepare(`pragma table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) return null;
  const placeholders = NON_ADMIN.map(() => '?').join(',');
  if (!placeholders) return 0;
  return db.prepare(`select count(*) n from ${table} where ${col} in (${placeholders})`).get(...NON_ADMIN.map((u) => u.id)).n;
}

const dep = {
  orders: countsFor('orders', 'user_id'),
  order_items_via_orders: db.prepare(
    "select count(*) n from order_items where order_id in (select id from orders where user_id in (" + (NON_ADMIN.map(() => '?').join(',') || "''") + "))"
  ).get(...NON_ADMIN.map((u) => u.id)).n,
  cart_items: countsFor('cart_items', 'user_id'),
  wishlist_items: countsFor('wishlist_items', 'user_id'),
  addresses: countsFor('addresses', 'user_id'),
  reviews: countsFor('reviews', 'user_id'),
};
const reviewedProducts = db.prepare(
  "select distinct product_id from reviews where user_id in (" + (NON_ADMIN.map(() => '?').join(',') || "''") + ")"
).all(...NON_ADMIN.map((u) => u.id)).map((r) => r.product_id);

console.log('dependency rows:', JSON.stringify(dep));
console.log('products whose rating must be recomputed:', JSON.stringify(reviewedProducts));
console.log('purge targets (sample):', JSON.stringify(NON_ADMIN.slice(0, 5).map((u) => u.id)), NON_ADMIN.length > 5 ? `… +${NON_ADMIN.length - 5} more` : '');

// Product residue: vitest suites leave «کالای تست …» / test-*.jpg rows behind in a
// persistent dev DB — they 404 in design-audit (err:N) and must go with the users.
// Rows referenced by a real order are never touched (FK-safe by construction).
const TEST_PRODUCTS = db.prepare(
  "select id, title from products where (title like '%تست%' or image like '%test%') and id not in (select product_id from order_items where product_id is not null)"
).all();
console.log('product residue:', TEST_PRODUCTS.length, JSON.stringify(TEST_PRODUCTS.slice(0, 3).map((p) => p.id)));

if (mode !== 'apply') {
  console.log('INSPECT ONLY');
  process.exit(0);
}

// ---- backup first (WAL-safe online backup) ----
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `/tmp/janebi-pre-purge-${stamp}.db`;
db.backup(backupPath).then(() => {
  console.log('backup:', backupPath, fs.statSync(backupPath).size, 'bytes');

  const ids = NON_ADMIN.map((u) => u.id);
  if (ids.length === 0) { console.log('nothing to purge'); process.exit(0); }
  const ph = ids.map(() => '?').join(',');

  db.exec('BEGIN IMMEDIATE');
  try {
    const del = (sql) => db.prepare(sql).run(...ids).changes;
    const removed = {
      order_items: del(`delete from order_items where order_id in (select id from orders where user_id in (${ph}))`),
      orders: del(`delete from orders where user_id in (${ph})`),
      cart_items: del(`delete from cart_items where user_id in (${ph})`),
      wishlist_items: del(`delete from wishlist_items where user_id in (${ph})`),
      addresses: del(`delete from addresses where user_id in (${ph})`),
      reviews: del(`delete from reviews where user_id in (${ph})`),
      users: db.prepare(
        KEEP_IDS.length
          ? `delete from users where id in (${ph})`
          : `delete from users where id in (${ph}) and role <> 'admin'`
      ).run(...ids).changes,
    };
    // product residue (test fixtures) — dependent rows first, same transaction
    const pids = TEST_PRODUCTS.map((p) => p.id);
    if (pids.length) {
      const pph = pids.map(() => '?').join(',');
      const delP = (sql) => db.prepare(sql).run(...pids).changes;
      removed.product_reviews = delP(`delete from reviews where product_id in (${pph})`);
      removed.product_cart = delP(`delete from cart_items where product_id in (${pph})`);
      removed.product_wishlist = delP(`delete from wishlist_items where product_id in (${pph})`);
      removed.products = delP(`delete from products where id in (${pph})`);
    }
    // keep storefront aggregates honest after review deletion
    for (const pid of reviewedProducts) {
      const agg = db.prepare('select coalesce(avg(rating),0) a, count(*) c from reviews where product_id = ? and approved = 1').get(pid);
      db.prepare('update products set rating = ?, reviewsCount = ? where id = ?').run(Math.round(agg.a * 10) / 10, agg.c, pid);
    }
    db.exec('COMMIT');
    console.log('removed:', JSON.stringify(removed));
    console.log('after → users_total:', db.prepare('select count(*) n from users').get().n,
      '| admins:', db.prepare("select count(*) n from users where role='admin'").get().n);
    const orphanOrders = db.prepare("select count(*) n from orders where user_id not in (select id from users)").get().n;
    const orphanItems = db.prepare("select count(*) n from order_items where order_id not in (select id from orders)").get().n;
    const orphanReviews = db.prepare("select count(*) n from reviews where user_id is not null and user_id not in (select id from users)").get().n;
    console.log('orphans → orders:', orphanOrders, 'order_items:', orphanItems, 'reviews:', orphanReviews);
    console.log('integrity:', db.pragma('integrity_check')[0].integrity_check, '| fk_check rows:', db.pragma('foreign_key_check').length);
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('ROLLBACK —', e.message);
    process.exit(1);
  }
}).catch((e) => { console.error('backup failed:', e.message); process.exit(1); });
