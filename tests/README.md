# tests/ — index

> **Status:** living · **Updated:** 2026-10-13 · **Scope:** what each test tier proves, how to run it, and how the counts were measured. Counts below were measured on 2026-10-13 with the method in this file; they are the only place test counts are written down (`docs/documentation-standard.md` §5).

## Totals (2026-10-13)

79 test files, 635 tests, all passing; 0 failed, 0 pending. Measured with the Vitest JSON reporter (method below).

| Tier | Location | Files | Tests | Isolation |
|---|---|---:|---:|---|
| api | `tests/api/` | 36 | 327 | in-process supertest on `server/app.ts`, scratch DB |
| unit | `tests/unit/` | 40 | 294 | pure functions and app-level asserts |
| concurrency | `tests/concurrency/` | 2 | 11 | parallel requests against the same stock |
| bale worker | `bale-worker/src/` | 1 | 3 | `worker.idempotency.test.ts`, run by the same Vitest config; the Cloudflare variant is unshipped |

"Suite" in this file means one test file. The same run reports 213 `describe` blocks.

Playwright specs in `e2e/` are **not** included. The gate is `npm run verify` (typecheck → Vitest → build → SEC-01 → SEC-03).

### How to count

```bash
npx vitest run --reporter=json --outputFile="$(mktemp)"
```

Read `numTotalTests`, `numPassedTests`, `numFailedTests`, `numPendingTests` from the JSON. Group `testResults` by path to get the per-tier figures above. The run uses `:memory:` SQLite (`vitest.config.ts`) and does not touch `data/janebi.db`.

## What each tier proves

- **api**: route contracts for auth and JWT cookies, cart, orders, payment, coupons, admin, users, wishlist, contact, sitemap, cookie and cache headers, and admin hardening. Notable files: `api/adversarial_challenge.test.ts` (boundary attacks: malformed input, cross-user access, price and stock tampering), `api/round8-qa.test.ts` (upload guards, `coupons-active`, blog), `api/wave3-fixes.test.ts` (settings, rating recompute, cart stock guard), `api/launch-readiness.test.ts` (coupon expiry, order-id format, VIP refund, health payload), `api/e2e_journey.test.ts` and `api/e2e_all_pages_api.test.ts` (user and admin journeys, every route answers), `api/frontend-backend-parity.test.ts` (front-end and back-end contract parity).
- **unit**: invariants that must not regress: stock and VIP arithmetic, coupon discounts, LIKE escaping, Persian normalisation, migration journal, OTP gates, payment failover, accessibility and CSP header shape. Phase suites: `unit/phase1-foundation.test.ts`, `unit/phase3-transactions.test.ts`, `unit/phase4-resilience.test.ts`.
- **concurrency**: `concurrency/adversarial-stress.test.ts` and the inventory race suite: no negative stock, no double decrement under parallel checkout.

## Rules learned the hard way

- **Persistent dev DB + suites = residue.** Suites that insert fixtures repopulate `data/janebi.db` on every gate run. Purge residue **last** with `scripts/data/purge-test-users.cjs`, then re-read counts and run `PRAGMA integrity_check`.
- **Vitest parallel flake is not a failure.** If one suite goes red in a full run but passes alone with the file untouched, it is contention. Rerun that file; do not "fix" it.
- **One authoritative gate is enough.** `npm run verify > log; echo EXIT=$?`. Never trust a piped tail's exit status.
- **A negative fixture that logs an error is expected.** For example, `SQLite migration FAILED — file: 0007_corrupt.sql` is the migration-journal suite proving that a corrupt migration aborts. It is not a break.
- **SQLite is the only supported database.** The PostgreSQL suite and its schema checks were removed with the PostgreSQL code.
