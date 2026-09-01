# TEAM-BACKEND Cluster Report — Security Headers + Settings Single-Sourcing

**Date**: 2026-09-01
**Verify gate**: `npm run verify` → ✅ ALL HARDCORE QUALITY GATES PASSED (tsc strict clean; **37 test files / 300 tests passed**; Vite client build + Esbuild server bundle OK)

---

## §3.15 Security header hardening (`server/app.ts`)

- **`Permissions-Policy`** set on every response: `camera=(), geolocation=(), microphone=(), payment=(), usb=(), interest-cohort=()`.
  - Note: helmet v8 **removed** its `permissionsPolicy` middleware (not in `HelmetOptions` types — verified against `node_modules/helmet/index.d.mts`), so the header is set in a small pre-helmet middleware instead. Initially attempted `helmet({ permissionsPolicy })` → `tsc` error `TS2353`; corrected to manual `res.setHeader`.
- **CSP violation observability** added to the production CSP directive set:
  - `report-uri /api/csp-report` (`reportUris`) + `report-to: csp-endpoint` (`reportTo`) in helmet CSP directives.
  - `Reporting-Endpoints: csp-endpoint="https://<host>/api/csp-report"` header emitted per request, derived from `X-Forwarded-Host`/`Host` + `X-Forwarded-Proto` (no hardcoded domain; works behind the Nginx proxy).
- **`POST /api/csp-report`** endpoint in `server/app.ts` (mounted before the /api 404 catch-all):
  - Accepts both transports: legacy `{"csp-report": {...}}` bodies and report-to lists; a route-scoped `express.json({ type: () => true })` parser handles the non-JSON content types browsers send (`application/csp-report`, `application/reports+json`) which the global JSON parser skips.
  - Writes the full violation payload to **pino** via `req.log.warn({ cspReport, requestId }, 'CSP violation report received')` (pino-http request-scoped logger, includes request IDs).
  - **Rate-limit-light**: dedicated limiter, 60 requests / 15 min / IP (skipped in test env), on top of the general /api limiter. Responds `204 No Content`.

## Settings single-sourcing (zero drift)

- **Canonical defaults exported** as `STORE_SETTINGS_DEFAULTS: Record<string, string>` from `src/lib/constants.ts` (already the shared client/server constants module — server imports it as `../../src/lib/constants.js`, same pattern as `FREE_SHIPPING_THRESHOLD`). 19 keys: contact block + 3 hero slides (title/subtitle/link/badge each).
- Deleted **three** duplicate literal blocks, all now consume the shared module:
  1. `server/routes/settings.ts` — `DEFAULTS` literal replaced with import; `SAFE_KEYS` now derived via `Object.keys(STORE_SETTINGS_DEFAULTS)` so the safe-key allow-list can never drift either.
  2. `server/routes/admin.ts` — `DEFAULT_SETTINGS` (admin PUT allow-list) replaced with import. Side benefit: admin `PUT /api/admin/settings` can now legitimately persist hero-slide fields (previously silently rejected by the allow-list).
  3. `src/hooks/useStoreSettings.ts` — static `FALLBACK` literal replaced with `{...STORE_SETTINGS_DEFAULTS, freeShippingThreshold: parseInt(...)}` (numeric conversion only at the API boundary).
- Also de-duplicated (found during the sweep): `src/pages/admin/Settings.tsx` initial state literal (which still carried the stale 'فست‌شارژ' title) → shared defaults; `src/pages/Home.tsx` inline per-slide fallback strings → `STORE_SETTINGS_DEFAULTS` fields.
- Drift check: grep for `فست‌شارژهای هوشمند` / `۰۲۱-۸۸۸۸۹۹۹۹` across repo → the only remaining occurrences are the canonical `src/lib/constants.ts` definition and docs (`PROJECT_AUDIT.md`, `public/llms.txt`). No duplicated literals in code.

## Hero hack removal (`src/pages/Home.tsx`)

- Removed the content hack `settings.heroSlide1Title && !settings.heroSlide1Title.includes('فست')` (and the parallel `'انکر'` subtitle guard) that silently overrode operator-saved values.
- Hero slides now render exactly what `GET /api/settings` returns, with fallback only for empty/undefined fields: `settings.heroSlideX… || STORE_SETTINGS_DEFAULTS.heroSlideX…`.
- The correct default hero-1 content («هولدرهای مگنتی خودرو و پایه‌های رومیزی ضدلغزش», N52 subtitle, `/products?category=هولدر و پایه` link, «فروش تکی و عمده کارتنی» badge) lives in the shared defaults; the old stale 'فست‌شارژ' default no longer exists anywhere in code.

## Settings cache invalidation

- `PUT /api/admin/settings` previously had only a comment saying nothing to invalidate. It now calls **`appCache.invalidate('settings')`** after the DB upserts, so any server-side memoized settings views bust immediately on admin edits (nginx 15s + SW layers are infra-level, outside this route).

## Files changed

- `src/lib/constants.ts` — added `STORE_SETTINGS_DEFAULTS` (canonical single source)
- `server/app.ts` — Permissions-Policy header, Reporting-Endpoints header, CSP `report-uri`/`report-to`, `/api/csp-report` endpoint + light rate limiter
- `server/routes/settings.ts` — DEFAULTS/SAFE_KEYS from shared module
- `server/routes/admin.ts` — DEFAULT_SETTINGS from shared module; appCache invalidation in PUT
- `src/hooks/useStoreSettings.ts` — FALLBACK from shared module
- `src/pages/Home.tsx` — hero hack removed; all slide fallbacks from shared defaults
- `src/pages/admin/Settings.tsx` — initial state from shared module

## Verification evidence

- `npm run lint` (tsc --noEmit): clean
- `npm run verify`: `Test Files 37 passed (37)`, `Tests 300 passed (300)`, build `✓ built`, final gate banner `✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)`
- Notes for orchestrator: no deploy performed (per instructions); hero-1 rows in the production `store_settings` table may still contain the old 'فست‌شارژ' values — they are now honored as operator content; the operator can overwrite them via the admin settings form (hero keys are accepted since admin.ts's allow-list now includes them).
