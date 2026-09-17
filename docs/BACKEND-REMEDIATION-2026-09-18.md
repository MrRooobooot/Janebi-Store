# Backend/test remediation — 2026-09-18

## Verified changes
- Vitest forces SQLite `:memory:` / `TEST_DIALECT=sqlite`. Removed obsolete persistent-DB global setup/teardown (103 lines); config-only isolation assertion runs before Vitest in the consolidated gate.
- Added real-route order regression tests: exact server-side totals, coupon/VIP accounting, rollback, stock restoration, repeated cancellation and admin shipping/status persistence. SQLite tests invoke application routers, not copied algorithms.
- Exact price assertions now reject both previously surviving isolated mutations. Production `formatPrice` did not need alteration.
- `jsonFetch`: consume failed response JSON once; preserve backend `error` or `message`. Real local HTTP negative tests failed before the change, passed afterward (3 tests).
- PG suite is explicitly optional without PG_DATABASE_URL. Configured connection/migration failures now fail instead of silently skipping; connection-string secrets are not logged. A disposable localhost PG cluster applied 14 migrations and passed all 5 engine tests.
- **PG application parity (2026-09-18, proven):** the 8 order-integrity router tests, 6 rollback tests and 2 payment-callback tests all pass on an isolated disposable PostgreSQL cluster (`/tmp/janebi-pg-parity.log`, `/tmp/janebi-pg-parity2.log`, `/tmp/janebi-pay-cb-pg.log`). The real Express routers, transactions and Drizzle code run against PG — not copied algorithms.
- **Payment gateway liveness (2026-09-18, verified on prod container):** Zarinpal request probe returned HTTP 200 / code 100 in 454 ms; Saman `sep.shaparak.ir/MobilePG/MobilePayment` answered HTTP 200 (8,349-byte payment page). Liveness ≠ a completed real settlement.
- **SMS pipeline (2026-09-18, verified on prod container):** SMS.ir `/v1/send/verify` with the real order template returned HTTP 200 / status 1 «موقف» — API key, template 937005 and parameter names are accepted end-to-end. This is provider acceptance of a probe message, not proof of handset delivery.
- Browser console errors now retain their source URL. Payment E2E trace attributed HTTP 501 to `https://trustseal.enamad.ir/logo.aspx`, not store/payment APIs. Only that external origin is excluded at collection; no blanket 501 exclusion. Targeted payment test passed Chromium and WebKit without retries.

## Evidence
- `npm run verify`: 473 passed / 5 optional PG skipped, 60 files; TypeScript/build/SEC-01/SEC-03 passed. Log: `/tmp/janebi-final-verify.log`.
- Dedicated PG positive run: `/tmp/janebi-pg-positive.log`; negative configured-connection control: `/tmp/janebi-pg-negative.log`.
- Payment dual-engine run: `/tmp/janebi-payment-attributed.log`, 2 passed.
- First full attributed browser run: 82 passed / 1 WebKit failure / 3 not run. The admin-message test hard-navigated immediately after login, while account sync was pending (trace cart/wishlist status -1, followed by 200 after navigation). An initial shared `uiLogin` wait introduced a logout-test timeout (already-authenticated users do not trigger a fresh login transition); it was reverted. Only the initially-guest admin-message test now waits for successful completed cart/wishlist GETs before hard navigation. Targeted message + logout checks: 4 passed across Chromium/WebKit (`/tmp/janebi-scoped-sync.log`). This is test synchronization, not a certified fix of all possible application races. Full rerun after the scoped fix: **86 passed / 0 failed / 0 flaky across Chromium+WebKit in 4.6m** (`/tmp/janebi-e2e-scoped-final.log`).
- Runtime change committed in `c6c7790`; production deployment and served hash are separate evidence, not implied by push.

## Dead-code scope and limits
Knip reported 30 candidate files, 1 dependency, 2 exports and 2 types. Operational scripts, service worker, Drizzle CLI config and dynamic pino transport are not dead just because Knip cannot resolve their entry points. Removed only disconnected global setup/teardown after empty graph/current Serena reference checks; removed the temporary PG bootstrap script after use. No blind bulk deletion. Remaining export/type candidates are not evidence of runtime defects.

## Still not certified
Real banking settlement (an actual card payment through Zarinpal/Saman), handset delivery of SMS, and all operator workflows are not certified by these tests. No claim of zero bugs or zero remaining dead code.
