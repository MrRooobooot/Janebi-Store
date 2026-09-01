# Frontend P2 UI Cluster — Audit §3.8 / §3.9 / §3.10

**Date**: 2026-09-01 · **Scope**: frontend + public/ only

## Findings vs. tasks

### §3.8 Hero title content hack — ALREADY CLEAN
- Searched all of `src/` for the `includes('فست')` guard and any hardcoded replacement of
  `heroSlide1Title`: **no occurrence exists**. Home.tsx hero slides render
  `settings.heroSlide1Title || STORE_SETTINGS_DEFAULTS.heroSlide1Title` verbatim for all 3 slides
  (src/pages/Home.tsx lines 48, 60, 72).
- Server `DEFAULTS` (server/routes/settings.ts) merge `STORE_SETTINGS_DEFAULTS`
  (src/lib/constants.ts) which already carries proper Persian titles:
  - slide 1: `هولدرهای مگنتی خودرو و پایه‌های رومیزی ضدلغزش`
  - slide 2: `قاب‌های مگ‌سیف و گلس‌های سوپردی فول‌چسب`
  - slide 3: `کابل‌های کنفی تقویت‌شده و محافظ‌های فنری کابل`
- No code change needed; any operator-entered value is shown verbatim.

### §3.9a Blog nav gating — ALREADY CLEAN
- `grep -i "blog|مجله"` across Header.tsx, MobileBottomNav.tsx, Footer.tsx: **zero nav links to
  /blog exist anywhere in the storefront chrome** (only DynamicBreadcrumbs label mapping and the
  lazy route in App.tsx). Nothing to hide; server-side sitemap gating landed earlier
  (commit f95acbd). No layout-shift risk since no link is rendered.

### §3.9b Filter/sort logic reuse — DONE
- New shared util **`src/lib/productQuery.ts`**: `buildProductQuery()` is the single source of
  truth mapping filter state → `/api/products` query params (category/search/brands/minPrice/
  maxPrice/inStock/hasDiscount/sort/page/limit), with the same `'همه'`-sentinel and
  `'default'`-sort rules the Products page used.
- `src/hooks/useProductFilters.ts` now builds its cache key via `buildProductQuery(...)` —
  byte-identical param output, so Products page behavior is unchanged.
- `src/pages/static/NewProducts.tsx` fetch → `` `/api/products?${buildProductQuery({ sortBy: 'newest' })}` ``
  (was hardcoded `?sort=newest`).
- `src/pages/static/Offers.tsx` fetch → `` buildProductQuery({ onlyDiscounted: true, sortBy: 'discount-desc' }) ``
  (was hardcoded `?hasDiscount=true&sort=discount-desc`). Sort keys are now shared constants
  of the same mapping used by Products — drift impossible.

### §3.10 iOS Add-to-Home-Screen PNG icons — DONE
- Real rendered PNGs rasterized from `public/icon-512.svg` with ImageMagick 6 (`magick -background
  none ... PNG32:`), committed as:
  - `public/icon-192.png` — PNG image data, 192 × 192, 8-bit RGBA — **2,812 bytes**
  - `public/icon-512.png` — PNG image data, 512 × 512, 8-bit RGBA — **6,668 bytes**
- `public/manifest.webmanifest`: PNG 192/512 entries added first (SVG kept as fallback).
- `index.html`: `apple-touch-icon` now `type="image/png" href="/icon-192.png"` (iOS ignores SVG).

## Verification

- `npm run verify` → **EXIT=0** — `✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)`
  (strict tsc + full vitest suites + Vite client build + esbuild server bundle).
- Post-build guards:
  - `grep -c jsxDEV dist/assets/index-*.js` → **0**
  - `grep -c '/Users/' dist/assets/index-*.js` → **0**

## Files changed

- src/lib/productQuery.ts (new)
- src/hooks/useProductFilters.ts
- src/pages/static/NewProducts.tsx
- src/pages/static/Offers.tsx
- public/icon-192.png (new), public/icon-512.png (new)
- public/manifest.webmanifest, index.html
