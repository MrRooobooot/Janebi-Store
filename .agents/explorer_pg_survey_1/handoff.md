# Technical Survey & Architecture Recommendation: PostgreSQL & SQLite Dual-Dialect Support

**Author**: `explorer_pg_survey_1`  
**Date**: 2026-08-15  
**Working Directory**: `/Users/aidin/antigravity/Janebi-Store/.agents/explorer_pg_survey_1`  
**Authoritative Request Reference**: `/Users/aidin/antigravity/Janebi-Store/.agents/ORIGINAL_REQUEST.md` (Phase 2)  

---

## 1. Observation

### 1.1 Database Connection Layer (`server/db/index.ts`)
Direct inspection of `server/db/index.ts` (lines 1–13):
```ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { env } from '../env.js';
import * as schema from './schema.js';
import path from 'path';

const dbPath = path.resolve(process.cwd(), env.DATABASE_URL.startsWith('postgres') ? './data/janebi.db' : env.DATABASE_URL);
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });
```
- **Finding 1.1.1**: Even when `DATABASE_URL` is configured with a PostgreSQL URI (e.g., `postgres://postgres:postgres@localhost:5432/janebi`), line 7 explicitly overrides it to `'./data/janebi.db'` and initializes `better-sqlite3`. PostgreSQL driver initialization is currently non-existent in `server/db/index.ts`.
- **Finding 1.1.2**: No connection pooling configuration (`pg.Pool`), dynamic driver selection, connection timeout handling, or connection teardown/close lifecycle hook exists.

### 1.2 Driver & ORM Dependencies (`package.json`)
Direct inspection of `package.json`:
- `pg`: `^8.23.0` (installed)
- `@types/pg`: `^8.21.0` (installed)
- `better-sqlite3`: `^13.0.3` (installed)
- `@types/better-sqlite3`: `^9.6.0` (installed)
- `drizzle-orm`: `^0.45.2` (installed)
- `drizzle-kit`: `^0.31.10` (installed)
- **Finding 1.2.1**: All core production dependencies for both PostgreSQL (`pg` + `drizzle-orm/node-postgres`) and SQLite (`better-sqlite3` + `drizzle-orm/better-sqlite3`) are already present in `node_modules` and locked in `package-lock.json`.

### 1.3 Schema Parity & Definitions (`server/db/schema.ts` vs `server/db/schema.pg.ts`)
Direct inspection of `server/db/schema.ts` (SQLite) and `server/db/schema.pg.ts` (PostgreSQL):
- Both schema files define all 10 core domain tables:
  1. `users` (id: text pk, name, phone: text unique, email, password, avatar, joined_date, vip_points, role)
  2. `addresses` (id: text pk, user_id fk, title, name, phone, province, city, address, postal_code, is_default)
  3. `products` (id: serial/autoincrement pk, title, category, price, originalPrice, discount, image, brand, warranty, description, rating, reviewsCount, stockQuantity, sku: text unique)
  4. `product_features` (id: serial/autoincrement pk, product_id fk, feature)
  5. `orders` (id: text pk, user_id fk, date, status, statusText, total, subtotal, shippingFee, discountAmount, paymentMethod, shippingMethod, recipientName, recipientPhone, recipientAddress, recipientPostalCode, authority, refId)
  6. `order_items` (id: serial/autoincrement pk, order_id fk, product_id fk, price, qty, title, image, brand)
  7. `reviews` (id: text pk, product_id fk, user_id fk, userName, rating, title, comment, date, isVerifiedBuyer, recommend, helpfulCount, unhelpfulCount)
  8. `coupons` (code: text pk, percent, amount, minTotal, label, active)
  9. `cart_items` (id: text pk, user_id fk, product_id fk, quantity, added_at)
  10. `wishlist_items` (id: text pk, user_id fk, product_id fk, added_at)
- Both files define identical Drizzle relations: `productsRelations`, `productFeaturesRelations`, `reviewsRelations`, `ordersRelations`, `orderItemsRelations`, `usersRelations`, `cartItemsRelations`, `wishlistItemsRelations`.
- **Finding 1.3.1**: The column structure, constraints, foreign keys, and inferred TypeScript types (`$inferSelect`, `$inferInsert`) match 100% across SQLite and PostgreSQL definitions.

