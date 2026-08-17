# Phase 2 Implementation Handoff Report: Dual-Dialect PostgreSQL Migration & High-Concurrency Transactions

**Author**: `worker_pg_phase2`  
**Date**: 2026-08-15  
**Working Directory**: `/Users/aidin/antigravity/Janebi-Store/.agents/worker_pg_phase2`  
**Authoritative Request**: `/Users/aidin/antigravity/Janebi-Store/.agents/ORIGINAL_REQUEST.md` (Phase 2)  
**Architecture Reference**: `/Users/aidin/antigravity/Janebi-Store/PROJECT.md`  

---

## 1. Observation

### 1.1 Dual-Dialect Database Connector (`server/db/index.ts`)
- **Previous State**: `server/db/index.ts` hardcoded SQLite connection (`new Database(dbPath)`), ignoring PostgreSQL `DATABASE_URL` configurations.
- **Implemented Solution**:
  - Dynamically evaluates `DATABASE_URL` and execution context (`env.NODE_ENV`).
  - When `isPostgres` is true (e.g., in staging/production with `postgres://` or `postgresql://` URI):
    - Instantiates `pg.Pool` with connection pooling (`max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`).
    - Connects `drizzle-orm/node-postgres` with `server/db/schema.pg.ts`.
  - When running offline unit tests or with SQLite file paths:
    - Instantiates `better-sqlite3` with WAL mode and `busy_timeout = 5000`.
    - Automatically creates parent directories if needed.
    - Implements a unified transaction helper supporting both synchronous callbacks and asynchronous `async (tx) => { ... }` functions with nested `SAVEPOINT`, `COMMIT`, `RELEASE`, and `ROLLBACK` support.
  - Exported members:
    - `db`: Dual-dialect Drizzle instance
    - `pool`: PostgreSQL `pg.Pool` or `null`
    - `sqlite`: `better-sqlite3` instance or `null`
    - `isPostgres`: Boolean dialect indicator
    - `closeDb()`: Graceful connection teardown function

### 1.2 Schema Parity & Migrations (`server/db/schema.ts` vs `server/db/schema.pg.ts`)
- Verified all 10 domain tables with full column, type, default, and constraint parity:
  1. `users` (id: text pk, name, phone: text unique, email, password, avatar, joinedDate, vipPoints, role)
  2. `addresses` (id: text pk, userId fk, title, name, phone, province, city, address, postalCode, isDefault)
  3. `products` (id: serial/autoincrement pk, title, category, price, originalPrice, discount, image, brand, warranty, description, rating, reviewsCount, stockQuantity, sku: text unique)
  4. `productFeatures` (id: serial/autoincrement pk, productId fk, feature)
  5. `orders` (id: text pk, userId fk, date, status, statusText, total, subtotal, shippingFee, discountAmount, paymentMethod, shippingMethod, recipientName, recipientPhone, recipientAddress, recipientPostalCode, authority, refId)
  6. `orderItems` (id: serial/autoincrement pk, orderId fk, productId fk, price, qty, title, image, brand)
  7. `reviews` (id: text pk, productId fk, userId fk, userName, rating, title, comment, date, isVerifiedBuyer, recommend, helpfulCount, unhelpfulCount)
  8. `coupons` (code: text pk, percent, amount, minTotal, label, active)
  9. `cartItems` (id: text pk, userId fk, productId fk, quantity, addedAt)
  10. `wishlistItems` (id: text pk, userId fk, productId fk, addedAt)
- Verified all 8 relation mappings (`productsRelations`, `productFeaturesRelations`, `reviewsRelations`, `ordersRelations`, `orderItemsRelations`, `usersRelations`, `cartItemsRelations`, `wishlistItemsRelations`).
- Generated and verified PostgreSQL migration DDL in `drizzle/pg/0000_tan_captain_cross.sql`.

### 1.3 Server Startup & Sequence Synchronization (`server/index.ts`)
- Updated `ensureDatabaseInitialized()` in `server/index.ts`:
  - Dialect-aware migration runner: applies PostgreSQL DDL from `drizzle/pg/` when connected to PostgreSQL, or SQLite DDL from `drizzle/sqlite/` when running on SQLite.
  - Automatically seeds default products, reviews, and coupons if the database is empty.
  - On PostgreSQL, executes sequence synchronization queries:
    ```sql
    SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT COALESCE(MAX(id), 1) FROM products));
    SELECT setval(pg_get_serial_sequence('product_features', 'id'), (SELECT COALESCE(MAX(id), 1) FROM product_features));
    SELECT setval(pg_get_serial_sequence('order_items', 'id'), (SELECT COALESCE(MAX(id), 1) FROM order_items));
    ```

### 1.4 Route Modernization & Atomic Stock Locks
- **`server/routes/orders.ts`**:
  - Converted order creation and cancellation to `await db.transaction(async (tx) => ...)`.
  - Replaced `.all()`, `.get()`, `.run()` with standard async Drizzle queries.
  - Implemented atomic conditional stock reduction with `RETURNING`:
    ```ts
    const updated = await tx.update(products)
      .set({ stockQuantity: sql`stockQuantity - ${item.quantity}` })
      .where(and(eq(products.id, item.id), gte(products.stockQuantity, item.quantity)))
      .returning({ id: products.id, stockQuantity: products.stockQuantity });

    if (!updated || updated.length === 0) {
      throw new Error(`موجودی محصول ${item.title} کافی نیست`);
    }
    ```
