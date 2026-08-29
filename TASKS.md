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

### 5. Design Tokens & CSS Variables
- [x] Extracted hardcoded hex colors into standard CSS design tokens (`--color-surface-light/dark`, `--color-canvas-light/dark`, `--color-border-light/dark`, `--color-text-main-light/dark`).
- [x] Migrated 64+ React `.tsx` components to use `var(--color-...)` for background, borders, and text variables.
- [x] Tested across light and dark theme context switching securely without visual flash.

---

## 🎯 Next Priority Backlog (Phase Next)

- [x] Full automated visual & design audit across all storefront & admin routes via `browser_exec`.
- [x] Zero horizontal scroll (CLS/Overflow) verified on all 16 core pages.
- [x] Fixed interactive ARIA labels and button touch targets across Header, Footer, and ChatWidget.
- [x] Purged legacy mock/test images from DB and verified vector SVG rendering parity.
- [x] Strict brute-force rate-limiting on all authentication, reset-password, and SMS OTP endpoints with automated test suite (`tests/unit/rate-limiting.test.ts`).

### Priority 2: Full PWA & Offline Support
- [x] Add Web App Manifest (`manifest.webmanifest`) with `dir="rtl"`, standalone mode, and responsive vector icons (192px / 512px).
- [x] Implement Service Worker (`sw.js`) with Stale-While-Revalidate for catalogue APIs, Cache-First for static assets/fonts, and Offline fallback.
- [x] Registered Service Worker lifecycle in `main.tsx` and linked manifest in `index.html`.

### 3. Iranian Payment Gateways Auto-Failover
- [x] Implemented unified `IPaymentGateway` interface and adapter architecture (`ZarinpalAdapter`, `SamanAdapter`).
- [x] Built resilient `PaymentFailoverRouter` with Circuit Breaker (CLOSED / OPEN / HALF_OPEN states) and consecutive failure tracking.
- [x] Integrated failover dispatch with Idempotency Key header support and atomic order restock / VIP refund rollback.
- [x] Authored unit test suite in `tests/unit/payment-failover.test.ts` verifying auto-switch to Saman when Zarinpal times out.

### 4. Hardcore Adversarial Verification Harness & Invariants
- [x] Created consolidated verification pipeline (`scripts/verify-all.sh`) and unified `npm run verify` command (Strict Typecheck + Vitest + Full Build).
- [x] Implemented comprehensive transactional invariants and Persian input edge-case test suite (`tests/unit/concurrency-invariants.test.ts`).
- [x] Locked profile `code-pro` (`SOUL.md`) to zero-sycophancy and mandatory `npm run verify` enforcement on Janebi Arena.
- [x] Full Production Readiness Documentation & System PRD (`AGENTS.md`, `PROJECT_AUDIT.md`, `PROJECT_GRAPH.md`).
- [x] Verified full verification pipeline (`npm run verify`): 36 test files (297 tests passed), TypeScript clean, Vite client and Esbuild server compiled successfully.
