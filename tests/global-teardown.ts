// Global teardown: the suites share one persistent dev DB (data/janebi.db), so
// every fixture they insert has to be removed after the whole run — otherwise
// the residue leaks into the next design-audit (products with 404 images →
// err:N) and into the admin user list (fake admins/customers).
//
// Runs ONCE after all test files (vitest globalTeardown), never concurrently with
// tests, and only against whatever DATABASE_URL points at — production never runs
// vitest. Real store accounts (the three admins) are always kept.
import Database from 'better-sqlite3';
import path from 'path';

const KEEP = (process.env.KEEP_IDS || 'usr-admin-aidin,usr-admin-ali,usr-admin-masoume')
  .split(',').map((s) => s.trim()).filter(Boolean);

export default function teardown() {
  const url = process.env.DATABASE_URL || './data/janebi.db';
  if (/^postgres(ql)?:\/\//.test(url)) return; // pg parity runs use their own schema
  const file = path.isAbsolute(url) ? url : path.resolve(process.cwd(), url);
  let db: any;
  try {
    db = new Database(file);
  } catch {
    return; // no sqlite DB in this run — nothing to clean
  }

  const has = (t: string) => !!db.prepare("select name from sqlite_master where type='table' and name=?").get(t);
  if (!has('users')) { db.close(); return; }

  // Fixture-id shapes seen across the suites: hl-*, di-*, own-*, r3-*, usr-*,
  // *contract_test_*, adm_<x>, plus anything ending in a 13-digit epoch.
  const where = `id not in (${KEEP.map(() => '?').join(',')}) and (
      id like 'hl-%' or id like 'di-%' or id like 'own-%' or id like 'r3-%' or id like 'usr-%'
      or id like '%\\_test%' escape '\\' or id like 'adm\\_%' escape '\\' or id glob '*-17????????????')`;
  const ids: string[] = db.prepare(`select id from users where ${where}`).all(...KEEP).map((r: any) => r.id);

  const ph = ids.map(() => '?').join(',') || "''";
  const products: number[] = has('products')
    ? db.prepare("select id from products where title like '%تست%' or image like '%test%' or sku like 'DI-SKU-%'").all().map((r: any) => r.id)
    : [];
  const pph = products.map(() => '?').join(',') || "''";

  db.exec('BEGIN IMMEDIATE');
  try {
    const del = (sql: string, args: any[] = []) => (args.length ? db.prepare(sql).run(...args).changes : 0);
    del(`delete from order_items where order_id in (select id from orders where user_id in (${ph}))`, ids);
    del(`delete from orders where user_id in (${ph})`, ids);
    del(`delete from cart_items where user_id in (${ph})`, ids);
    del(`delete from reviews where user_id in (${ph})`, ids);
    if (has('addresses')) del(`delete from addresses where user_id in (${ph})`, ids);
    if (has('wishlist_items')) {
      del(`delete from wishlist_items where user_id in (${ph})`, ids);
      if (products.length) del(`delete from wishlist_items where product_id in (${pph})`, products);
    }
    if (has('product_features') && products.length) del(`delete from product_features where product_id in (${pph})`, products);
    if (has('reviews') && products.length) del(`delete from reviews where product_id in (${pph})`, products);
    if (products.length) {
      del(`delete from order_items where product_id in (${pph})`, products);
      del(`delete from cart_items where product_id in (${pph})`, products);
      del(`delete from products where id in (${pph})`, products);
    }
    const usersRemoved = del(`delete from users where id in (${ph})`, ids);
    db.exec('COMMIT');
    if (usersRemoved || products.length) {
      console.log(`[teardown] residue removed — users:${usersRemoved}, products:${products.length}`);
    }
  } catch (e: any) {
    db.exec('ROLLBACK');
    console.warn('[teardown] residue cleanup skipped:', e.message);
  }
  db.close();
}
