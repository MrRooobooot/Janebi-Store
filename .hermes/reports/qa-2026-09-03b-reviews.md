# QA Report — 2026-09-03b — reviews-pagination cluster (TEAM-QA)

Scope: `npm run verify` + live probes of https://janebiarena.ir (reviews pagination, empty-state, dual-engine console sweep, 390px overflow). Read-only QA; nothing committed or deployed.

## 0. Quality gate — `npm run verify`
```
$ npm run verify
✓ built in 356ms
  dist/server.cjs      230.2kb
✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)
```
exit_code: 0 → PASS (Typecheck + full Vitest suite + client/server build, all green).

## 1. Live bundle
```
$ curl -s https://janebiarena.ir/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
index-2CuGcgTU.js
```
Matches deploy commit 383f6cc bundle → PASS.

## 2. Reviews pagination API (product 1 — only product with reviews: total=2)
```
$ curl -s "…/api/products/1/reviews?page=1&limit=1"
p1: total 2, pages 2, ids ['rev-101']
$ curl -s "…/api/products/1/reviews?page=2&limit=1"
p2: total 2, pages 2, ids ['rev-102']
```
meta (total/pages) present; page 1 ≠ page 2 review sets → PASS.
Default limit probe: `page=2&limit=5` → `{"reviews":[],"total":2,"page":2,"pages":1}` — correct (only 1 page at limit≥2), page param honored.
UI pagination (src/components/ProductReviews.tsx, REVIEWS_PAGE_SIZE=6): Persian controls exist at lines 669–696 — `aria-label="صفحه‌بندی نظرات"`, "صفحه قبل/قبلی", "صفحه {page} از {pages}" (Persian digits), "صفحه بعد/بعدی". With 2 reviews (pages=1) the pager is correctly hidden in DOM (verified both engines). → PASS.

## 3. Reviews section + rating (product 1)
Both engines rendered reviews section and rating:
```
chromium P1: reviewsSection=true | ratingTexts=["۴.۵ از ۵ (۲ نظر)"]
webkit    P1: reviewsSection=true | ratingTexts=["۴.۵ از ۵ (۲ نظر)"]
```
→ PASS.

## 4. Product without reviews (product 2)
```
chromium P2: isNewBadge=true | emptyState=true | ratingShown=false
webkit    P2: isNewBadge=true | emptyState=true | ratingShown=false
```
'جدید' badge shown, Persian empty-state text present, no fabricated rating → PASS.

## 5. Dual-engine console sweep
Playwright WebKit + Chromium over `/`, `/products`, `/products/1`:
- WebKit: zero console errors on all three pages.
- Chromium: one `408` on `/products` and `/products/1` — traced to third-party `https://trustseal.enamad.ir/logo.aspx?...` (external Enamad trust-seal image), not app code. App-origin console errors: 0.
→ PASS (with noted third-party noise).

## 6. 390px viewport horizontal overflow (product page)
```
chromium viewport 390×844, /products/1:
horizontalOverflowPx = 0
```
→ PASS.

## Verdict: 6/6 PASS
Notes: only product 1 has reviews (2 total), so UI pager renders only when pages>1 — behavior is correct by design; Persian pagination UI verified in component source and API meta verified live.