### 1.4 Drizzle Kit Configurations & Migrations
Direct inspection of `drizzle.config.ts`, `drizzle.pg.config.ts`, and `drizzle/`:
- `drizzle.config.ts` targets `./server/db/schema.ts`, dialect `'sqlite'`, output `./drizzle/sqlite`.
- `drizzle.pg.config.ts` targets `./server/db/schema.pg.ts`, dialect `'postgresql'`, output `./drizzle/pg`.
- Generated migration `drizzle/pg/0000_tan_captain_cross.sql` contains valid PostgreSQL DDL with `serial`, `boolean`, and `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`.
- `package.json` currently only defines `"db:generate": "drizzle-kit generate"` and `"db:push": "drizzle-kit push"`, which default to SQLite. There are no npm scripts targeting PostgreSQL Drizzle configurations (e.g. `db:generate:pg`, `db:push:pg`).

### 1.5 Route Query & Transaction Incompatibilities
Grep analysis across `server/routes/` identified several places where SQLite-specific synchronous execution methods and syntax are used:
1. **`server/routes/orders.ts`**:
   - Line 64: `const newOrder = db.transaction((tx) => { ... })` — Synchronous transaction block.
   - Line 84: `tx.select().from(products).where(...).all()` — `.all()` is `better-sqlite3` specific.
   - Line 117: `tx.select().from(coupons).where(...).get()` — `.get()` is `better-sqlite3` specific.
   - Lines 157, 168, 174, 181: `.run()` — `.run()` is `better-sqlite3` specific.
   - Line 176: `if (updateResult.changes === 0)` — relies on `better-sqlite3` statement result object (`.changes`), which does not exist in `node-postgres`.
   - Lines 205–237: Cancellation transaction uses `.get()`, `.all()`, and `.run()`.
2. **`server/routes/payment.ts`**:
   - Lines 127–137: `restockOrder` uses `.all()`, `.run()`.
   - Lines 141–146, 153–164, 191–202, 207–212: Synchronous `db.transaction((tx) => ...)` with `.get()` and `.run()`.
3. **`server/routes/users.ts`**:
   - Lines 160–178: Address deletion transaction uses `.get()` and `.run()`.
   - Lines 194–213: Default address toggle transaction uses `.get()` and `.run()`.
4. **`server/routes/admin.ts`**:
   - Lines 168–174: Product cascading deletion uses `db.transaction((tx) => { ... .run() })`.

*Note*: In `drizzle-orm/node-postgres`, all queries return Promises, `.all()`, `.get()`, and `.run()` do not exist, and transactions must be asynchronous (`await db.transaction(async (tx) => { ... })`).

### 1.6 Server Startup & Bootstrap Migrations (`server/index.ts`)
Direct inspection of `server/index.ts` (lines 10–24):
```ts
async function ensureDatabaseInitialized() {
  try {
    const migrationFile = path.resolve(process.cwd(), 'drizzle/0000_absurd_night_nurse.sql');
    if (fs.existsSync(migrationFile)) {
      const sql = fs.readFileSync(migrationFile, 'utf-8');
      const statements = sql.split('--> statement-breakpoint');
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
          (db as any).session.client.exec(trimmed);
        }
      }
    }
```
- **Finding 1.6.1**: The migration file referenced (`0000_absurd_night_nurse.sql`) does not exist on disk.
- **Finding 1.6.2**: `(db as any).session.client.exec(trimmed)` is `better-sqlite3` driver-specific. Under `node-postgres`, `(db as any).session.client` is a `pg.Pool` or `pg.Client`, causing a runtime TypeError if executed against PostgreSQL.

### 1.7 Environment & Container Configuration (`server/env.ts`, `docker-compose.yml`, `.env`)
- `server/env.ts`: `DATABASE_URL` is parsed as `z.string().default('./data/janebi.db')`.
- `docker-compose.yml`:
  - `db` service runs `postgres:15-alpine` with healthcheck (`pg_isready -U postgres -d janebi`).
  - `app` service injects `DATABASE_URL=${DATABASE_URL:-postgres://postgres:postgres@db:5432/janebi}` and depends on `db: condition: service_healthy`.
- `.env`: Contains `DATABASE_URL="postgres://postgres:postgres@localhost:5432/janebi"`.
- `.env.example`: Contains `DATABASE_URL=data/janebi.db`.

---

## 2. Logic Chain

1. **Dialect Selection (From Finding 1.1.1 to 1.7)**:
   - When `DATABASE_URL` starts with `postgres://` or `postgresql://`, the application must initialize a `pg.Pool` connection pool using `drizzle-orm/node-postgres` with `server/db/schema.pg.ts`.
   - When `DATABASE_URL` is a file path, `:memory:`, or starts with `sqlite:`, the application must initialize `better-sqlite3` using `drizzle-orm/better-sqlite3` with `server/db/schema.ts`.
   - Offline vitest unit tests (`vitest run`) currently default to SQLite and pass all 254 tests in ~15s. Retaining SQLite fallback ensures fast, zero-dependency local testing while enabling full PostgreSQL staging.

