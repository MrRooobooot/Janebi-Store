# Test validity audit — 2026-09-17

## Verdict

The suite is not uniformly reliable. Passing tests are useful evidence, not proof that all critical flows work. Production code was not mutated; utility mutations were confined to a temporary copy without DB setup or external services.

## Executed evidence

- Full `npm run verify`, final run: 58 files passed; 450 tests passed, 5 PostgreSQL tests skipped; static exposure and CSP probes passed. Log: `/tmp/janebi-test-audit-final-gate.log`.
- Two existing utility suites copied unchanged to an isolated directory, minimal Vitest config (no shared DB/global setup). Baseline: 35/35 passed.
- Mutating price display to add 10 to every numeric amount: 35/35 still passed. Mutating amounts >=1,000,000 to display zero: 35/35 still passed. Both defects escaped the existing price assertions, which mostly check the currency suffix/substrings rather than exact amounts.
- Positive detection control: replacing Persian digit 1 mapping with 2: 4 failed /31 passed. These tests do detect some real changes. Three deliberately selected mutations are not a whole-project mutation score.
- Results: `/var/folders/6_/vfwfvvhd3_s7ds9r38v61_kc0000gn/T/janebi-test-strength-24s87x9j/results.json`.
- Real-browser smoke negative control: local HTTP server returned a deliberately empty page for every route. Both engines reported 14 EMPTY results and PROBLEMS FOUND but process exited 0. This was a confirmed false-green CLI defect.
- Fixed only that exit propagation: `process.exitCode = bad ? 1 : 0`. Added runnable regression: `python3 scripts/audit/test-smoke-exit.py`. It failed before the fix with `Broken pages were reported but CLI exited successfully`; passed after the fix, observing smoke exit=1.
- Live positive control after fix: 7 routes on each of Chromium and WebKit rendered; no reported console/unexpected API failures; exit=0. This is guest smoke, not completed checkout/payment.
- A closed-port smoke attempt timed out and was discarded as inconclusive; the bounded local empty-page server provided the valid negative control instead.

## E2E execution limits

Default Playwright config selects only `real-user.spec.ts`, not `cookie-auth.spec.ts`, `deep-coverage.spec.ts`, or `store.spec.ts`. Full attempt planned 86 cases across two browsers. It showed repeated failures and was deliberately stopped; there is no completed full-suite pass count.

Captured home failure: missing product-card locator at `real-user.spec.ts:135`; DOM showed 0 products and the empty-catalogue state. This did not establish a React/CSP defect. A later isolated WebKit rerun of that same test with trace and retries=0 passed (1 test, ~1 minute). Current local/snapshot DB counts subsequently read 14 products each. Configuration starts webServer before global setup snapshots the DB, so database readiness/state ordering warrants investigation; the snapshot and shared mutable source DB make the test environment non-deterministic. No definitive single root cause claimed.

## Source-confirmed coverage weaknesses

1. `scripts/audit/prod-guest-smoke.mjs:7,12,28`: broad API ignore regex suppresses any error status on cart/wishlist/orders paths, not just expected anonymous 401; broad third-party error-text patterns are not origin-bound. Fixing exit propagation does not fix those blind spots.
2. `tests/unit/persian-utils.test.ts:146–161`, `tests/unit/utils.test.ts:73–75`: price assertions do not verify complete numeric output (demonstrated by surviving mutations).
3. `tests/postgres/postgres-verification.test.ts:22–75`: catch wraps both connection and fixture inserts; schema/seed failures become 'PostgreSQL unavailable' skips. Cleanup errors also swallowed (78–91). Current 5 skips do not certify PostgreSQL behavior.
4. PostgreSQL stock tests execute handwritten SQL rather than the application order endpoint (e.g. lines 172–204); they primarily prove that chosen SQL sequence, not application integration.
5. `e2e/real-user.spec.ts:535–547`: payment success condition is `settled || persisted`; generic existing text containing «درگاه» can satisfy settled, with timeouts swallowed. The assertion does not require gateway request success or even order persistence. Static evidence, not an induced production payment failure.
6. `scripts/verify-all.sh` includes tsc, Vitest, build and two probes; neither browser E2E nor the new standalone smoke-exit regression is part of the default gate. Run it explicitly until intentionally integrated.

## Independently reviewed findings, checked against source

- **Data safety:** `tests/unit/concurrency-invariants.test.ts:9–14` deletes ALL order_items and orders without WHERE before every test, suppressing errors. `vitest.config.ts` provides no DATABASE_URL isolation; the suite itself documents its persistent local SQLite use. Do not run the general gate against any valuable database. Prior runs cannot establish which historical rows existed or were lost. This is not evidence of production deletion.
- **Persistence assertion absent:** `e2e/real-user.spec.ts:694–696` reloads after changing order status but only checks a row is visible; it never verifies the saved status. A no-op status update can satisfy that assertion.
- The independent review also flags that SQLite's process-level transaction serialization does not exercise PostgreSQL interleavings; passing SQLite race tests cannot certify PG behavior. This does NOT mean SQLite race tests are universally incapable of finding defects.
- Two isolated home WebKit reruns (list and line reporters, no retries) passed. Sequential WebKit run with max-failures=1 completed with 34 passed, 1 failed, 8 not run. Failure: admin product creation test, `real-user.spec.ts:625`, created title not visible after reload. That exact admin test subsequently passed isolated (47.6s, no retries). This demonstrates suite instability/state sensitivity, not a confirmed product-code root cause. Logs: `/tmp/janebi-webkit-first-failure.log`, `/tmp/janebi-admin-isolated.log`. No UI fix applied.

## Scope / next work

No production deployment or server change was needed for this local audit-script fix. No customer data, payment request, or auth-security mutant was used. Remaining remediation: exact price assertions; strict optional-PG prerequisites versus actual setup failures; deterministic isolated E2E fixtures/readiness; outcome-based payment assertions and narrower smoke ignores. Do not call all tests correct based on 450 passes.
