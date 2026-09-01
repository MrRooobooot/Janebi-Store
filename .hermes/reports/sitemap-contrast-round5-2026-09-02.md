# Round 2026-09-02e — Per-Post Blog Sitemap + Contrast Round 5 (AdminProducts)

**Date**: 2026-09-02 · **Base**: 4c0875f → **Deployed**: 0bf6ba6 · **Prod bundle**: `index-BEQ5_HOe.js` (was `index-Dj3Salu_.js`)

## 1. Per-post blog sitemap (backlog item 1)
Work was found mostly complete locally (committed as `95b72b9` in a prior round, unpushed) and is now pushed/deployed:

- `server/routes/sitemap.ts` (new) — `GET /sitemap.xml` serves the static `public/sitemap.xml` as base and appends one `<url>` per **published** row from `blog_posts`, using the post's real DB id as the slug (the table has no separate slug column), `lastmod` from real `createdAt` (omitted when absent/unparseable), XML-escaped, DB-failure-safe (falls back to static base).
- `server/app.ts` — route mounted at `/sitemap.xml`.
- `src/App.tsx` + `src/pages/static/Blog.tsx` — `/blog/:slug` deep-link route opens the matching article.
- `tests/api/sitemap.test.ts` (new) — static base preserved + appended post URLs + lastmod-omit path; rows cleaned up in `afterAll`.

**Prod reality check (honesty note)**: prod `blog_posts` is **empty** (`/api/blog` → `[]`; in-container SQL confirms 0 rows), so the live sitemap correctly contains only static entries — zero per-post URLs is the correct zero-fabrication output until the admin publishes real posts. Mechanism is live and test-covered.

## 2. Contrast round 5 — AdminProducts (backlog item 2)
Header nav/user menu and MobileBottomNav were **already zinc-converted in round 4** (`6d50ba7`) — verified by grep, nothing left to do there. Remaining hotspot was `src/pages/admin/Products.tsx` (gray palette):

- Table header row: `text-gray-500 dark:text-gray-400` → `text-gray-600 dark:text-gray-300` (light: 4.8:1 → 9.6:1 on the gray-50 header band)
- Loading/empty-state cells: `text-gray-400` → `text-gray-500`; empty-state Package icon `gray-300` → `gray-400`
- Modal close (action icon) button: `text-gray-400` → `text-gray-500` (hover 700)
- Modal hint span: `text-gray-400` → `text-gray-500`

## 3. Verification
- `npm run verify` — ✅ ALL GATES PASSED: strict tsc, **44 suites / 331 tests** (incl. new sitemap suite), Vite + Esbuild builds
- Post-build artifact audit: `jsxDEV` count **0**, `/Users/` path leaks **0**
- Committed `0bf6ba6`, pushed to `main`; `./deploy.sh` completed, health `{"status":"ok","database":"ok"}`
- Live: `https://janebiarena.ir/` → **HTTP 200**, served bundle `assets/index-BEQ5_HOe.js` (changed from `index-Dj3Salu_.js`)
- `https://janebiarena.ir/sitemap.xml` → HTTP 200, static entries present, no fabricated post URLs
- Prod `.env` untouched (JWT secrets rotated 2026-09-02 — do-not-touch honored)

## Files
- `src/pages/admin/Products.tsx` (modified, contrast round 5)
- `server/routes/sitemap.ts`, `tests/api/sitemap.test.ts` (new, prior-round work pushed now)
- `server/app.ts`, `src/App.tsx`, `src/pages/static/Blog.tsx` (prior-round sitemap wiring)

## Leftovers / notes
- Publish real blog posts via admin → sitemap picks them up automatically (no code change needed).
- Remaining a11y hotspots from the audit list: FAQ.tsx, NotFound/EmptyState, OrderHistory (NotFound done in round 4), Orders.tsx gray palette.
- `.hermes/agents-status.json` / `package-lock.json` left uncommitted (churn).
