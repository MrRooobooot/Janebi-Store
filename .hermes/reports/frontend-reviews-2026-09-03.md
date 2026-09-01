# Frontend Reviews Pagination + UX — 2026-09-03

**Commit**: `383f6cc1d8e507bedae3c416cb0f5ca1ef1e26bd` → `origin/main`
**Verify**: `npm run verify` fully green — tsc clean, 44 test files / 337 tests passed, client+server build OK, post-build audit `jsxDEV=0`, `/Users/=0`.

## Backend — `server/routes/products.ts`
- `GET /api/products/:id/reviews` now supports pagination:
  - With `?page=` and/or `?limit=` → returns `{ reviews, total, page, pages, limit }`.
  - Defaults: limit 6 (clamped to ≤50), page clamped into `[1, pages]`; invalid values fall back to sane defaults.
  - Ordering: newest first (`desc(date), desc(id)`).
- **Backward compatibility preserved**: without query params the endpoint still returns the plain array (all existing tests/clients unchanged), now also sorted newest first.

## Frontend — `src/components/ProductReviews.tsx`
- Fetches `/reviews?page=N&limit=6`; handles both paginated object and legacy array shapes.
- Persian pagination controls (Prev/Next, `صفحه x از y` via `toPersianDigits`), 44px min touch targets, focus rings, `aria-label`s, `aria-live` page indicator.
- Loading state via existing `ReviewSkeleton` skeletons; header total now uses server `total`.
- Submitting a review refreshes to page 1 (newest-first).

## Tests — `tests/api/reviews.test.ts`
New describe block (6 tests): shape `{reviews,total,page,pages}`, newest-first ordering, page slicing, partial final page + out-of-range clamping, invalid param defaults, legacy array shape without params.

## Not done
- Deployment (as instructed — do NOT deploy).
