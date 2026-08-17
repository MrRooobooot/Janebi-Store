# Original User Request

## 2026-08-15T18:59:04Z

Execute Phase 2 (PostgreSQL Migration & Staging) of the Janebi-Store production roadmap. Establish PostgreSQL staging capability and verified concurrent transaction safety while preserving SQLite test suite execution.

Working directory: /Users/aidin/antigravity/Janebi-Store
Integrity mode: development

## Requirements

### R1. PostgreSQL Driver & Dual-Dialect Configuration
- Configure the database layer in `server/db/` to connect to PostgreSQL (via `pg` pool) when `DATABASE_URL` is a Postgres URI, and seamlessly use `better-sqlite3` when running offline unit tests or with SQLite file paths.
- Ensure environment configuration (`server/env.ts`, `docker-compose.yml`, `.env`) supports PostgreSQL connection parameters.

### R2. PostgreSQL Schema & Migration Verification
- Finalize and verify the PostgreSQL Drizzle ORM schema (`server/db/schema.pg.ts`), ensuring proper types (`serial`, `text`, `integer`, `boolean`, foreign keys, and relations).
- Generate and validate PostgreSQL migration SQL in `drizzle/pg/` using `drizzle.pg.config.ts`.
- Ensure migrations apply cleanly without schema discrepancies.

### R3. High-Concurrency Transaction & Stock Lock Verification
- Implement and verify high-concurrency order placement and stock deduction transactions against PostgreSQL.
- Ensure atomic stock decrement (preventing negative inventory under simultaneous race conditions for the last stock unit).
- Verify rollback integrity when an item in a multi-item order is out of stock or when an unhandled error occurs.

### R4. Regression Safety & Test Suite Pass
- Maintain 100% pass rate across the full automated test suite (`npm test`).
- Ensure `npm run build` compiles both the Vite client bundle and the esbuild backend bundle with zero errors.

## Acceptance Criteria

### Database & Driver Configuration
- [ ] Database connection module dynamically handles PostgreSQL and SQLite without breaking existing test runners.
- [ ] Drizzle migrations generate valid PostgreSQL DDL statements for all 10 tables and foreign key constraints.

### Concurrency & Data Integrity
- [ ] Multi-request race conditions for the last remaining stock unit succeed for only 1 request and safely fail for the remainder.
- [ ] Failed orders or cancelled payments consistently rollback database state.

### Build & Test Suite
- [ ] All automated tests (`npm test`) pass with a 100% pass rate (254+ tests).
- [ ] Production build (`npm run build`) succeeds with zero errors.
