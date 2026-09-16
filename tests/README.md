# tests/ — index

54 suites, 425 assertions. Run everything through the gate: `npm run verify`
(typecheck → vitest → build → SEC-01 static-exposure → SEC-03 CSP/security.txt).
Browser flows live in `e2e/`, not here.

| Tier | Dir | Isolation | What it proves |
|------|-----|-----------|----------------|
| api | `tests/api` (27) | in-process supertest on `app.ts`, scratch DB | Route contracts: auth/JWT, cart, orders, payment, coupons, admin, users, wishlist, contact, sitemap, cookies/cache, admin hardening |
| unit | `tests/unit` (24) | pure functions + a few app-level asserts | Invariants that must never regress: stock/VIP math, coupon discounts, LIKE escaping, Persian normalization, migration journal, OTP gates, payment failover, a11y/CSP header shape |
| concurrency | `tests/concurrency` (2) | parallel requests | Inventory race + adversarial stress (never a negative stock, no double decrement) |
| postgres | `tests/postgres` (1) | live PG engine | Dual-dialect parity (schema, migrations, concurrency) |

## Wave/phase-named suites (kept — they are regression anchors, not history)
| Suite | Covers |
|-------|--------|
| `api/adversarial_challenge.test.ts` (23) | Empirical boundary attacks: malformed input, cross-user access, price/stock tampering |
| `api/round8-qa.test.ts` (7) | Upload guards, `coupons-active`, blog |
| `api/wave3-fixes.test.ts` (6) | Settings persistence, rating recompute, cart stock guard |
| `api/launch-readiness.test.ts` (7) | Coupon expiry, order-id format, VIP refund, health payload |
| `api/e2e_journey.test.ts` (7), `api/e2e_all_pages_api.test.ts` (4), `api/frontend-backend-parity.test.ts` (3) | Full user+admin journey, every route answers, FE/BE contract parity |
| `unit/phase1..phase4` (21) | Foundation, PG schema/migration, order+stock+payment transactions, resilience |
| `concurrency/adversarial-stress.test.ts` (9) | Load/race behaviour under parallel checkout |

## Rules learned the hard way
- **Persistent dev DB + suites = residue.** Suites that insert fixtures repopulate `data/janebi.db` on every gate run. Purge residue **last**, then re-read counts and run `PRAGMA integrity_check` (`scripts/data/purge-test-users.cjs`).
- **Vitest parallel flake is not a failure.** If one suite goes red in a full run but passes alone in isolation with the file untouched, it is contention — rerun that file, don't "fix" it.
- **One authoritative gate is enough.** `npm run verify > log; echo EXIT=$?` — never trust a piped tail's exit status.
- **A negative fixture that logs an error is expected.** e.g. `SQLite migration FAILED — file: 0007_corrupt.sql` is the migration-journal suite proving a corrupt migration aborts; it is not a break.
- **Postgres tier needs a live PG.** `drizzle.pg.config.ts` + `DATABASE_URL` for PG; the SQLite tier is the default and is what prod runs.
