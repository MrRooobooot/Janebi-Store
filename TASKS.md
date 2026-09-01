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
- [x] P1: SW default branch cache-first traps — FIXED (SW v1.1.0 network-first default, CACHE bumped; P0 verified live).
- [x] P1: `schema.pg.ts` missing `blog_posts` — FIXED (blogPosts pgTable present, schema.pg.ts:155; indexes 0005 SQLite+PG shipped).
- [x] P1: `llms.txt`/`pricing.md` fabricated stats — FIXED (regenerated from live API, verified on prod).
- [x] P2: scratch tables + 9 test coupons — CLEANED (backup janebi-pre-hygiene-1788234770.db, prod re-verified Sep 1); manifest colors, JSON-LD escape, coupon usageLimit, VACUUM INTO backup — all shipped (cluster B).

## Status: Remediation committed (Sep 1, 2026)
- [x] P0 fixes committed: payment-reaper + `orders.created_at` + indexes (0005 SQLite/PG), seed aggregates zeroed, fake client fallbacks removed (ProductCard default rating, ProductReviews DEFAULT_REVIEWS), SW default network-first v1.1.0, llms.txt/pricing.md regenerated from live API.
- [x] P0 verified live on janebiarena.ir: ratings now honest (product 1 → 4.5/2 real; others 0/0), SW v1.1.0, llms.txt real slugs/metadata.
- [x] P2 cluster A (Sep 1): coupon limiter (10/15min per-IP) + `usageLimit`/`usedCount` schema (0006 SQLite+PG) + order-transaction redemption increment + admin create accepts `usageLimit`; prod DB hygiene: 5 scratch tables dropped, 9 stale test coupons deleted (4 real coupons remain); `deploy.sh` now docker-cps `drizzle/` into container.
- [x] P2 cluster B (Sep 1): admin backup via `VACUUM INTO` (consistent WAL-safe snapshot, temp file streamed + cleaned); manifest theme colors synced to Kinetic Commerce palette; JSON-LD breadcrumbs `<` escape; dead `/api/reviews/latest` route removed; OTP feature-gated (`SMS_API_KEY`/`SMS_PROVIDER` env → `GET /api/auth/otp/status`; Login hides OTP tab; `/otp/send` 503 in prod without provider). Live-verified: otp/status `{"enabled":false}`, send=503, reviews/latest=404, manifest new colors, Playwright live flow browse→product→cart→checkout passed with honest rating «۴.۶ از ۵ (۲ نظر)» on product 1.
- [x] Repo hygiene: sketches/, firebase legacy (.firebaserc/.firebase/firebase.json), metadata.json, .neural_graph.json removed; SECRETS_MAP.md local-only (gitignored).

## Status: Prod DB hygiene verified (2026-09-01) — orchestrator round
- [x] Scratch/test tables: census on prod shows ZERO of the 5 audit-listed tables (already purged with Aug-29 rebuild) — no DROP needed.
- [x] Coupons: only 4 real business coupons (WELCOME10/OFF20/SUMMER30/JANEBI100); the 9 stale E2E coupons do not exist — no action needed.
- [x] Migration 0005: prod had only 6/9 idx_* indexes (runner silently skipped 3 statements); missing idx_wishlist_items_user_id, idx_product_features_product_id, idx_contact_messages_status applied manually in-container; re-verified 9/9. integrity_check=ok.
- Evidence: .hermes/reports/backend-db-hygiene.md (commit 7a86682). Independent orchestrator probes: health ok, /api/coupons-active = 4 real coupons only, idx census 9/9.
- Follow-up: SQLite migration runner lacks journaling (`__drizzle_migrations` absent) — partial-application risk remains; track as P2.

## Status: Prod DB hygiene round 2 (2026-09-01, independent re-verification)
- [x] Line 88 P2 prod-DB portion re-verified: backup taken first (`/home/ubuntu/backups/janebi-pre-hygiene-1788234770.db`); sqlite_master census = ZERO scratch/test tables (`scratch_t`,`scratch_t2`,`s3`,`s4`,`mutex_t` absent); coupons = only 4 real marketing coupons (JANEBI100/OFF20/SUMMER30/WELCOME10), zero test coupons; live `/api/coupons-active` = same 4. Nothing to drop or deactivate.
- Evidence: .hermes/reports/backend-db-hygiene-round2.md