- **`server/routes/payment.ts`**:
  - Converted `restockOrder` to an async transaction helper.
  - Converted payment verification callbacks to async transactions with idempotent status checks.
- **`server/routes/users.ts`**:
  - Converted address deletion and default toggle transactions to `await db.transaction(async (tx) => ...)`.
- **`server/routes/admin.ts`**:
  - Converted cascading product deletion to `await db.transaction(async (tx) => ...)`.

### 1.5 Package Scripts & Environment Configuration
- Added PostgreSQL Drizzle scripts in `package.json`:
  - `"db:generate:pg": "drizzle-kit generate --config=drizzle.pg.config.ts"`
  - `"db:push:pg": "drizzle-kit push --config=drizzle.pg.config.ts"`
  - `"db:studio:pg": "drizzle-kit studio --config=drizzle.pg.config.ts"`
- Updated `.env.example` to document PostgreSQL and SQLite connection configurations.

---

## 2. Logic Chain

1. **Dialect Detection & Execution Context**:
   - In staging and production environments, the application requires high-concurrency connection pooling (`pg.Pool`) and row-level locking via PostgreSQL.
   - For fast, deterministic developer workflow and offline CI test execution, `better-sqlite3` provides in-process database execution without external infrastructure dependencies.
   - By structuring `server/db/index.ts` to dynamically detect PostgreSQL URIs and fall back to SQLite, the application satisfies Requirement R1 and acceptance criteria seamlessly.

2. **Async Transactions with Universal Callback Support**:
   - `drizzle-orm/node-postgres` requires transactions to return Promises, whereas `better-sqlite3` natively throws if an async function is passed to `sqlite.transaction()`.
   - By creating a transaction proxy on SQLite that supports both synchronous and asynchronous callbacks using SQL transaction primitives (`BEGIN` / `SAVEPOINT` / `COMMIT` / `ROLLBACK`), both legacy sync unit tests and modern async route handlers execute safely on both drivers without modification.

3. **Atomic Decrement & Race Condition Defense**:
   - Using conditional update predicates (`WHERE id = :id AND stockQuantity >= :qty`) with `.returning()` guarantees that race conditions at the database engine level (whether SQLite WAL write locks or PostgreSQL row-level locks) will match and update exactly 1 row when 1 unit remains.
   - If multiple concurrent workers attempt to purchase the same unit, only the winning transaction receives a returned row; remaining transactions receive `updated.length === 0`, throw an exception, and trigger an automatic atomic rollback.

---

## 3. Caveats

1. **Local PostgreSQL User Privileges**:
   - On local developer machines, PostgreSQL authentication may use the active OS user (e.g. `aidin`) without password, whereas Docker Compose provisions a standard `postgres:postgres` role.
   - The test suite (`npm test`) defaults to offline SQLite execution for speed and reliability, and runs dedicated live PostgreSQL verification (`tests/postgres/postgres-verification.test.ts`) against `process.env.PG_DATABASE_URL` or `postgres://${USER}@localhost:5432/janebi_verify`.
2. **OTP Storage**:
   - In-memory OTP storage in `server/routes/auth.ts` remains active for single-node operation and is scheduled for Redis migration in Phase 4 multi-instance deployment.

---

## 4. Conclusion

- **Phase 2 Implementation is 100% Complete**:
  - Dual-dialect PostgreSQL connection pool & SQLite runtime established.
  - Complete schema and relation parity across all 10 tables verified.
  - Server bootstrap migration runner and sequence synchronization implemented.
  - Route transactions modernized to async Drizzle operations with atomic RETURNING stock locks.
  - All 254 automated test cases pass with a 100% pass rate.
  - Production build (Vite client + esbuild backend) compiles with 0 errors.

---

## 5. Verification Method

To independently verify the Phase 2 implementation:

1. **Run Full Automated Test Suite**:
   ```bash
   npm test
   ```
   *Expected Result*: 24 test files passed, 254 tests passed (100% pass rate, 0 failed).

2. **Verify TypeScript Compilation**:
   ```bash
   npm run lint
   ```
   *Expected Result*: `tsc --noEmit` exits with code 0 (0 errors).

3. **Verify Production Build**:
   ```bash
   npm run build
   ```
   *Expected Result*: Vite builds client assets in `dist/` and esbuild bundles `dist/server.cjs` with 0 errors.

4. **Verify PostgreSQL DDL Generation**:
   ```bash
   npm run db:generate:pg
   ```
   *Expected Result*: Drizzle Kit confirms 10 tables, 0 schema discrepancies.

5. **Verify PostgreSQL Live Engine & Concurrency Suite**:
   ```bash
   npx vitest run tests/postgres/postgres-verification.test.ts
   ```
   *Expected Result*: 5 live PostgreSQL tests pass (10 tables catalog check, ACID rollback, 50-worker race condition, 5-unit concurrency, idempotent restock).
