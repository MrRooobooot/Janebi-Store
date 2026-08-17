# Master Plan: Janebi-Store Phase 2 (PostgreSQL Migration & Staging)

## Objective
Execute all Phase 2 requirements from `ORIGINAL_REQUEST.md`:
1. R1: PostgreSQL Driver & Dual-Dialect Configuration (`server/db/`, `server/env.ts`, `docker-compose.yml`, `.env`).
2. R2: PostgreSQL Schema & Migration Verification (`server/db/schema.pg.ts`, `drizzle/pg/`, `drizzle.pg.config.ts`).
3. R3: High-Concurrency Transaction & Stock Lock Verification (atomic decrement, rollback integrity under race conditions).
4. R4: Regression Safety & Test Suite Pass (100% pass rate on `npm test`, clean build on `npm run build`).

## Phase 0: Survey & Current State Assessment (Parallel Explorers)
- **Explorer 1 (`explorer_pg_survey_1`)**: Database layer survey (`server/db/`, `server/env.ts`, dual-dialect connection support, SQLite vs Postgres drivers, pooling, and configuration).
- **Explorer 2 (`explorer_pg_survey_2`)**: Schema & Migrations survey (`server/db/schema.ts`, `server/db/schema.pg.ts`, `drizzle/pg/`, `drizzle.pg.config.ts`, DDL generation, column types, FKs).
- **Explorer 3 (`explorer_pg_survey_3`)**: Concurrency, Transactions & Test Suite survey (Transaction rollback mechanisms, atomic stock decrement SQL/Drizzle queries, Vitest suite compatibility, build pipeline).

## Phase 1: Synthesis & Decomposition (PROJECT.md & Work Packages)
- Synthesize explorer findings.
- Formulate milestone work packages:
  - M1: Dual-Dialect DB Connection & Environment Config (`server/db/`, `server/env.ts`, `.env`, `docker-compose.yml`).
  - M2: PostgreSQL Schema, Relations & Drizzle Migration Generator (`server/db/schema.pg.ts`, `drizzle.pg.config.ts`, `drizzle/pg/`).
  - M3: Concurrency Transaction Hardening & Dual-Dialect Atomic Stock Locks (`server/routes/orders.ts`, transaction isolation, rollback verification).
  - M4: Integration Test Suite Verification & Dual-Dialect Concurrency Testing (`npm test`, PostgreSQL mock/in-memory or integration tests, regression checks).

## Phase 2: Execution & Implementation
- Dispatch workers for each milestone with strict file ownership.
- Verify intermediate builds and tests.

## Phase 3: Gate Checks & Audits
- Independent Reviewers (`teamwork_preview_reviewer` x2).
- Empirical Challengers (`teamwork_preview_challenger` x2 - stress/concurrency testing).
- Forensic Integrity Auditor (`teamwork_preview_auditor` - binary veto).

## Phase 4: Final Acceptance Verification & Reporting
- Full automated test suite verification (`npm test` 100% pass).
- Production build verification (`npm run build`).
- Final handoff and completion reporting to parent.
