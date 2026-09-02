const db = require("better-sqlite3")("/app/data/janebi.db");
const tx = db.transaction(() => {
  // 4 leftover test entities: "کاربر دیگر" (fixture id), 3 × admin-e2e (role admin but test names)
  const kill = [
    "user-other-wish-1787470661837",
    "admin-e2e-1787472073138",
    "admin-e2e-1787510951907",
    "admin-e2e-1787510976062",
  ];
  let n = 0;
  for (const id of kill) {
    db.prepare("DELETE FROM addresses WHERE user_id=?").run(id);
    db.prepare("DELETE FROM cart_items WHERE user_id=?").run(id);
    db.prepare("DELETE FROM wishlist_items WHERE user_id=?").run(id);
    db.prepare("DELETE FROM reviews WHERE user_id=?").run(id);
    const oids = db.prepare("SELECT id FROM orders WHERE user_id=?").all(id).map((o) => o.id);
    for (const o of oids) db.prepare("DELETE FROM order_items WHERE order_id=?").run(o);
    db.prepare("DELETE FROM orders WHERE user_id=?").run(id);
    db.prepare("DELETE FROM users WHERE id=?").run(id);
    n++;
  }
  return n;
});
const removed = tx();
console.log(JSON.stringify({
  removed,
  users: db.prepare("SELECT COUNT(*) n FROM users").get().n,
  integrity: db.pragma("integrity_check", { simple: true }),
}));
