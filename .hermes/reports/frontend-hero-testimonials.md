# Frontend: Hero settings-driven imagery + Real testimonials (audit §3.5/§3.6)

## Changes

### 1. Hero guard hack (audit §3.6)
- Searched `src/` for the client-side content hack `settings.heroSlide1Title && !settings.heroSlide1Title.includes('فست')` — it is **no longer present** in the codebase (appears to have been removed in an earlier round). Home.tsx already renders whatever the settings API returns with `||` fallback to `STORE_SETTINGS_DEFAULTS`. No guard-hack code was reintroduced; confirmed zero matches for `includes('فست')` across `src/`.

### 2. Hero slide image settings fields (audit §3.6)
- `src/hooks/useStoreSettings.ts`: added optional `heroSlide1Image`, `heroSlide2Image`, `heroSlide3Image` to the `StoreSettings` interface.
- `src/pages/Home.tsx`: each hero slide's `image` now consumes `settings.heroSlideNImage` when present, falling back to the existing hardcoded asset paths (`/products/hld-13.svg`, `/products/cas-4.svg`, `/products/cbl-1.svg`) so nothing breaks before the backend settings fields deploy.

### 3. Real homepage testimonials (audit §3.5)
- New `src/components/LatestReviews.tsx`: fetches `GET /api/reviews/latest`, renders an RTL Persian card grid (3 cols desktop / 2 tablet / 1 mobile) consistent with existing home sections (zinc tokens, rounded-2xl cards, orange hover accent, Lucide icons only).
- Defensive rendering: `rating` clamped to 1–5 (star row omitted when absent/invalid), `userName` falls back to "کاربر جینبی", `productTitle`/`comment` omitted when absent, `createdAt` formatted via `Intl.DateTimeFormat('fa-IR')` (Persian digits, null-safe).
- Zero fabricated data: renders **nothing** while loading, on error, on non-array payload, or when the array is empty.

## Gate
- `npm run verify` → ✅ ALL HARDCORE QUALITY GATES PASSED (typecheck, 306 tests / 39 suites, full build).

## Files
- Modified: `src/hooks/useStoreSettings.ts`, `src/pages/Home.tsx`
- Added: `src/components/LatestReviews.tsx`
- Server files untouched (backend agent owns DEFAULTS + `/api/reviews/latest`).
