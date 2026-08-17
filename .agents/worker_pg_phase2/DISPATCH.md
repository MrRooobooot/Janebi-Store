# Task Assignment: Janebi-Store Phase 2 Implementation (M1, M2, M3)

You are worker_pg_phase2.
Your working directory is: /Users/aidin/antigravity/Janebi-Store/.agents/worker_pg_phase2
Project root: /Users/aidin/antigravity/Janebi-Store
Authoritative Request: /Users/aidin/antigravity/Janebi-Store/.agents/ORIGINAL_REQUEST.md
Architecture Reference: /Users/aidin/antigravity/Janebi-Store/PROJECT.md
Survey Reports:
- `/Users/aidin/antigravity/Janebi-Store/.agents/explorer_pg_survey_1/handoff.md`
- `/Users/aidin/antigravity/Janebi-Store/.agents/explorer_pg_survey_2/handoff.md`
- `/Users/aidin/antigravity/Janebi-Store/.agents/explorer_pg_survey_3/handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Phase 2 PostgreSQL Migration & Dual-Dialect runtime for Janebi-Store across Database Connection, Schema/Migrations, Server Bootstrap, and High-Concurrency Route Transactions.

## Owned Files & Scope
1. **`server/db/index.ts`**:
   - Implement dynamic dialect switching: when `DATABASE_URL` starts with `postgres://` or `postgresql://`, instantiate `pg.Pool` (max 20, idleTimeout 30s) + `drizzle-orm/node-postgres` with `server/db/schema.pg.ts`.
   - Otherwise, instantiate `better-sqlite3` with WAL mode and `server/db/schema.ts`.
   - Export `db`, `pool`, `sqlite`, `isPostgres`, and `closeDb`.
2. **`server/db/schema.ts`**:
   - Ensure dynamic schema re-exports or universal table definitions so all routes importing `{ products, orders, users, ... } from '../db/schema.js'` work seamlessly under both dialects.
3. **`server/db/schema.pg.ts`**:
   - Verify and ensure complete parity of all 10 tables, types (`serial`, `text`, `integer`, `boolean`), foreign keys, and relations.
4. **`server/index.ts`**:
   - Modernize `ensureDatabaseInitialized()` to be driver-aware:
     - For PostgreSQL: apply migration or table initialization via pool query, and sync Postgres auto-increment sequences via `SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products))` if needed.
     - For SQLite: maintain SQLite migration / table setup.
5. **`server/routes/orders.ts`, `server/routes/payment.ts`, `server/routes/users.ts`, `server/routes/admin.ts`**:
   - Convert all synchronous transaction blocks `db.transaction((tx) => ...)` to async `await db.transaction(async (tx) => ...)`.
   - Replace driver-specific `.all()`, `.get()`, `.run()` with standard async Drizzle calls (`await tx.select()`, `await tx.insert()`, etc.).
   - Implement atomic stock decrement with `RETURNING` and length verification (`if (updated.length === 0) throw new Error(...)`).
6. **`package.json`**:
   - Add PostgreSQL migration & studio scripts: `"db:generate:pg"`, `"db:push:pg"`, `"db:studio:pg"`.
7. **`docker-compose.yml`, `.env`, `.env.example`, `server/env.ts`**:
   - Ensure environment validation and container configuration cleanly support PostgreSQL staging.

## Verification Requirements
1. Run `npm test` and ensure 100% tests pass (all 254+ tests).
2. Run `npm run build` and ensure both Vite and esbuild compile cleanly with zero errors.
3. If PostgreSQL is available or via pg tests (`tests/postgres/postgres-verification.test.ts`), verify PostgreSQL live connection and concurrency behavior.
4. Write your comprehensive handoff report to `/Users/aidin/antigravity/Janebi-Store/.agents/worker_pg_phase2/handoff.md`.
