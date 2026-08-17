# Context: Janebi-Store Phase 2 (PostgreSQL Migration & Staging)

## Project Overview
Janebi-Store (Janebi Arena) is a modern Iranian e-commerce platform built with Node.js/Express, TypeScript, Drizzle ORM, React 19, and TailwindCSS.
Phase 1 established SQLite with WAL mode, extensive integration tests, and UI fixes.
Phase 2 objective is: PostgreSQL Migration & Staging, Dual-Dialect runtime capability, migration validation, high-concurrency stock lock verification, and 100% test suite regression safety.

## Key Requirements (from ORIGINAL_REQUEST.md)
1. **R1. PostgreSQL Driver & Dual-Dialect Configuration**:
   - `server/db/` connection layer dynamically uses `pg` Pool when `DATABASE_URL` is a Postgres URI, and `better-sqlite3` when offline/testing with SQLite.
   - `server/env.ts`, `docker-compose.yml`, `.env` support PostgreSQL connection params.
2. **R2. PostgreSQL Schema & Migration Verification**:
   - PostgreSQL schema in `server/db/schema.pg.ts` (all tables, types: serial, text, integer, boolean, foreign keys, relations).
   - Generate and validate migration SQL in `drizzle/pg/` using `drizzle.pg.config.ts`.
   - Clean migration application.
3. **R3. High-Concurrency Transaction & Stock Lock Verification**:
   - High-concurrency order placement and stock deduction transactions against PostgreSQL (and SQLite dual-mode).
   - Atomic stock decrement (preventing negative inventory under simultaneous race conditions).
   - Rollback integrity when an item in a multi-item order is out of stock or when an error occurs.
4. **R4. Regression Safety & Test Suite Pass**:
   - 100% pass rate on `npm test` (all unit/integration tests).
   - Clean build on `npm run build` (Vite client + esbuild backend bundle).
