const db = require("better-sqlite3")("/app/data/janebi.db");

const KEEP = new Set([
  "usr-admin-aidin",          // real admin (Aidin)
  "usr-1788030159482",        // real user (Aidin Rezaei, own test account)
  "usr-1788257858363",        // real user (Nemati)
  "usr-1788107691094",        // real user ("Yash" — real signup, has a test order to purge)
]);

const isTestUser = (u) =>
  /تستی|آزمایشی|آزمون|کوکی و کش|E2E|e2e|Launch Readiness|contract|شماره فارسی|تستر/.test(u.name) ||
  /^(usr|admin|lr-user|user-other)-\d{10,}/.test(u.id) ||
  /contract_test/.test(u.id);

const tx = db.transaction(() => {
  const users = db.prepare("SELECT id,name,role FROM users").all();
  let removedUsers = 0;
  for (const u of users) {
    if (KEEP.has(u.id) || !isTestUser(u)) continue;
    // delete dependents first (FK safety)
    db.prepare("DELETE FROM addresses WHERE user_id=?").run(u.id);
    db.prepare("DELETE FROM cart_items WHERE user_id=?").run(u.id);
    db.prepare("DELETE FROM wishlist_items WHERE user_id=?").run(u.id);
    db.prepare("DELETE FROM reviews WHERE user_id=?").run(u.id);
    const ordIds = db.prepare("SELECT id FROM orders WHERE user_id=?").all(u.id).map((o) => o.id);
    for (const oid of ordIds) db.prepare("DELETE FROM order_items WHERE order_id=?").run(oid);
    db.prepare("DELETE FROM orders WHERE user_id=?").run(u.id);
    db.prepare("DELETE FROM users WHERE id=?").run(u.id);
    removedUsers++;
  }
  // orders belonging to remaining users but clearly test (recipient phone 0912… fake names)
  let removedTestOrders = 0;
  const orders = db.prepare("SELECT id,user_id,recipientName,recipientPhone FROM orders").all();
  for (const o of orders) {
    const isFake = /^a$|^سی$/.test((o.recipientName || "").trim()) || /^09125555555$|^09129292929$/.test(o.recipientPhone || "");
    if (isFake) {
      db.prepare("DELETE FROM order_items WHERE order_id=?").run(o.id);
      db.prepare("DELETE FROM orders WHERE id=?").run(o.id);
      removedTestOrders++;
    }
  }
  // zero fabricated ratings on DK products (no genuine reviews exist for them)
  const zeroed = db.prepare("UPDATE products SET rating=0, reviewsCount=0 WHERE sku LIKE 'DK-%' AND reviewsCount>0").run();
  // seed reviews (rev-101/102) reference product 1 with userName only (user_id null) — keep, they are content-seeded reviews
  return { removedUsers, removedTestOrders, fakeRatingsZeroed: zeroed.changes };
});

const res = tx();
const integrity = db.pragma("integrity_check", { simple: true });
const counts = {
  users: db.prepare("SELECT COUNT(*) n FROM users").get().n,
  orders: db.prepare("SELECT COUNT(*) n FROM orders").get().n,
  products: db.prepare("SELECT COUNT(*) n FROM products").get().n,
  dkWithRatings: db.prepare("SELECT COUNT(*) n FROM products WHERE sku LIKE 'DK-%' AND reviewsCount>0").get().n,
};
console.log(JSON.stringify({ ...res, integrity, counts }));
