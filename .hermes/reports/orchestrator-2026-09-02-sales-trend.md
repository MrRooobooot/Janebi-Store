# Orchestrator Round Report — Sales Trend Chart + Admin Digit Consistency
**Date**: 2026-09-02 · **Commit**: `625d33c` · **Deploy**: ✅ live on https://janebiarena.ir

## Scope (admin-review-2026-09-01 backlog cluster)

### P1 — Real-data sales trend chart (admin dashboard)
- **Backend** (`server/routes/admin.ts`): `GET /api/admin/analytics` now returns `salesTrend: { date, revenue, orders }[]` — 14 daily buckets ending today, computed from **real orders only** with status `processing | shipped | delivered`. Timestamp resolution: `orders.created_at` (ISO) first; legacy NULL rows fall back to the base36 timestamp embedded in the `ORD-<ts>-<rand>` id (fallback verified: `MTG13IPY` → 1788107600518 ≈ 2026-09-01). Zero fabricated aggregates.
- **Frontend** (`src/pages/admin/Dashboard.tsx`): full-width bar chart card above the analytics grid. Pure CSS/flex bars (no new dependency), dual-theme (emerald tones on `--color-surface-light` / gray-800 surfaces), Persian day labels via `toLocaleDateString('fa-IR')`, `formatPrice`/`toPersianDigits` tooltips with per-day revenue + order count, honest empty state when no completed orders in the window (`role="img"` + Persian `aria-label`).

### P2 — Input digit consistency (admin forms)
Root cause: `type="number"` inputs reject Persian-digit keystrokes at the browser level. Converted all admin numeric inputs to `type="text" inputMode="numeric"` with `toEnglishDigits(...).replace(/[^0-9]/g,'')` normalization on change and submit:
- `Users.tsx` — VIP points modal (change + submit now `parseInt(toEnglishDigits(...))`)
- `Settings.tsx` — free-shipping threshold
- `Coupons.tsx` — discount value (submit already normalized; added explicit `percent > 99` guard since HTML `max` no longer applies)
- `Products.tsx` — discount % (handler already normalized) and stock quantity

## Verification
- `npm run verify` — ✅ ALL HARDCORE QUALITY GATES PASSED (strict tsc + full Vitest suites + Vite/Esbuild build)
- Post-build artifact audit — `jsxDEV` = 0, `/Users/` leaks = 0; `salesTrend` present in local `Dashboard-*.js` chunk and `server.cjs`
- `./deploy.sh` — ✅ Deploy OK, container recreated, health `{"status":"ok","database":"ok"}`
- Live verification (janebiarena.ir):
  - `GET /api/admin/analytics` (admin Bearer auth) → `salesTrend` present, 14 buckets. All zeros — **honest**: prod DB contains only 2 orders (`ORD-MTG13IPY-FOPU`, `ORD-MTG15YGU-KFQ0`), both `cancelled` — correctly excluded from the trend.
  - Live bundle hash `index-DPcNgX2n.js` matches local `dist/` exactly; live `Dashboard` chunk contains `salesTrend`; `/admin` → 200; `/api/health` → 200.

## Files changed
- `server/routes/admin.ts`
- `src/pages/admin/Dashboard.tsx`
- `src/pages/admin/Users.tsx`, `Settings.tsx`, `Coupons.tsx`, `Products.tsx`

## Notes
- Once real completed orders accumulate, the chart populates automatically from the same endpoint — no action needed.
- Trend day keys use server-local midnight (`toISOString().slice(0,10)` on UTC-shifted local midnight); consistent across buckets, fine for a 14-day relative trend.
