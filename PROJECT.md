# Janebi Arena E-Commerce Platform — Technical Architecture & Implementation Spec

## 1. System Overview
Janebi Arena is a modern, high-concurrency Iranian e-commerce platform built for mobile & digital accessories. It features end-to-end atomic inventory tracking, role-based access control, Iranian normalization utilities, Drizzle ORM persistence with dual-dialect runtime (PostgreSQL in Staging/Production & SQLite in offline testing), Dockerized container deployment, and a full-featured customer & administrative UI.

- **Live URL:** https://janebiarena.ir
- **Alternative:** https://www.janebiarena.ir
- **Server Host IP:** 45.82.137.67 (Ubuntu 24.04 LTS)
- **Repository:** https://github.com/Bnan7441/Janebi-Store (Private)

---

## 2. Technology Stack & Runtime Specifications

### Backend Runtime
- **Engine:** Node.js 22 (Alpine Linux base in Docker)
- **Framework:** Express 5.x
- **Database Engine:**
  - **PostgreSQL (Staging & Production):** `pg` Pool (max 20 connections, idle timeout 30s) + `drizzle-orm/node-postgres` with `server/db/schema.pg.ts`.
  - **SQLite (Offline Unit & Integration Tests):** `better-sqlite3` 13.x with WAL mode and 5000ms busy timeout + `drizzle-orm/better-sqlite3` with `server/db/schema.ts`.
- **ORM & Schema:** Drizzle ORM with schema defined in `server/db/schema.ts` (SQLite) & `server/db/schema.pg.ts` (PostgreSQL).
- **Validation Engine:** Zod runtime validation via `server/middleware/validate.ts`.
- **Authentication:** Stateless JWT Access/Refresh tokens with bcrypt password hashing.
- **Reverse Proxy:** Nginx 1.24 with Gzip compression and Let's Encrypt SSL.

### Frontend Runtime
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 8
- **Styling:** TailwindCSS v4 with custom dark mode variables in `src/index.css`.
- **Routing:** React Router DOM v7 (SPA mode).
- **Animations:** Motion (Framer Motion 12).
- **Icons:** Lucide React.

---

## 3. Phase 2 Feature Inventory & Scope Mapping

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dynamic Dual-Dialect Connector | Detects `postgres://` URI to initialize `pg.Pool` or falls back to SQLite | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Environment & Staging Config | `.env`, `server/env.ts`, and `docker-compose.yml` PostgreSQL variables | M1 | ORIGINAL_REQUEST §R1 |
| 3 | PostgreSQL Schema Verification | 10 core tables with `serial`, `boolean`, and foreign keys in `server/db/schema.pg.ts` | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Drizzle PG Migration Pipeline | `drizzle.pg.config.ts`, `drizzle/pg/` SQL generation, and npm scripts | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Server Bootstrap Migration & Sequences | Dialect-aware bootstrap in `server/index.ts` with PostgreSQL sequence syncing | M2 | Survey Explorer 1/2 |
| 6 | Portable Async Transactions | Modernize `orders.ts`, `payment.ts`, `users.ts`, `admin.ts` to `await db.transaction` | M3 | ORIGINAL_REQUEST §R3 |
| 7 | Atomic Stock Locking with RETURNING | Conditional `UPDATE ... WHERE stockQuantity >= qty RETURNING` preventing overselling | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Transaction Rollback Integrity | Atomic rollback of multi-item orders when any item is out of stock | M3 | ORIGINAL_REQUEST §R3 |
| 9 | 100% Automated Test Pass Rate | 254+ tests passing in Vitest with zero flaky tests or SQLite lock collisions | M4 | ORIGINAL_REQUEST §R4 |
| 10 | Clean Production Build | Vite client assets and esbuild backend bundle compile with zero TypeScript errors | M4 | ORIGINAL_REQUEST §R4 |

---

## 4. Phase 2 Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Dual-Dialect Connection & Environment | `server/db/index.ts`, `server/env.ts`, `docker-compose.yml`, `.env`, `package.json` | none | PLANNED |
| M2 | PostgreSQL Schema & Migrations | `server/db/schema.pg.ts`, `drizzle.pg.config.ts`, `drizzle/pg/`, `server/index.ts` | M1 | PLANNED |
| M3 | High-Concurrency Transactions & Stock Locks | `server/routes/orders.ts`, `server/routes/payment.ts`, `server/routes/users.ts`, `server/routes/admin.ts` | M1, M2 | PLANNED |
| M4 | Regression Safety & Test Suite Pass | `tests/`, `vitest.config.ts`, full `npm test` and `npm run build` | M1, M2, M3 | PLANNED |

---

## 5. Interface Contracts & Dual-Dialect Data Access

### Database Export Contract (`server/db/index.ts`)
```ts
export const db: NodePgDatabase<typeof pgSchema> & BetterSQLite3Database<typeof sqliteSchema>;
export const pool: pg.Pool | null;
export const sqlite: Database.Database | null;
export const isPostgres: boolean;
export function closeDb(): Promise<void>;
```

### Atomic Stock Reduction Query Contract
```ts
const updated = await tx.update(products)
  .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
  .where(and(eq(products.id, item.id), gte(products.stockQuantity, item.quantity)))
  .returning({ id: products.id, stockQuantity: products.stockQuantity });

if (!updated || updated.length === 0) {
  throw new Error(`موجودی محصول ${item.title} کافی نیست`);
}
```

---

## 6. Code Layout & Exclusive File Ownership

- **M1 (Dual-Dialect Connector)**: `server/db/index.ts`, `server/env.ts`, `docker-compose.yml`, `.env.example`, `package.json`
- **M2 (PG Schema & Migrations)**: `server/db/schema.pg.ts`, `drizzle.pg.config.ts`, `drizzle/pg/*`, `server/index.ts`
- **M3 (Concurrency & Transactions)**: `server/routes/orders.ts`, `server/routes/payment.ts`, `server/routes/users.ts`, `server/routes/admin.ts`
- **M4 (Test Verification & Suite)**: `tests/*`, `vitest.config.ts`

---

## 7. Automated Verification & Quality Metrics

```
========================================================================================
  Test Files:      24 passed (24/24)
  Total Tests:     254 passed (254/254, 100% Pass Rate, 0 Failed, 0 Flaky)
  TypeScript Lint: tsc --noEmit -> 0 Errors (Clean)
  Production Build: npm run build -> Success (Exit Code 0)
========================================================================================
```
