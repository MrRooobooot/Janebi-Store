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
- [x] Verified full verification pipeline (`npm run verify`): 36 test files (297 tests passed), TypeScript clean, client & server builds valid.

## Status: Completed (Aug 30, 2026) — Prod-First Safari/WebKit Bug Sweep

### 6. Production Live Bug Fixes (all deployed to janebiarena.ir)
- [x] Fixed Safari `SyntaxError: Unexpected token '{'` on checkout entry: Persian-digit-aware live validation in `CheckoutRecipientForm.tsx` (`isValidIranianMobile`) + postal code `toEnglishDigits` (`c4cd855`).
- [x] Server-side order validator made nullable/optional-safe: `server/validators/index.ts` `orderSubmitSchema` (`c4cd855`).
- [x] Eliminated unnecessary `401` network calls from `/api/auth/me` + `/api/auth/refresh` on unauthenticated guest visits (`src/contexts/AuthContext.tsx`, `58f6de2`).
- [x] Guarded admin layout stats fetch against unauthenticated guest visits (`src/components/admin/AdminLayout.tsx`, `a79771c`).
- [x] Removed 4 unused image preloads (`products/hld-13.svg`, `brands/apple.svg`, `brands/samsung.svg`, `brands/anker.svg`) causing WebKit preload console warnings (`index.html`, `a73741c`).
- [x] Live verification: WebKit + Chromium on `/`, `/products`, `/checkout`, `/login` — 8/8 CLEAN (0 errors, 0 warnings, 0 failed 4xx/5xx requests); deployed via `deploy.sh`, health `{"status":"ok","database":"ok"}`.
- [x] Governance: PROD-FIRST + dual-engine (WebKit & Chromium) verification rules codified in `PROJECT_GRAPH.md` invariants.

## Status: Completed (Aug 31, 2026) — Build Integrity & Deep Forensic Audit

### 7. Build & Deploy Fixes
- [x] Removed `NODE_ENV=development` from `.env` — Vite 8 was shipping a dev-mode bundle to production (jsxDEV ×763, 30 local path leaks, +37% bundle size). Prod now `production mode`, bundle `index-fuFg16cz.js` verified `jsxDEV:0` on live (`8e170c2`).
- [x] Guarded `vite.config.ts` with explicit production NODE_ENV + `esbuild.drop: ['debugger']` (defense-in-depth; Vite 8 uses oxc over esbuild options).

### 8. Deep Forensic Audit (READ-ONLY — findings only, no code changed)
Full evidence, per-section scores /100, and remediation priorities: **`PROJECT_AUDIT.md` (2026-08-31 edition)**.

Key findings (P0 first):
- [!] Fake aggregate ratings/counts seeded in prod (`reviewsCount` up to 450 vs 2 real reviews) + client fallbacks (`DEFAULT_REVIEWS`, ProductCard `'۴.۸'` default) — must recompute & remove.
- [!] OTP login/reset dead in production (no SMS provider; code generated but never delivered).
- [!] No reaper for abandoned `pending_payment` orders → stock stays deducted.
- [ ] P1: SW default branch cache-first traps `/api/settings` etc.; `CACHE_NAME` never bumped; settings PUT doesn't invalidate appCache.
- [ ] P1: `schema.pg.ts` missing `blog_posts` (PG parity regression); zero secondary indexes (prod EXPLAIN = full scans).
- [ ] P1: `llms.txt`/`pricing.md` fabricated stats, wrong category slugs (7 dead links verified on live), phone/address conflicts across 3 sources.
- [ ] P2: scratch tables (`scratch_t`,`scratch_t2`,`s3`,`s4`,`mutex_t`) + 9 stale test coupons in prod DB; manifest theme colors predate palette migration; JSON-LD `</script>` escape; coupon usageLimit schema; admin backup should use `VACUUM INTO`.
