# CHANGELOG_AGENT.md — Janebi Store Agent Work Log

## [2026-08-28] - Storefront Accessibility, Design System & UX Hardening

### Added
- Payment Gateway Architecture & Auto-Failover Router (`server/services/payment/`) with Circuit Breaker support across Zarinpal and Saman/Shaparak.
- Unit tests (`tests/unit/payment-failover.test.ts`) validating automated failover routing, authority resolution, and Circuit Breaker state tracking.
- Progressive Web App (PWA) manifest (`manifest.webmanifest`) with standalone display, Persian metadata, RTL orientation, and vector icons.
- Service Worker (`sw.js`) providing Cache-First static asset delivery, Stale-While-Revalidate for catalogue APIs, and offline fallback.
- `<PictureImage>` responsive `<picture>` component with automatic AVIF/WebP resolution, cache-busting, and CLS protection.
- Standardized `.min-touch-target` class enforcing 44px minimum interactive boundaries for mobile accessibility.
- Enhanced `EmptyState` component with responsive padding, smooth spring entrance animations, and high-contrast primary CTA buttons.
- Linear/Raycast-inspired glassmorphic styling for `ProductCardSkeleton` and `ProductDetailSkeleton` matching live UI components.

### Changed
- Refactored `index.css` to enforce WCAG AA-compliant high-contrast focus rings (`:focus-visible`) across light and dark themes.
- Updated `ProductCard.tsx` with discrete ARIA labels on Wishlist and Compare toggle buttons, expanding touch hitboxes to 36x36/44x44px.
- Upgraded `Header.tsx` accessibility tags and compare count badge attributes.
- Improved `ToastContext.tsx` with `role="alert"` and `aria-live="assertive"` for screen reader announcements.
- Enhanced `MobileBottomNav.tsx` touch padding and accessible navigation labels.

### Verified
- `npm run lint`: 0 errors.
- `npm run test`: 32 test suites passed (285 tests).
- `npm run test:e2e`: 3 core Playwright tests passed.
- `npm run build`: Production client and server build succeeded.
