# Backend: Migration Journal (audit P2 follow-up — silent partial application)

**Commit**: `f8b953f` — `fix(db): journaled sqlite/pg migrations — per-file transaction, loud failure, no silent swallowing (audit P2 follow-up)`
**Date**: 2026-09-01 · **Team**: TEAM-BACKEND · **Pushed**: yes (main)

## What changed
- `server/db/index.ts` — root-cause fix for the silent partial-migration bug (empty catch at old lines 95-99):
  - New `__drizzle_migrations` journal (sha256 per `.sql` file) in both dialects:
    - SQLite: `id INTEGER PRIMARY KEY, hash TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL`
    - PG: `id serial PRIMARY KEY, hash TEXT NOT NULL UNIQUE, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Apply phase: only un-journaled files run; each file inside a single transaction (`BEGIN IMMEDIATE`/`COMMIT` sqlite; `BEGIN`/`COMMIT` on a dedicated pg client), journal insert **inside the same transaction** → all-or-nothing per file.
  - Failure: logs file name + statement index + full error + statement text to stderr, rolls back, **throws** (sqlite: module init aborts the process; pg: rejects `migrationsReady`, surfaced by `dbReady()` at server bootstrap). No swallowing, later files never attempted.
  - Legacy backfill: DB with business tables but empty journal (current prod `data/janebi.db`) gets best-effort per-file backfill — files whose statements all succeed-or-'already exists' are journaled; a genuinely failing statement stays un-journaled and retries loudly in the apply phase.
  - 'already exists'-class errors tolerated only for legacy replay, never to mask a journal-tracked re-run.
- `tests/unit/migration-journal.test.ts` — new, 3 tests:
  - (a) fresh `:memory:` DB applies 0000–0006, journal hashes match file hashes exactly;
  - (b) re-init on journaled file DB: identical journal, zero migration console.error/warn, 0005 indexes present (`idx_wishlist_items_user_id`, `idx_product_features_product_id`, `idx_contact_messages_status`);
  - (c) corrupt file (`0007_corrupt.sql` → index on missing table): init rejects with the filename, stderr contains file name + failing statement.

## Gate evidence
- `npm run verify`: **PASS** — strict tsc + **37 suites / 300 tests** + vite build + esbuild server. Log: `/tmp/verify-mig.log` (`✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)`).
- Post-build artifact audit: `grep -c jsxDEV dist/assets/index-*.js` → **0**; `grep -c "/Users/" dist/assets/index-*.js` → **0**.

## Deviations
- None functional. One note: SQLite test table names are snake_case raw names (`order_items`, not `orderItems` Drizzle aliases) — tests assert raw names.
- Deployment not run (orchestrator handles `deploy.sh` per instructions).
