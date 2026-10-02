# Portfolio Case Study — JanebiArena

> Engineering case study of the problems this production codebase actually hit and fixed.
> Format per story: **Problem → Detection → Root Cause → Solution → Verification → Lesson.**
> Everything below is grounded in code, tests, scripts, or commits in this repository;
> file paths are given so any claim can be re-checked. No fabricated metrics.

---

## 1. Payment handoff & gateway environment mismatch

**Problem.** Payments failed "sometimes" — the acquiring gateway's StartPay page rejected
some sessions with «دسترسی از این دامنه مجاز نمی باشد» (domain not authorized), while
other sessions worked. Separately, CI (which runs the sandbox gateway) went red for five
consecutive pushes on payment tests.

**Detection.** A live 9-cell matrix probe against the real gateway
(`scripts/ops/zarinpal-startpay-probe.py`) varied the HTTP `Referer` of the start-pay
request: with a `janebiarena.ir` origin (apex / www / http / with-path) the gateway
returns **200** and a valid form; with **no** Referer: **400 «دسترسی از این دامنه مجاز
نیست»**; a **302** redirect does not supply a referrer downstream. The measured matrix is
recorded in `tests/api/pay-handoff.test.ts`. For CI: the test hardcoded
`www.zarinpal.com` while CI runs `ZARINPAL_SANDBOX=true` (sandbox host) — same assertion
class, wrong expectation.

**Root cause.** (a) The gateway gates StartPay on `Referer`; any flow that could lose or
spoof it (direct client navigation, redirect chains) fails. (b) Environment-dependent
gateway hosts were baked into the test instead of derived from configuration.

**Solution.** Move the handoff server-side: `/pay/:authority` renders and auto-submits the
start-pay form from the server, guaranteeing the correct origin — the client never posts
to the gateway directly. The test now derives the expected base from
`zarinpalStartPayBase()` (environment-aware) while keeping the same exact-match
assertions (no weakening).

