# QA Report — headers-settings cluster (commit a6f601f)

**Date**: 2026-09-01 · **Deployed commit**: `a6f601f` ("Security headers + settings single-sourcing: Permissions-Policy, CSP report endpoint, shared STORE_SETTINGS_DEFAULTS, hero hack removed, settings PUT cache invalidation") · **Live**: https://janebiarena.ir

## Verdict: **FAIL** (1 code defect — invalid CSP directive name)

## 1. Verify gate — PASS
`npm run verify` local run on a6f601f:

```
 Test Files  37 passed (37)
      Tests  300 passed (300)
======================================================
✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)
======================================================
```
Typecheck + 37 suites / 300 tests + Vite client build (2280 modules) + esbuild server bundle all green.

## 2. Live probes — PASS
| Probe | Result |
|---|---|
| GET `/` | 200, `<title>جانبی آرنا | فروشگاه آنلاین لوازم جانبی موبایل` |
| GET `/products` | 200 (301 → `/products/` SPA alias, follows fine) |
| GET `/products/14` | 200 |
| GET `/login` | 200 |
| GET `/api/health`-style endpoints | `/api/products` 200 (131 items, x-total-count) |

## 3. Cluster-specific checks

### (1) Response headers on `/` — PASS
Evidence (live `curl -D -` on https://janebiarena.ir/):
```
permissions-policy: camera=(), geolocation=(), microphone=(), payment=(), usb=(), interest-cohort=()
reporting-endpoints: csp-endpoint="https://janebiarena.ir/api/csp-report"
content-security-policy: ...;report-uris /api/csp-report;report-to csp-endpoint
```
`reporting-endpoints` (correct modern transport) and `permissions-policy` are present and correct. Code source: `server/app.ts:36-49`.

### (2) POST /api/csp-report — PASS
`curl -X POST https://janebiarena.ir/api/csp-report -H 'Content-Type: application/csp-report' -d '{"csp-report":{"blocked-uri":"https://evil.example"}}'` → **HTTP 204** (non-500). Code: `server/app.ts:177-199` (rate-limited, `express.json({ type: () => true })`, logs via pino, returns 204).

### (3) GET /api/settings vs STORE_SETTINGS_DEFAULTS — PASS
Live `/api/settings` returns `phone: "۰۲۱-۸۸۸۸۹۹۹۹"`, `address: "تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴"` — byte-identical to `src/lib/constants.ts:23-40` (`STORE_SETTINGS_DEFAULTS`). `server/routes/settings.ts` builds SAFE_KEYS/DEFAULTS from the same shared constant; footer (`src/components/Footer.tsx:101`) renders `settings.phone` via `useStoreSettings()` which spreads the same defaults. Live-rendered homepage (browser) shows footer phone `۰۲۱-۸۸۸۸۹۹۹۹` ✓.

### (4) Hero slide settings-driven — PASS
Browser render of https://janebiarena.ir/: hero slide 1 title "هولدرهای مگنتی خودرو و پایه‌های رومیزی ضدلغزش" matches `heroSlide1Title` from `/api/settings` and `STORE_SETTINGS_DEFAULTS`. Code: `src/pages/Home.tsx:47` uses `settings.heroSlide1Title || STORE_SETTINGS_DEFAULTS.heroSlide1Title`. The only occurrences of 'فست' in rendered text are legitimate product copy ("کابل‌های فست و محافظ‌های ضدقطعی", "شارژر دیواری ۲۵ وات سوپر فست سامسونگ") — no hardcoded hero hack remains.

### (5) PUT settings cache invalidation — CODE-VERIFIED ONLY
No admin credentials available for a live PUT test. Code evidence in `server/routes/admin.ts:684-717`:
```ts
appCache.invalidate('settings');
```
is called after the upsert loop in `router.put('/settings', ...)` (comment: "Bust any server-side cached settings ... so admin edits are visible immediately"). Covered by test `tests/api/wave3-fixes.test.ts > admin settings PUT persists to DB and GET returns the stored value` (passing).

## 4. FAIL item

- **FAIL: invalid CSP directive `report-uris` in `server/app.ts:70`.** The live CSP header contains `;report-uris /api/csp-report;` — `report-uris` is not a valid CSP directive (valid names: `report-uri` (deprecated-but-real) and `report-to`). Browsers ignore it with a console warning, so the legacy report-uri transport is dead. Root cause: helmet's CSP option is named `reportUri` (serializes to `report-uri`); the code at `server/app.ts:70` uses `reportUris: ["/api/csp-report"]`, which helmet emits verbatim as the invalid `report-uris`. Fix (not applied — QA only): rename the option to `reportUri`. The modern `report-to` path (via `reporting-endpoints`) is unaffected.

## 5. Not tested
- Live PUT invalidation (no admin creds) — code-verified only, see §3.5.
