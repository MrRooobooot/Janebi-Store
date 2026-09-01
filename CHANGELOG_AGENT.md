## 2026-09-02 — OTP UI gating (audit P2: dead OTP in prod)
- Login.tsx fetches GET /api/auth/otp/status on mount; enabled=false hides OTP login tab + OTP reset path (Persian notice), fail-safe = hidden on fetch error.
- New src/lib/otp.ts resolver + tests/unit/login-otp-gate.test.ts. npm run verify green; jsxDEV=0, no /Users/ leaks.
- Deployed: c11f9ca; live /api/auth/otp/status={"enabled":false}, bundle Login-D0G6tgAE.js contains gate, health ok.

# CHANGELOG_AGENT.md — Janebi Store Agent Work Log

## [2026-09-02] - §3.15 Hardening Cluster (headers + settings single-sourcing)
- **CSP report-uri via env (`1cd3b12`):** `server/app.ts` Helmet CSP now emits the legacy `report-uri` directive ONLY when `CSP_REPORT_URI` is set in the environment (no placeholder URL in code). Modern `report-to` transport (per-request `Reporting-Endpoints` header + rate-limited internal `/api/csp-report` 204 sink) stays active unconditionally.
- **Settings fallback single-sourcing (`1cd3b12`):** remaining duplicated `'جانبی آرنا'` literals in `src/pages/ProductDetail.tsx` (JSON-LD seller name, share title) replaced with `STORE_SETTINGS_DEFAULTS.storeName` from `src/lib/constants.ts` — the same single source the server and `useStoreSettings` already use. Zero behavior change.
- **Permissions-Policy (pre-existing, live-verified):** header was already shipped in the earlier headers cluster; aligned to spec `payment=(self)` (commit `b7e3d82`, 2026-09-02) — live header now `camera=(), geolocation=(), microphone=(), payment=(self), usb=(), interest-cohort=()`.
- **Re-deploy + re-verify (b7e3d82):** `npm run verify` ALL PASS (tsc strict + 319 tests + builds + post-build audit). Deployed via `./deploy.sh` (health ok). Live evidence: `curl -sI https://janebiarena.ir | grep -i permissions-policy` shows `payment=(self)`; `/api/health` 200.
- **Quality gate:** `npm run verify` 100% PASSED (tsc strict + Vitest + builds + post-build audit). Deployed via `./deploy.sh` (health ok). Live evidence 2026-09-02: Permissions-Policy header present on janebiarena.ir, `/api/health` 200, homepage bundle hash changed (`index-8xinYUga.js`). TASKS.md §3.15 marked closed.

## [2026-09-01] - Remediation Commit, Skill Refactor & Repo Hygiene
- **Uncommitted remediation landed (Aug 31 wave):** payment-reaper (`server/routes/payment.ts` — 5min interval, 60min abandoned `pending_payment` cutoff with legacy base36-id fallback, transaction-guarded restock + VIP refund), `orders.created_at` column + SQLite/PG migrations (`drizzle/*/0005_order_created_at_indexes.sql` + secondary indexes), seed fake aggregates zeroed (`seed-data.ts` rating/reviewsCount → 0), SW default branch network-first with cache bump v1.1.0 (`public/sw.js`), llms.txt/llms-full.txt/pricing.md regenerated from live API, admin settings doc anchor, ProductCard '۴.۸' fallback removed, ProductReviews fake list removed.
- **Quality gate:** `npm run verify` 100% PASSED (tsc strict + full Vitest suite + Vite client & Esbuild server build); post-build artifact audit `jsxDEV:0`, `/Users/` leaks:0.
- **Skill refactor (Hermes profile):** recreated lost `iran-ecommerce-storefront-engineering`, added Related-Skills routing to `janebi-arena-production-readiness`, de-Prisma'd `fullstack-project-audit` + `production-ready-fullstack-patterns`, corrected `production-readiness-verification` pitfalls to Janebi reality (mobile admin login, `/api/admin/stats`, `npm run verify`).
- **Repo hygiene (local + git):** removed dead artifacts from repo & disk — `sketches/` (3 design mockups, superseded by shipped design system), `firebase.json`/`.firebaserc`/`.firebase/` (legacy hosting, project uses Docker+VPS deploy), `metadata.json`, `.neural_graph.json`; local-only removals of stale `playwright-report/` + `test-results/`. `SECRETS_MAP.md` stays local (gitignored) as the ops credential map. `agent.md` + `docs/*-baseline.md` retained (still valid baselines).

## [2026-08-30] - Prod-First Safari/WebKit Bug Sweep & Live Verification

- **Checkout Validation Fix (`c4cd855`):** Resolved Safari `SyntaxError: Unexpected token '{'` on the checkout entry page by wiring live recipient validation to `isValidIranianMobile` + `toEnglishDigits` in `CheckoutRecipientForm.tsx` / `useCheckoutForm.ts`; `server/validators/index.ts` `orderSubmitSchema` made nullable/optional-safe for optional order fields.
- **Auth Noise Reduction (`58f6de2`):** Eliminated unnecessary `401` network calls from `/api/auth/me` and `/api/auth/refresh` for unauthenticated guest visits in `src/contexts/AuthContext.tsx`.
- **Admin Guest Guard (`a79771c`):** Admin layout stats fetch now skipped for unauthenticated guest visits in `src/components/admin/AdminLayout.tsx`.
- **WebKit Preload Warnings (`a73741c`):** Removed 4 unused image preloads (`products/hld-13.svg`, `brands/apple.svg`, `brands/samsung.svg`, `brands/anker.svg`) from `index.html` that triggered Safari console warnings.
- **Dual-Engine Live Verification:** Playwright WebKit + Chromium sweep of `/`, `/products`, `/checkout`, `/login` on production — 8/8 CLEAN (0 console errors/warnings, 0 failed requests). `npm run test` 297/297, `tsc --noEmit` clean, build OK, deployed via `deploy.sh`, health `{"status":"ok","database":"ok"}`.
- **Governance:** PROD-FIRST + dual-engine (WebKit & Chromium) verification rules codified as invariants in `PROJECT_GRAPH.md`.

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

## 2026-09-02 — Admin dashboard sales trend + admin form digit consistency (625d33c)
- `GET /api/admin/analytics` now returns `salesTrend` (14 daily buckets of real completed-order revenue/counts; `created_at` first, `ORD-<base36>` id fallback for legacy rows). Zero fabricated data.
- Admin Dashboard: full-width dual-theme bar chart (pure CSS, Persian day labels, formatPrice/toPersianDigits tooltips, honest empty state).
- Digit consistency: admin numeric inputs (Users VIP points, Settings free-shipping threshold, Coupons discount value, Products discount/stock) moved from `type=number` to `text+inputMode=numeric` with `toEnglishDigits` normalization; Coupons percent>99 guard added.
- Gates: `npm run verify` PASS; artifact audit clean (jsxDEV=0, no /Users/ leaks); `./deploy.sh` OK; live verified on janebiarena.ir (analytics endpoint returns 14-bucket trend — currently all zeros, honest: only 2 cancelled orders exist in prod).
- Report: `.hermes/reports/orchestrator-2026-09-02-sales-trend.md`
