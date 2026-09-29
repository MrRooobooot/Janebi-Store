// Read-only production DB probe (piped into the container: docker exec -i janebi-store node -).
// Reports the money-path schema + state the release gate must confirm, never writes.
import Database from 'better-sqlite3';

const db = new Database(process.argv[2] || '/app/data/janebi.db', { readonly: true });
const cols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
const moneyCols = ['payment_amount', 'payment_provider', 'payment_url', 'payment_requested_at'];
const row = db
  .prepare(
    "SELECT (SELECT count(*) FROM products) AS products, (SELECT count(*) FROM users) AS users, " +
      "(SELECT count(*) FROM orders) AS orders, " +
      "(SELECT count(*) FROM orders WHERE status='pending_payment') AS pending_payment, " +
      "(SELECT count(*) FROM __drizzle_migrations) AS migrations " +
      "FROM (SELECT 1)",
  )
  .get();
console.log(
  JSON.stringify({
    orders_payment_columns: moneyCols.filter((c) => cols.includes(c)),
    missing_payment_columns: moneyCols.filter((c) => !cols.includes(c)),
    orders_total_columns: cols.length,
    integrity: db.prepare('PRAGMA integrity_check').get().integrity_check,
    foreign_keys: db.prepare('PRAGMA foreign_key_check').all().length,
    ...row,
  }),
);
db.close();