## Status: Migration journaling fixed (2026-09-01 round 2)
- [x] P2 follow-up DONE (commit f8b953f): `server/db/index.ts` journaled migrations — `__drizzle_migrations` (sha256/file, SQLite+PG), per-file transaction with journal insert inside the tx, loud failure (file+statement+error to stderr, abort) instead of the old empty-catch silent swallow; legacy backfill for existing prod DB. New tests/unit/migration-journal.test.ts (3 tests).
- [x] Gate: npm run verify — 37 suites / 300 tests PASS. Deployed via deploy.sh; prod verified: journal=7 entries (0000–0006), 9/9 idx_ indexes, integrity_check ok, health ok after keep-alive.
- [x] QA PASS (TEAM-QA, commit 33bf5c6): verify 37/300 green; live /api/health ok, /api/products 14 items, /api/coupons-active exactly 4 real coupons, bundle index-Du9A2uvd.js matches local build. Report: .hermes/reports/qa-2026-09-01-migration-journal.md.
- Next: §3.15 gaps (Permissions-Policy header, CSP report-uri), useStoreSettings fallback single-sourcing.

## Status: Headers + settings single-sourcing cluster DONE (2026-09-01 round 3)
- [x] Commit f95acbd + 7cffe99 (2026-09-01, QA PASS): hero slide imagery now settings-driven (`heroSlide1Image/2/3` in server DEFAULTS + admin PUT allow-list, zero visual change) — operator can change hero images without a deploy; homepage testimonials section `LatestReviews.tsx` consumes real `GET /api/reviews/latest` (hidden on empty/error); audit_logs table + audit-logged admin mutations (§3.7); blog hidden from sitemap while empty (§3.8/3.9). Deployed + live-verified.
- [x] QA (7c463d4): verify 37/300 green; live probes 200 on /,/products,/products/14,/login; csp-report 204; /api/settings byte-identical to defaults; PUT invalidation code-verified. FAIL item: `reportUris` → invalid CSP directive. Fixed in f2fb02c (`reportUri`), deployed; live header now `report-uri /api/csp-report` verified.
- Next: §3.14 LIKE wildcard escaping; §3.8/3.9 blog seed posts or hide nav; §3.7 admin audit-log table.

### §3.14 LIKE wildcard escaping (2026-09-01, QA PASS)
- [x] `server/utils/like.ts` `escapeLikePattern` (\ % _) + `containsLikePattern` با `escape '\\'` applied to title/category/brand search in `server/routes/products.ts` (commit 0393582) + `tests/unit/like-escape.test.ts` — gate 39 files / 306 tests PASS.
- [x] QA PASS (commit 9a77fd0, report `.hermes/reports/qa-like-escape.md`); deployed via deploy.sh (health ok); live probes: `?search=%25` → `[]` (literal), `?search=قاب` → real Nillkin results.

### OTP Dead-Feature Removal + DB Backup (2026-09-01, QA PASS)
- [x] OTP login/reset UI hidden (dead feature, no SMS provider); endpoints hard-503 in prod — live verified: `POST /api/auth/otp/send` → 503 «سرویس پیامکی فعال نیست»
- [x] JSON-LD `</script>` escape in ProductDetail (\u003c/\u003e/\u0026)
- [x] `scripts/backup-db.mjs` (`npm run db:backup`) — VACUUM INTO, keeps last 7
- Commits 741b1b5 + 30ef18f, deployed, live probes 200. QA: .hermes/reports/qa-2026-09-01-otp-hide.md

### P2 UI cluster (2026-09-01, QA PASS)
- [x] §3.9 filter reuse: shared `src/lib/productQuery.ts` buildProductQuery() — NewProducts (newest) + Offers (onlyDiscounted+discount-desc) use identical query params as Products (commit da2d470).
- [x] §3.10 iOS PNG icons: real rendered public/icon-192.png (2,812 B) + icon-512.png (6,668 B), manifest PNG-first + apple-touch-icon in index.html.
- [x] §3.8 hero 'فست' guard + §3.9 blog nav gating: already closed by earlier clusters (server DEFAULTS verbatim render; no blog links in storefront chrome) — verified no-op.
- [x] QA PASS (commit 3dbd58d): verify 39 suites/306 tests green; live probes 200, PNG bytes match repo, dual-engine 6 pages clean, zero horizontal overflow on 390px. Report: qa-2026-09-01-p2-ui-cluster.md. Deployed.
- Next: §3.12 contact messages archive policy; remaining P2s minimal.

### §3.12 Contact-messages archive policy (2026-09-02, QA PASS via orchestrator verification)
- [x] `archived` status (strict allow-list), `GET /api/admin/contact-messages ?status=` filter (archived hidden by default), auto-archive reaper (1h setInterval, transaction-guarded/idempotent, `ARCHIVE_AFTER_DAYS=90` in src/lib/constants.ts), admin Messages.tsx archive/unarchive + status pills (Persian RTL).
- [x] Commit adbcdc9 (6 files +303/−21), deployed via deploy.sh; bundle index-BplrxINR.js live == local; health ok. Orchestrator re-verified: 2 new test suites 13/13 pass; live admin probes — 430 rows default, archived=0, invalid filter 400, archive/unarchive roundtrip 200.
- Report: .hermes/reports/backend-contact-archive.md
- Next: audit priority list (§6) fully closed. Backlog EMPTY — cron reads reports for regressions only.
