# tests/ — index

**Test counts are refreshed on the next full run (PostgreSQL suite removed).**
(counted 2026-10-10 on the working tree; all 71 are now tracked — the 2 that were uncommitted at count time, `infra-exposure-guards` and `products-brand-filter`, landed in `cdd2e45` and `6b18894`).
Here a *suite* = one test file; the same run reports 176 `describe` blocks.
Count method (reproducible, runs against `:memory:` SQLite per `vitest.config.ts`; touches no real DB):

```bash
npx vitest run --reporter=json --outputFile=/tmp/vitest-count.json
# numTotalTests / numPassedTests / numPendingTests / testResults.length
```

Per tier: api 35 files / 320 tests · unit 32 / 203 · concurrency 2 / 11 ·
`bale-worker/src/worker.idempotency.test.ts` 1 / 3 (picked up by the same Vitest run, outside `tests/`).
Playwright specs in `e2e/` are **not** included. Run everything through the gate: `npm run verify`
(typecheck → vitest → build → SEC-01 static-exposure → SEC-03 CSP/security.txt).
Browser flows live in `e2e/`, not here.

| Tier | Dir | Isolation | What it proves |
|------|-----|-----------|----------------|
| api | `tests/api` (35) | in-process supertest on `app.ts`, scratch DB | Route contracts: auth/JWT, cart, orders, payment, coupons, admin, users, wishlist, contact, sitemap, cookies/cache, admin hardening |
| unit | `tests/unit` (32) | pure functions + a few app-level asserts | Invariants that must never regress: stock/VIP math, coupon discounts, LIKE escaping, Persian normalization, migration journal, OTP gates, payment failover, a11y/CSP header shape |
| concurrency | `tests/concurrency` (2) | parallel requests | Inventory race + adversarial stress (never a negative stock, no double decrement) |

## Wave/phase-named suites (kept — they are regression anchors, not history)
| Suite | Covers |
|-------|--------|
| `api/adversarial_challenge.test.ts` (23) | Empirical boundary attacks: malformed input, cross-user access, price/stock tampering |
| `api/round8-qa.test.ts` (7) | Upload guards, `coupons-active`, blog |
| `api/wave3-fixes.test.ts` (6) | Settings persistence, rating recompute, cart stock guard |
| `api/launch-readiness.test.ts` (7) | Coupon expiry, order-id format, VIP refund, health payload |
| `api/e2e_journey.test.ts` (7), `api/e2e_all_pages_api.test.ts` (4), `api/frontend-backend-parity.test.ts` (3) | Full user+admin journey, every route answers, FE/BE contract parity |
| `unit/phase1..phase4` (21) | Foundation, order+stock+payment transactions, resilience |
| `concurrency/adversarial-stress.test.ts` (9) | Load/race behaviour under parallel checkout |

## Rules learned the hard way
- **Persistent dev DB + suites = residue.** Suites that insert fixtures repopulate `data/janebi.db` on every gate run. Purge residue **last**, then re-read counts and run `PRAGMA integrity_check` (`scripts/data/purge-test-users.cjs`).
- **Vitest parallel flake is not a failure.** If one suite goes red in a full run but passes alone in isolation with the file untouched, it is contention — rerun that file, don't "fix" it.
- **One authoritative gate is enough.** `npm run verify > log; echo EXIT=$?` — never trust a piped tail's exit status.
- **A negative fixture that logs an error is expected.** e.g. `SQLite migration FAILED — file: 0007_corrupt.sql` is the migration-journal suite proving a corrupt migration aborts; it is not a break.
- **SQLite is the only supported database.** The PostgreSQL suite and its schema checks were removed with the PostgreSQL code.