2. **Schema & Model Resolution (From Finding 1.3.1)**:
   - In Drizzle ORM, passing a `SQLiteTable` to a PostgreSQL query builder or vice versa can cause SQL generation discrepancies.
   - Because the 10 tables have identical names, columns, and relations across `schema.ts` and `schema.pg.ts`, `server/db/schema.ts` (or `server/db/index.ts`) can dynamically export the active dialect's tables, preserving complete TypeScript type safety and compile-time correctness across all route handlers.

3. **Query & Transaction Portability (From Finding 1.5)**:
   - Modern Drizzle ORM supports `await db.transaction(async (tx) => { ... })` across both `better-sqlite3` and `node-postgres`.
   - Replacing synchronous `.all()` with `await tx.select().from(...)`, `.get()` with `(await tx.select().from(...))[0]`, and `.run()` with `await tx.insert/update/delete(...)` creates a unified async query pattern that executes identically on both drivers.
   - For atomic inventory decrement:
     ```ts
     const updated = await tx.update(products)
       .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
       .where(and(eq(products.id, item.id), gte(products.stockQuantity, item.quantity)))
       .returning({ id: products.id, stockQuantity: products.stockQuantity });

     if (updated.length === 0) {
       throw new Error(`موجودی محصول ${item.title} کافی نیست`);
     }
     ```
     Because SQLite (>= 3.35) and PostgreSQL both support `RETURNING`, `updated.length === 0` provides 100% portable, dialect-agnostic race condition protection without relying on driver-specific `.changes` or `.rowCount`.

4. **Startup Initialization & Migration Execution (From Finding 1.6)**:
   - In `server/index.ts`, database bootstrapping should detect the active driver:
     - For PostgreSQL: Execute DDL from `drizzle/pg/*.sql` via `pool.query()` or `drizzle-orm/node-postgres/migrator`.
     - For SQLite: Execute DDL from `drizzle/sqlite/*.sql` via `sqlite.exec()` or `drizzle-orm/better-sqlite3/migrator`.
   - When seeding initial data into PostgreSQL with predefined IDs, sequence counters must be updated via `SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));` so subsequent inserts do not trigger unique constraint collisions.

---

## 3. Recommended Implementation Architecture

### 3.1 `server/db/index.ts` — Dynamic Dual-Dialect Database Layer
```ts
import { drizzle as drizzleSqlite, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg, NodePgDatabase } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import { env } from '../env.js';
import * as sqliteSchema from './schema.js';
import * as pgSchema from './schema.pg.js';
import path from 'path';
import fs from 'fs';

export const isPostgres = env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://');

let dbInstance: any;
let poolInstance: pkg.Pool | null = null;
let sqliteInstance: Database.Database | null = null;

if (isPostgres) {
  poolInstance = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  dbInstance = drizzlePg(poolInstance, { schema: pgSchema });
} else {
  const dbDir = path.resolve(process.cwd(), './data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = env.DATABASE_URL === ':memory:' 
    ? ':memory:' 
    : path.resolve(process.cwd(), env.DATABASE_URL);

  sqliteInstance = new Database(dbPath);
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('busy_timeout = 5000');
  dbInstance = drizzleSqlite(sqliteInstance, { schema: sqliteSchema });
}

export const pool = poolInstance;
export const sqlite = sqliteInstance;
export const db = dbInstance as (NodePgDatabase<typeof pgSchema> & BetterSQLite3Database<typeof sqliteSchema>);

export async function closeDb() {
  if (poolInstance) {
    await poolInstance.end();
  }
  if (sqliteInstance) {
    sqliteInstance.close();
  }
}
```

### 3.2 Dynamic Schema Re-Export (`server/db/schema.ts`)
To allow route files to continue importing `{ products, orders, users, ... } from '../db/schema.js'` without code breakage:
```ts
import * as sqliteSchema from './schema.sqlite.js'; // or inline definitions
import * as pgSchema from './schema.pg.js';

const isPg = process.env.DATABASE_URL?.startsWith('postgres://') || process.env.DATABASE_URL?.startsWith('postgresql://');
const activeSchema = isPg ? pgSchema : sqliteSchema;

export const {
  users,
  addresses,
  products,
  productFeatures,
  orders,
  orderItems,
  reviews,
  coupons,
  cartItems,
  wishlistItems,
  usersRelations,
  productsRelations,
  productFeaturesRelations,
  ordersRelations,
  orderItemsRelations,
  reviewsRelations,
  cartItemsRelations,
  wishlistItemsRelations
} = activeSchema;
```

