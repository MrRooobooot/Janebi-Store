// Global teardown: the suites share one persistent dev DB (data/janebi.db), so
// every fixture they insert has to be removed after the whole run — otherwise the
// residue leaks into the next design-audit (products with 404 images → err:N) and
// into the admin user list.
//
// SAFETY (this runs against whatever DATABASE_URL points at):
//   1. Real accounts are protected by TIME, not by id shape: a row is only deleted
//      when the epoch embedded in its id is >= the run start (minus skew), i.e. it
//      was created by this run. Real registrations use the very same `usr-${Date.now()}`
//      shape as fixtures, so id patterns alone can never tell them apart.
//   2. Operators are extra-protected: a row with role='admin' is only removed when
//      its id also matches a test-fixture prefix (hl-, di-, own-, r3-).
//   3. Products are matched by test markers only (title/SKU/image), never by id.
//   4. FORCE_FIXTURE_PURGE=1 (explicit operator action) re-enables the old broad
//      sweep for cleaning a DB that already holds residue.
import Database from 'better-sqlite3';
import path from 'path';

const KEEP_IDS = (process.env.KEEP_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const ADMIN_FIXTURE = /^(hl|di|own|r3)[-_]|^adm_|^usr[_]contract/;

/** Epoch (ms) embedded in a fixture id such as `hl-user-1789333913408`, or null. */
function embeddedEpoch(id: string): number | null {
  const m = String(id).match(/(\d{13})/);
  return m ? Number(m[1]) : null;
}

export default function teardown(startedAt = Date.now()) {
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

  const force = process.env.FORCE_FIXTURE_PURGE === '1';
  const sessionFloor = startedAt - 10 * 60 * 1000; // clock skew / slow suite tolerance
  const rows: Array<{ id: string; role: string | null }> = KEEP_IDS.length
    ? db.prepare(`select id, role from users where id not in (${KEEP_IDS.map(() => '?').join(',')})`).all(...KEEP_IDS)
    : db.prepare('select id, role from users').all();

  const ids = rows.filter((u) => {
    if (force) return true;
    const ts = embeddedEpoch(u.id);
    const runFresh = ts !== null && ts >= sessionFloor;
    if (!runFresh) return false;                   // pre-existing row (incl. every real customer) → protected
    if (u.role === 'admin') return ADMIN_FIXTURE.test(u.id); // operator accounts survive unless they are run-fresh fixtures
    return true;                                   // created by this run → fixture
  }).map((u) => u.id);

  const ph = ids.map(() => '?').join(',') || "''";
  const products: number[] = has('products')
    ? db.prepare("select id from products where title like '%کالای تست%' or image like '%test%' or sku like 'DI-SKU-%'").all().map((r: any) => r.id)
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
      console.log(`[teardown] residue removed — users:${usersRemoved}, products:${products.length} (only rows created during this run)`);
    }
  } catch (e: any) {
    db.exec('ROLLBACK');
    console.warn('[teardown] residue cleanup skipped:', e.message);
  }
  db.close();
}