**Verification.** Test passes locally under both `ZARINPAL_SANDBOX=true` and `=false`;
CI run [37064784849](https://github.com/MrRooobooot/Janebi-Store/actions/runs/37064784849)
is green after five red runs.

**Lesson.** Assertions must derive from the environment, and gateways must be probed —
their real behavior beats their documentation.

---

## 2. Stale-deploy ambiguity → hash-sealed release identity

**Problem.** After a deploy it was genuinely unclear whether production served the new
build: behavior "looked right", but counts/features could match both old and new code.
Rollbacks and incident reviews were guesswork.

**Detection.** Discrepancies during ops reviews (two data views disagreeing) that could
not be resolved by reasoning about expected behavior — a sign that release identity was
unobservable.

**Root cause.** Builds carried no identity. The deployment replaced files in place with
no record of which commit the live tree came from.

**Solution.** `scripts/ops/release-info.mjs` (postbuild hook) writes `dist/BUILD_INFO`
(single-line JSON: release SHA = HEAD, file count) and `RELEASE_MANIFEST.sha256` (sha256
of every build file). `release.sh` **refuses** to ship a tree whose
`BUILD_INFO.release != HEAD` ("stale build — rebuild"). Post-deploy, the live identity is
checked against the shipped seal.

**Verification.** `shasum -a 256 -c RELEASE_MANIFEST.sha256` self-check at deploy time;
remote identity + 3-way `server.cjs` hash comparison during `release.sh` step 5.

**Lesson.** "It looks right" is not "it is the new build". Make release identity a
machine-checked artifact, not a judgment call.

---

## 3. Atomic, hash-verified release pipeline

**Problem.** The original deployment was an in-place `rsync --delete` into the live
docroot: a window existed where new and old files mixed; a bad sync had no rollback; a
schema-affecting release could run new code against the old schema.

**Detection.** Code review of the deploy path; operational request for rollback after a
bad build (previous flow had none).

**Root cause.** File-by-file sync IS the release — no immutability, no verification, no
transaction boundary.

**Solution.** `scripts/ops/release.sh` (documented in its header):

0. local preconditions (clean worktree, `BUILD_INFO.release == HEAD`, manifest self-check);
1. immutable `releases/<sha>/{dist,drizzle}` (refuses to overwrite a shipped release);
2. remote verification (`sha256sum -c`, identity, zero-byte guard, runtime-media union)
   followed by a `RELEASE_SEAL` (manifest hash of exactly the shipped tree);
3. additive migration applied **inside the running container** (old code + new schema =
   no window where new code runs against a missing column);
4. atomic switch: `./dist` repointed with a single symlink rename; previous tree kept at
   `releases/prev-<sha>-dist` for rollback;
5. container recreate, then live verification: served identity, 3-way `server.cjs` hash,
   feature markers, DB columns, `/api/health` (polled up to 90 s).

**Verification.** The pipeline's own step-5 checks run on every release; `wait_health`
fails the release loudly if `/api/health` doesn't return 200.

**Lesson.** A deploy is a transaction: stage immutable artifacts, verify before switching,
keep the previous version reachable. Nothing on the server is touched until every
precondition passes.

---

## 4. Atomic inventory (anti-overselling)

**Problem.** Money integrity: two buyers checking out the last unit, or a flash sale,
must never oversell — and cancellations must return stock exactly once.

**Detection.** Concurrency stress tests were written to *try to break it*
(`tests/concurrency/inventory-race.test.ts`, `adversarial-stress.test.ts`): parallel
checkouts against the same SKU, cancel races.

**Root cause class.** Application-level read-then-write stock checks cannot be atomic
under concurrency.

**Solution.** Stock changes are transactional and guarded at the database
(`UPDATE ... WHERE stockQuantity >= qty` semantics); payment initiation claims the order
so a double-submit can't double-reserve; cancellation paths restore stock with parity to
checkout.

**Verification.** The concurrency suite passes in CI; the payment flow's guarded update
is exercised by the same suite family (`tests/api/`).

**Lesson.** Money paths need database-level guards plus tests that actually race them.

---

## 5. Catalog search: FTS5 with a graceful fallback

**Problem.** `LIKE '%term%'` search over product text is slow and linguistically poor for
Persian catalog search.

**Detection.** Query cost analysis on the products route; user-facing relevance issues.

**Root cause.** No full-text index; substring matching instead of tokenized search.

**Solution.** `products_fts` FTS5 virtual table; the route builds a prefix-token MATCH
query with input sanitized so user text can never inject FTS operators ("FTS5 query
syntax so user input can never inject operators"). Environment flag `fts5Available` +
automatic LIKE fallback when FTS5 is missing or errors ("FTS5 search failed, falling back
to LIKE").

**Verification.** Tests assert both paths; search pages carry `noindex,follow`
(header + body from one predicate).

**Lesson.** New engine + graceful degradation beats a hard switch. Persian text needs
tokenized search, not substring scan.

---

## 6. Database hot-path indexing

**Problem.** Catalog filtering and the pending-payment reaper ran against unindexed
columns.

**Detection.** Query-pattern review of hot routes (category/brand/price filtering; order
status sweeps).

**Solution.** Migrations `0005_order_created_at_indexes` and `0013_hot_path_indexes`:
orders(user_id), orders(created_at), orders(status, created_at), order_items(order_id),
reviews(product_id), cart_items(user_id), wishlist_items(user_id), addresses(user_id),
product_features(product_id), products(category), products(brand), products(price),
contact_messages(status, created_at).

**Verification.** Migration files are in `drizzle/sqlite/`; migrations apply additively
during release (step 3 of the pipeline).

**Lesson.** Index what the code actually queries — including the operational queries
(reaper sweeps), not just user-facing ones.

---

## 7. Monitoring failure: cron drifted from the repo

**Problem.** Monitoring silently died. The monitor script had moved from
`scripts/vps-monitor.py` to `scripts/ops/vps-monitor.py`, but the **host cron** kept
calling the old path. Cron entries lived on the host, not in git.

**Detection.** Alerting expected during an exercise did not arrive — the absence was only
noticed during a manual ops review (a worse outcome than a fake alarm).

**Root cause.** Ops wiring (cron lines) was not versioned; moving a file in git silently
broke the host. Classic invisible drift between repo and infrastructure.

**Solution.** `scripts/ops/install-cron.sh` — idempotent installer that rewrites the whole
managed cron block (`# janebi-managed`) on every run and fails fast if the target scripts
are missing. Quote from the script: *"moving a script path silently killed monitoring
once … The installer rewrites the whole managed block every run, so the host can never
drift from the repo again."* The monitor itself (`vps-monitor.py`) checks health,
containers (+RestartCount delta), disk, 5xx rate, backup age, and fatal logs, with an
alert state-machine (alert on start, bounded reminders, recovered notice) to avoid spam.

**Verification.** Re-running the installer is a no-op beyond rewriting the block; monitor
alerts have been exercised (disk-exhaustion drill in ops logs).

**Lesson.** If it's not in git it will drift. Commit the *installer*, not the crontab.

---

## 8. Backup verification (restore-proof, alerting)

**Problem.** A backup that has never been restored is a hope, not a backup. Silent backup
death is the classic failure mode.

**Detection.** Operational review: the previous flow produced files but never *proved*
they were usable, and failures raised nothing.

**Solution.** `scripts/ops/backup-verify.sh` (cron 02:30, wrapper execs the repo script):
WAL-consistent snapshot via better-sqlite3 `.backup` → `integrity_check` +
`foreign_key_check` **on the file** → open the DB and read real rows (**restore proof**)
→ upload a copy off-box (Bale) → prune beyond the last 7 → any failure alerts the
operator on Bale and exits non-zero ("a silent backup death is impossible").

**Verification.** Every run performs the restore proof; the monitor additionally alerts if
the newest dump is older than `MAX_AGE_H`.

**Lesson.** Verification must be on the artifact (restore it), not the process (the dump
job "ran").

---

## 9. PWA service worker: stale API cache + clone-after-consumed

**Problem.** Production console errors on product pages from the service worker
("Response body is already used"), and stale API/review data served by the SW cache.

**Detection.** SW probes under `scripts/audit/` (`sw-cache-probe.mjs`,
`sw-reviews-probe.mjs`) plus console-error collection in QA rounds; the probe file
documents that `public/sw.js` "used to run stale-while-revalidate on any path starting
with" — i.e. too broad, serving stale data on paths that must be fresh.

**Root cause.** (a) Cache scope: SWR applied to API paths whose data must not be stale.
(b) A `response.clone()` executed inside an async `caches.open()` callback — by then the
page had begun consuming the body, and cloning a used body throws.

**Solution.** Narrow, version-gated cache strategy (`janebi-static-v1.2.3`,
`janebi-api-v1.2.1`) and clone-before-read in the fetch path (`public/sw.js` comments:
"`.clone()` inside the async `caches.open()` callback throws 'Response body is already
used' once the page has started reading it" — now the copy is taken before any await
gap).

**Verification.** Probe scripts re-run after cache version bumps; console-error audit
check (`scripts/audit/console-errors.mjs`).

**Lesson.** A service worker is a production cache server running in your users'
browsers. Version it, scope it, and probe it like infrastructure.

---

## 10. Security hardening: proxy headers are attacker input

**Problem.** Multiple independent security issues traced to the same root class: trusting
request/proxy headers.

**Detection.** Findings during security audit rounds (`docs/SECURITY-AUDIT-2026-09-14.md`
and the remediation log `docs/BACKEND-REMEDIATION-2026-09-18.md`): a CSP `Reporting-Endpoints` header was derived from
`X-Forwarded-Host` (nginx forwards it verbatim) — so `X-Forwarded-Host: evil.example`
both forged the header **and**, because nginx micro-caches some responses, **poisoned the
cached response every other visitor received**, sending their CSP violation reports to an
attacker-controlled origin. Same trust pattern gave credentialed CORS: comparing `Origin`
against the raw `X-Forwarded-Host`/`Host` earned `Access-Control-Allow-Origin` for ANY
origin. Separately, a forgeable `X-Forwarded-For` could bypass rate limiting.

**Root cause.** Header values as trust anchors: `X-Forwarded-Host` (CSP endpoint, CORS
allowlist) and `X-Forwarded-For` (client identity for rate limits).

**Solution.**
- CSP report endpoint pinned to configured `env.APP_URL` — never request headers.
- CORS origin check no longer trusts raw forwarded host headers.
- nginx sets `X-Forwarded-For $remote_addr` (**overwrite**, not append) — forged XFF is
  stripped at the boundary (`deploy/nginx-janebi-store.conf:57`).
- Robots consistency: `X-Robots-Tag` header and body meta served from one predicate
  (`shouldNoIndex`) — a header-only fix had left responses contradicting themselves.
- Gates: SEC-01 static-exposure (`/server.cjs` must 404), SEC-03 CSP inline-hash +
  security.txt, both in `verify-all.sh`; `test-gate-guards.sh` proves the gates fail when
  they should.
- Secrets: full-history **gitleaks** scan introduced (CI workflow `secret-scan.yml`,
  config `.gitleaks.toml`). Initial scan: 5 findings, all verified benign (cache-name
  constants, the public IndexNow host key, an expired scratch-file JWT) — allowlisted
  **by commit**, so new leaks in the same files are still caught. A live credential once
  published in the public README was scrubbed from the working tree; **rotation of that
  credential is an explicitly tracked owner action — this case study does not claim the
  incident fully closed.**

**Verification.** gitleaks with the config: "no leaks found" over 867 commits; a negative
control (synthetic PAT-shaped string) is detected by the same ruleset; CI proves gates
on every push.

**Lesson.** Proxy headers are attacker input. Derive security-relevant URLs and allowlists
from configuration, strip/overwrite identity headers at the boundary — and remember that
a leaked secret is only truly fixed by rotation.

---

## 11. OTP SMS timing incident

**Problem.** Users reported OTP codes "never arriving"; the server had already expired
them. Code comment in `server/routes/auth.ts`: the TTL was 2 minutes, but Iranian carrier SMS
delivery can lag 2–6 minutes — the code expired before the SMS reached the phone.

**Detection.** The incident is documented in the code comment (2026-09-06) — support
patterns showed users entering codes that were valid-looking but server-expired.

**Solution.** TTL raised to 5 minutes; the SMS.ir template's expiry line (#TIME#) is sent
as "۵ دقیقه" so the message and the server agree; per-phone send rate limiting and a
5-attempt lockout guard abuse. In production today the SMS provider is not configured, so
the endpoint fails closed with `503` instead of misbehaving.

**Verification.** Flow covered by the API/unit test suites under `tests/api/` and
`tests/unit/`; the fail-closed 503 branch is explicit in `server/routes/auth.ts`
(`smsConfigured` gate).

**Lesson.** Timeouts must match the real world of the slowest hop, and text in the SMS
must match server state. Also: fail closed, visibly.

---

## 12. bfcache disabled by `no-store`

**Problem.** Back/forward navigation felt slow; Chromium's back-forward cache was being
defeated on HTML documents.

**Detection.** Cache-header review of the nginx config; Chromium ignores bfcache for
`no-store` responses.

**Solution.** HTML documents switched to `no-cache, must-revalidate` — still always
revalidated, but eligible for bfcache. The nginx config carries the reason inline:
`# no-store blocked bfcache` (`deploy/nginx-janebi-store.conf:148`).

**Verification.** Header checks via `scripts/audit/header-probe.mjs`; live sweep in
`prod-csp-sweep.mjs`.

**Lesson.** Pick the *weakest* cache policy that is still correct; `no-store` has a real
UX cost.

---

## Themes across stories

1. **Verify against reality** — probe the real gateway, race the real database, restore
   the real backup, scan the real history.
2. **Make the invisible observable** — release identity, alert state machines, and gates
   that fail loudly ("a green gate with skips is NOT full coverage" — `verify-all.sh`).
3. **The boundary is where trust dies** — proxy headers, gateway referers, SW scope.
4. **Ops code belongs in git** — cron installers, drift checks, backup logic; the host
   must not be the source of truth.
5. **Never overclaim** — where something is still open (credential rotation, SMS
   provider, PG parity run), it is stated as such.

## Evidence index

| Artifact | Path |
|---|---|
| Release pipeline | `scripts/ops/release.sh`, `scripts/ops/release-info.mjs` |
| Payment probe | `scripts/ops/zarinpal-startpay-probe.py`, `tests/api/pay-handoff.test.ts` |
| Concurrency tests | `tests/concurrency/inventory-race.test.ts`, `adversarial-stress.test.ts` |
| Monitoring | `scripts/ops/vps-monitor.py`, `scripts/ops/install-cron.sh`, `scripts/ops/nginx-drift.sh` |
| Backup | `scripts/ops/backup-db.mjs`, `scripts/ops/backup-verify.sh` |
| SW probes | `scripts/audit/sw-cache-probe.mjs`, `sw-reviews-probe.mjs`, `console-errors.mjs` |
| Security gates | `scripts/verify-all.sh`, `scripts/gate/`, `.github/workflows/secret-scan.yml`, `.gitleaks.toml` |
| Architecture | `docs/ARCHITECTURE.md`, `server/app.ts`, `server/routes/products.ts` |
