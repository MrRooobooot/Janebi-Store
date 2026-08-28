# CHANGELOG_AGENT.md — Janebi Store Agent Work Log

## [2026-08-29] - Brand Identity Overhaul, E2E Contract Suite & Security Defense Hardening
- **Brand Identity & Typography:** Upgraded brand logo and typography across Header, Footer, and Admin panel using vibrant orange/amber gradients, hover micro-interactions, and monospace bilingual tags.
- **Enforced Rate-Limiting:** Secured `/api/auth/otp/send`, `/api/auth/otp/verify`, and `/api/auth/reset-password` against SMS and credential brute-force attacks via rate-limit middleware and automated verification in `tests/unit/rate-limiting.test.ts`.
- **E2E API Contract Parity:** Created comprehensive test suite `tests/api/frontend-backend-parity.test.ts` verifying all public catalogue, user authenticated flows (cart, wishlist, orders), and admin management endpoints.
- **Automated Visual & A11y Audit:** Executed full browser audit via `browser_exec` across all 16 core storefront and admin routes; confirmed 0 horizontal overflows (CLS/x-scroll) and standard WCAG AA ARIA labeling on all interactive controls.
- **High-DPI Responsive Image Pipeline:** Integrated 1x/2x srcset generation in `<PictureImage>` and added asset preloading hints in `index.html` for LCP optimization.
- **Quality Gates:** 36 test files (297 tests) passing 100% with strict TypeScript validation and successful production deployment to `janebiarena.ir`.

## [2026-08-29] - Hardcore Adversarial Verification Harness & Invariant Guard
- Added unified adversarial verification pipeline in `scripts/verify-all.sh` wired to `npm run verify` (`tsc --noEmit` + `vitest run` + client/server production build).
- Implemented `tests/unit/concurrency-invariants.test.ts` verifying Persian unicode/mobile normalization, invalid edge cases, and zero-negative-stock transactional invariants.
- Configured and linked profile `code-pro` (`SOUL.md`) with explicit engineering invariants and adversarial quality gates for Janebi Arena.
- Verified 33 test files (291 passing tests) with 100% build and type-safety clean.

## [2026-08-28] - Storefront Accessibility, Design System & UX Hardening

### Added
- CSS Design Tokens (`--color-surface`, `--color-canvas`, `--color-border`, `--color-text`) implemented natively in `index.css` via Tailwind 4 variables.
- Payment Gateway Architecture & Auto-Failover Router (`server/services/payment/`) with Circuit Breaker support across Zarinpal and Saman/Shaparak.
- Unit tests (`tests/unit/payment-failover.test.ts`) validating automated failover routing, authority resolution, and Circuit Breaker state tracking.
- Progressive Web App (PWA) manifest (`manifest.webmanifest`) with standalone display, Persian metadata, RTL orientation, and vector icons.
- Service Worker (`sw.js`) providing Cache-First static asset delivery, Stale-While-Revalidate for catalogue APIs, and offline fallback.
- `<PictureImage>` responsive `<picture>` component with automatic AVIF/WebP resolution, cache-busting, and CLS protection.
- Standardized `.min-touch-target` class enforcing 44px minimum interactive boundaries for mobile accessibility.
- Enhanced `EmptyState` component with responsive padding, smooth spring entrance animations, and high-contrast primary CTA buttons.
- Linear/Raycast-inspired glassmorphic styling for `ProductCardSkeleton` and `ProductDetailSkeleton` matching live UI components.
- Real-time customer savings calculator badge in `ProductDetail.tsx` and stock urgency FOMO badge on `ProductCard.tsx`.
- Sticky filter and sort header in `ProductSortHeader.tsx` with glassmorphic backdrop blur on catalog pages.
- Localized Persian typography for `FreeShippingBar.tsx` progress percentage and thresholds.

### Changed
- Massive refactoring of 64+ React `.tsx` components, replacing hardcoded hex colors (`bg-white`, `bg-gray-50`, `dark:bg-gray-900`) with native semantic CSS design tokens.
- Refactored `index.css` to enforce WCAG AA-compliant high-contrast focus rings (`:focus-visible`) across light and dark themes.
- Updated `ProductCard.tsx` with discrete ARIA labels on Wishlist and Compare toggle buttons, expanding touch hitboxes to 36x36/44x44px.
- Upgraded `Header.tsx` accessibility tags and compare count badge attributes.
- Improved `ToastContext.tsx` with `role="alert"` and `aria-live="assertive"` for screen reader announcements.
- Enhanced `MobileBottomNav.tsx` touch padding and accessible navigation labels.

### Verified
- `npm run lint`: 0 errors (clean TypeScript compilation).
- `npm run test`: 32 test suites passed (288 tests).
- `npm run build`: Production client and server build succeeded.
- Live VPS deployment (`janebiarena.ir`): 200 OK, healthy DB, zero downtime.
