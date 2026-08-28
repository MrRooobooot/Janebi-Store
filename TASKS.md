# TASKS.md — Janebi Store UI/UX & Quality Audit

## Status: Completed (Aug 28, 2026)

### 0. Automated Asset WebP/AVIF Image Pipeline & LCP Optimization
- [x] Implemented reusable `<PictureImage>` component supporting `image/avif`, `image/webp`, and SVG/PNG fallbacks.
- [x] Added `priority={true}` with `loading="eager"` and `fetchPriority="high"` for Hero and LCP banners.
- [x] Enforced explicit width/height and aspect ratios on product tiles and deal cards to eliminate CLS.
- [x] Integrated backwards compatibility into `SmartImage` and `BrandLogo` components.

### 1. Accessibility & WCAG AA Audit
- [x] Enforced strict 2px high-contrast focus rings with dark/light mode parity.
- [x] Standardized ARIA labels across navigation, header controls, product cards, wishlist, and compare buttons.
- [x] Accessible contrast helpers for muted text in both obsidian dark mode and light theme.
- [x] Full Persian RTL typographic alignment with self-hosted Vazirmatn font.

### 2. Design System Consistency
- [x] Unified Obsidian dark canvas (`#08090a`) and glassmorphic surface cards (`linear-card`).
- [x] Standardized border radius hierarchy (`rounded-2xl`, `rounded-3xl`) and shadow elevation.
- [x] Normalized button interactions with macOS-native inset depth (`raycast-btn`).

### 3. UX & Interaction Flow
- [x] Overhauled `EmptyState` component with responsive padding, spring animations, and action triggers.
- [x] Redesigned `ProductCardSkeleton` and `ProductDetailSkeleton` matching the card aspect ratios and borders.
- [x] Interactive touch targets meet or exceed 44px minimum touch criteria on mobile viewports.
- [x] Mobile bottom bar upgraded with enhanced touch area and active indicators.

### 4. Verification & Hardening
- [x] `npm run lint` — TypeScript check passed without errors.
- [x] `npm run test` — Unit test suite (285 tests) passing.
- [x] `npm run test:e2e` — Playwright end-to-end user flows verified.
- [x] `npm run build` — Production assets and bundles built cleanly.

---

## 🎯 Next Priority Backlog (Phase Next)

### Priority 1: Automated Asset WebP/AVIF Image Pipeline
- [ ] Implement responsive image variants (`<picture>` with `.webp` / `.avif` fallbacks) for high-DPI displays.
- [ ] Add preloading hints for LCP brand carousel and hero banner images.

### Priority 2: Full PWA & Offline Support
- [ ] Add Web App Manifest and Service Worker caching for domestic offline browsing.
- [ ] LocalStorage cache for static catalogue with background SWR sync.

### Priority 3: Iranian Payment Gateways Auto-Failover
- [ ] Implement seamless fallback between Zarinpal and Shaparak/Saman gateways on gateway outage.