### 3.3 Route Refactoring Summary
| File | Changes Required |
|---|---|
| `server/routes/orders.ts` | Change `db.transaction((tx) => ...)` to `await db.transaction(async (tx) => ...)`; replace `.all()` with `await tx.select()`, `.get()` with `(await tx.select())[0]`, `.run()` with `await tx.insert/update/delete`; use `.returning()` with length check for atomic inventory reduction. |
| `server/routes/payment.ts` | Make `restockOrder` and payment verify transactions `async`; replace `.all()`, `.get()`, `.run()`. |
| `server/routes/users.ts` | Make address mutation transactions `async`; replace `.get()`, `.run()`. |
| `server/routes/admin.ts` | Make product deletion cascade `async`. |

### 3.4 `package.json` Scripts Update
Add PostgreSQL-specific Drizzle commands:
```json
"db:generate": "drizzle-kit generate",
"db:generate:pg": "drizzle-kit generate --config=drizzle.pg.config.ts",
"db:push": "drizzle-kit push",
"db:push:pg": "drizzle-kit push --config=drizzle.pg.config.ts",
"db:migrate:pg": "tsx scripts/migrate-sqlite-to-pg.ts"
```

---

## 4. Caveats

1. **Live PostgreSQL Connectivity in Automated Test Suite**:
   - In environments where PostgreSQL is not running locally on port 5432, tests that require live Postgres (`tests/postgres/postgres-verification.test.ts`) should gracefully skip or connect to the configured staging instance via `PG_DATABASE_URL`.
   - The default test suite must continue running against SQLite in under 15 seconds with zero external database dependencies.
2. **PostgreSQL Sequence State after Direct ID Inserts**:
   - Whenever records are seeded or migrated with explicit `id` values (e.g. `products` 1..15), `SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))` must be executed to prevent subsequent auto-increment insert conflicts.
3. **Transaction Isolation & Concurrency**:
   - SQLite uses file-level write locking with WAL mode, whereas PostgreSQL uses row-level locking (`FOR UPDATE` / conditional update rows). Both support atomic conditional decrements (`WHERE id = $1 AND stockQuantity >= $qty`), but PostgreSQL allows true multi-connection parallel transaction processing.

---

## 5. Conclusion

- The codebase is exceptionally well-prepared for Phase 2: all dependencies (`pg`, `better-sqlite3`, `drizzle-orm`, `drizzle-kit`) are installed, full schema parity is defined in `schema.pg.ts`, docker-compose staging configuration is healthy, and 254 test cases currently pass.
- The primary tasks required to complete Phase 2 are:
  1. Updating `server/db/index.ts` to dynamically instantiate `pg.Pool` + `drizzle-orm/node-postgres` when `DATABASE_URL` is a Postgres URI, while maintaining `better-sqlite3` fallback for SQLite.
  2. Unifying schema exports so query builders receive the appropriate dialect definitions.
  3. Converting synchronous route transactions and query calls (`.all()`, `.get()`, `.run()`) into portable asynchronous Drizzle calls with `.returning()`.
  4. Updating `server/index.ts` bootstrap initialization to execute driver-appropriate migrations and sync PostgreSQL sequences.
  5. Adding PostgreSQL migration scripts to `package.json`.

---

## 6. Verification Method

To independently verify the database survey and validate implementations:

1. **Verify Test Suite Baseline**:
   ```bash
   npm test
   ```
   *Expected Result*: 24 test files passed, 254+ tests passed (100% pass rate).

2. **Verify Production Bundle Build**:
   ```bash
   npm run build
   ```
   *Expected Result*: Vite builds client assets and esbuild bundles `dist/server.cjs` with 0 errors.

3. **Verify PostgreSQL DDL Generation**:
   ```bash
   npx drizzle-kit generate --config=drizzle.pg.config.ts
   ```
   *Expected Result*: Generates valid SQL DDL statements for all 10 tables and constraints in `drizzle/pg/`.

4. **Verify PostgreSQL Live Concurrency**:
   ```bash
   npx vitest run tests/postgres/postgres-verification.test.ts
   ```
   *Expected Result*: Connects to PostgreSQL, verifies 10 tables, atomic decrements under 50 parallel requests, and idempotent restock.
