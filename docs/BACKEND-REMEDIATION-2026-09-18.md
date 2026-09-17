# Backend/test remediation — 2026-09-18

## Verified changes
- Vitest forces SQLite `:memory:` / `TEST_DIALECT=sqlite`. Removed obsolete persistent-DB global setup/teardown (103 lines); config-only isolation assertion runs before Vitest in the consolidated gate.
- Added real-route order regression tests: exact server-side totals, coupon/VIP accounting, rollback, stock restoration, repeated cancellation and admin shipping/status persistence. SQLite tests invoke application routers, not copied algorithms.
- Exact price assertions now reject both previously surviving isolated mutations. Production `formatPrice` did not need alteration.
- `jsonFetch`: consume failed response JSON once; preserve backend `error` or `message`. Real local HTTP negative tests failed before the change, passed afterward (3 tests).
- PG suite is explicitly optional without PG_DATABASE_URL. Configured connection/migration failures now fail instead of silently skipping; connection-string secrets are not logged. A disposable localhost PG cluster applied 14 migrations and passed all 5 engine tests. These are NOT proof of application checkout parity on PostgreSQL.
- Browser console errors now retain their source URL. Payment E2E trace attributed HTTP 501 to `https://trustseal.enamad.ir/logo.aspx`, not store/payment APIs. Only that external origin is excluded at collection; no blanket 501 exclusion. Targeted payment test passed Chromium and WebKit without retries.

## Evidence
- `npm run verify`: 473 passed / 5 optional PG skipped, 60 files; TypeScript/build/SEC-01/SEC-03 passed. Log: `/tmp/janebi-final-verify.log`.
- Dedicated PG positive run: `/tmp/janebi-pg-positive.log`; negative configured-connection control: `/tmp/janebi-pg-negative.log`.
- Payment dual-engine run: `/tmp/janebi-payment-attributed.log`, 2 passed.
- Full browser run outcome is recorded separately after completion; targeted success does not establish full-suite success.
- Runtime change committed in `c6c7790`; production deployment and served hash are separate evidence, not implied by push.

## Dead-code scope and limits
Knip reported 30 candidate files, 1 dependency, 2 exports and 2 types. Operational scripts, service worker, Drizzle CLI config and dynamic pino transport are not dead just because Knip cannot resolve their entry points. Removed only disconnected global setup/teardown after empty graph/current Serena reference checks; removed the temporary PG bootstrap script after use. No blind bulk deletion. Remaining export/type candidates are not evidence of runtime defects.

## Still not certified
External banking settlement, SMS delivery, complete PostgreSQL application parity, all operator workflows and previously documented ops defects are not certified by these tests. No claim of zero bugs or zero remaining dead code.
