# QA Regression Report — janebiarena.ir — 2026-09-02

**Type:** Routine live regression sweep (read-only; no code modified, nothing committed)
**Target:** https://janebiarena.ir (React SPA, Persian RTL)
**Scripts:** `.hermes/reports/qa-regression-2026-09-02.cjs` (dual-engine sweep), `qa-img-recheck.cjs` (image verification)
**Raw results:** `.hermes/reports/qa-regression-2026-09-02-results.json`

## Overall Verdict: **PASS** (with third-party observations, see Notes)

---

## 1. curl API checks — PASS (5/5)

| Check | Result | Evidence |
|---|---|---|
| `/api/health` → 200 | PASS | `HTTP 200 size 222` — `{"status":"ok","database":"ok","latencyMs":1,"uptimeSeconds":18,...,"nodeVersion":"v22.23.2"}` |
| `/api/products` JSON non-empty | PASS | `HTTP 200 size 8425` — JSON array starts `[{"id":14,"title":"محافظ کابل و شارژر سیلیکونی...` |
| `/api/categories` non-empty | PASS | `HTTP 200 size 790` — `[{"id":1,"title":"شارژر",...},{"id":2,"title":"قاب و کاور",...}` |
| `/api/settings` → 200 | PASS | `HTTP 200 size 1988` — `{"storeName":"جانبی آرنا","phone":"۰۲۱-۸۸۸۸۹۹۹۹",...}` |
| `/` HTML contains `assets/index-*.js` | PASS | `HTTP 200 size 5336` — contains `assets/index-8xinYUga.js` |

⚠ Bundle observation: live bundle is `index-8xinYUga.js`, **not** the expected known-good `index-BplrxINR.js` — a new deploy has been pushed since the known-good snapshot. All functional checks below pass on the new bundle.

## 2. Playwright dual-engine sweep (headless, 1366×900) — PASS

Pages: `/`, `/products`, `/login`, `/cart`, `/blog`. Gate: body innerText > 200, no non-ignorable console/page errors.

| Page | Chromium textLen | WebKit textLen | Chromium errors | WebKit errors | Verdict |
|---|---|---|---|---|---|
| `/` | 5047 | 4207 | 0 | 0 | PASS |
| `/products` | 3285 | 3288 | 0* | 0* | PASS |
| `/login` | 1141 | 1143 | 0* | 0* | PASS |
| `/cart` | 1085 | 1085 | 0* | 0* | PASS |
| `/blog` | 1184 | 1184 | 0* | 0* | PASS |

\* Only errors captured were repeated `HTTP 408` from the **third-party Enamad trust seal** (`trustseal.enamad.ir/logo.aspx?id=7152119`) — an external service timing out intermittently during the first run. Direct curl to that URL also returned 400/408 sporadically; on recheck it loaded fine in WebKit. No first-party console errors or pageerrors were observed on any page in either engine.

## 3. Product images on `/products` — PASS

First sweep flagged `chg-2.svg` / `cbl-1.svg` (WebKit) and the Enamad seal (Chromium) with `naturalWidth===0`. Follow-up check (`qa-img-recheck.cjs`, 4s settle) shows these were **below-fold lazy-loaded images not yet decoded**, not broken assets:

- Chromium: all 14 product SVGs `naturalWidth=150, complete=true` (`cpr-14.svg`, `hld-13.svg`, `gls-12.svg`, `cbl-11.svg`, `ear-10.svg`, `chg-9.svg`, `cas-8.svg`, `pb-7.svg`, `ear-6.svg`, `chg-5.svg`, `cas-4.svg`, `gls-3.svg`, `chg-2.svg`, `cbl-1.svg`)
- WebKit: 12/14 decoded inline; `chg-2.svg` & `cbl-1.svg` show `complete:false` (offscreen, lazy — same URLs load 200 in Chromium and curl)
- curl spot check: `GET /products/chg-2.svg?v=3.2.0` → `200 image/svg+xml`

## Notes / Follow-ups (non-blocking)

1. **Live bundle hash changed** (`index-8xinYUga.js` vs known-good `index-BplrxINR.js`) — confirm this deploy was intentional.
2. **Enamad trust seal** is flaky from this network (408/400) and fails `naturalWidth` checks intermittently. Consider excluding `trustseal.enamad.ir` from future broken-image gates or adding an error fallback for it.
3. Lazy-loaded below-fold images report `naturalWidth===0` in WebKit until scrolled into view — future sweeps should scroll the page or filter `complete===false` before gating.
