# ARCHITECTURE & PROJECT GRAPH — JANEBI ARENA

> **Autonomous Engineering Knowledge Base & Live System Map**
> **Last Verified & Updated:** 2026-09-16 (security rounds SEC-H1..H6 + repo tidy: CORS/X-Forwarded-Host trust removed, nginx API-cache poisoning closed, health telemetry gated, CSP `http:` image source dropped, JWT localStorage mirror deleted → cookie-only sessions)
> **Status:** Live; operational safeguards need remediation (read-only audit 2026-09-17: `docs/OPS-CONFIG-AUDIT-2026-09-17.md`). Historical gate: 58 suites / 447 passing tests, not rerun by this audit; served `BUILD_INFO` is the deployment truth.
> **PRD Reference:** `AGENTS.md` | `PROJECT_AUDIT.md` | `TASKS.md`
> **Repo layout:** scripts grouped by purpose → `scripts/README.md`; docs index → `docs/README.md` (dated one-off reports live in `docs/archive/`).

---

## Real inventory: MCdodo cables (2026-09-19, commit b450c8d — DB-only, no deploy)
- 7 Mcdodo Lightning cables added to prod via admin API (in-container short-lived owner JWT): ids 5633–5639, SKUs CA-5261/3581/3580/7271/7270/2261/2260, prices 875k/635k/545k/475k/475k/410k/335k تومان, category «کابل و سیم», stock 10. Full ledger: `docs/REAL-INVENTORY-2026-09-19.md`.
- Prod catalogue now **45 products, 2 categories** («کابل و سیم» + «هولدر و نگهدارنده»). Pre-write backup: `/home/ubuntu/backups/janebi-pre-mcdodo-20260919-190933.db`.
- Images sourced from exact-model marketplace listings, store-watermarked candidates rejected via vision QA, normalized square white-canvas WebP ≤54 KB, shipped to BOTH `public/images/products/` and `dist/images/products/`. Per-asset curl 200 ×7.
- Verified: X-Total-Count 45, per-SKU price compare clean, PDP/API/img 200 ×7, FTS «مک‌دودو»→7, dual-engine visible-image probe (chromium+webkit) 7/7 (`scripts/audit/mcdodo-live-probe.mjs` — visible-only filter; hidden 40×40 thumbs and below-fold lazy imgs MUST be excluded from naturalWidth assertions).



**Design-quality round (2026-09-18, commits 99dfb2b/955938c/312efe6 — deployed & live-verified).**
From the honest design audit: (1) **P0 SEO bug found & fixed** — `LEGACY_PRODUCT_REDIRECTS`
contained LIVE product ids (2..12): those PDPs 301'd to /products. Purged; new guard test
`tests/unit/legacy-redirects.test.ts` (map ids must never intersect the seed). (2) **Single h1
per page**: home now has one `sr-only` h1 OUTSIDE the hero carousel (slide titles = `<p>`,
rotation-safe); PDP h1 verified live (it always existed — earlier probe hit a 301'd id).
(3) **Token mirror law enforced**: 30 hardcoded dark-surface hexes (#0e1629/#0c1220/#0d121c/
#070b14/#121c33) in 11 TSX files replaced with `var(--color-surface-*)`. (4d) **Perf round (2026-09-18 late, commits 205225f/2a0708a — deployed & live-verified):**
(1) **motion/react eliminated from the eager tree** — 7 components (HeaderSearch dropdown,
ChatWidget panel, CartDrawer slide, MobileBottomNav pill/badges, RecentlyViewed +
VipClubBanner reveals, EmptyState) now use CSS keyframes (`.dropdown-in/.pop-in/
.drawer-slide-in/.fade-in/.reveal-in-view` in index.css, reduced-motion aware). The
`vendor-motion` manualChunk was REMOVED: pinning it made rolldown place the shared
jsx-runtime in the motion chunk, forcing the whole 130KB engine into the eager payload
(verified: index statically imported vendor-motion). After: motion loads only in lazy
chunks (PDP etc.); eager JS 551KB → 413KB raw (−25%). Functional sweep (2 engines):
search dropdown / chat panel / cart drawer all open. (2) **FTS5 catalogue search** —
migration 0014 (`drizzle/sqlite/0014_products_fts.sql`): virtual table + insert/update/
delete triggers + backfill; route feature-detects FTS5 (`fts5Available` in db/index.ts)
with sanitized prefix-MATCH (`"tok"*` per token, LIKE fallback); 6 unit tests. Prod
verified: «ارلدام» 20 hits, «مگنتی» 1, multi-token «ارلدام مدل» 20 — the initial false
alarm («کابل» → 0) was a correct empty result: prod catalogue has no کابل product.
(3) **Cache layer = deliberately NOT added (YAGNI):** the stack already has in-memory
appCache (60s TTL + invalidation on admin mutations, order events), browser
Cache-Control (30–60s), and nginx 15s API cache; measured TTFB 0.53–0.66s is
network-dominated (app latency ~1ms per /api/health).
(4c) **H2 rhythm (commit ed57892 — deployed & live-verified):** all home section H2s
unified to `text-lg sm:text-2xl` (18px mobile / 24px desktop) — deals, categories,
trending, latest-reviews. Probe: desktop home H2 = 24px×4 uniform (VipClub banner 36px
by design, it is a display headline). Remaining P3 backlog (deliberate, needs user
decision): typed `src/design/tokens.ts` UI kit; vendor-motion chunk (130KB, eager via
Layout tree — CSS-able uses: HeaderSearch dropdown, ChatWidget, CartDrawer, BottomNav
layoutId, 2× whileInView fades).
(4b) **UX round (commit 861d328 — deployed & live-verified):** theme toggle added to
MobileBottomNav center slot (was buried in hamburger drawer — user-discoverable now);
announcement bar mobile text 10/11px → 11/12px (readability floor); topbar hex → token.
Focus-ring probe (Tab sweep, both themes): global `:focus-visible` rose ring renders on
every interactive element — the audit's "weak focus coverage" claim was a false positive
(rules are global in index.css, not per-component).
(4) **Neutral family
unified per file**: gray/zinc/slate tri-mix in 16 files → single majority family each (186
class replacements). Gates: tsc clean, 476/481 tests, design-audit 16/16 PASS, live sweep
(2 engines × 4 pages): h1=1 (except /cart), 0 broken imgs, 0 console/HTTP errors.

**Backend remediation (2026-09-18).** Vitest now uses isolated in-memory SQLite; destructive persistent-DB teardown removed. Consolidated gate: 475 pass / 5 optional PG skips (61 files, incl. payment-callback regression). **PG application parity proven:** all 16 real-router order/rollback/payment-callback tests pass on an isolated disposable PostgreSQL cluster. Payment gateways liveness-verified on prod (Zarinpal code 100, 454 ms; Saman 200); SMS.ir template path accepted (status 1). Exact price assertions reject previously surviving mutations. `jsonFetch` reads failure bodies once. Payment E2E passes both engines; external Enamad 501 attributed by trace and excluded by origin, not status. Full attributed browser run after scoped sync fix: **86/86 passed, 0 flaky, Chromium+WebKit**. Deployment verified separately below. See `docs/BACKEND-REMEDIATION-2026-09-18.md`.

**Historical test validity audit (2026-09-17).** Full gate: 450 pass / 5 PG skips (58 files).
Two price-display mutations survived all 35 related utility tests; digit-mapping
mutation was caught by 4. Guest smoke exit propagation fixed and verified with
an empty local page (failure exit 1) and live dual-engine positive control.
Full E2E attempt failed and was stopped; isolated home WebKit reruns passed,
so full-suite stability remains unverified. See `docs/TEST-VALIDITY-AUDIT-2026-09-17.md`.

**Read-only ops audit (2026-09-17, supersedes older operational assurances).**
Served `BUILD_INFO=c25a69e`; 24-hour nginx status parsing found 0 HTTP 5xx;
latest backup independently passes integrity/FK checks (38 products, 3 users,
1 order). Root disk is 82% used. `.env` and DB backups were readable by
`www-data`; live permission fix (`.env` 0600, backup directory 0700) blocked
both reads while preserving operator access. Open defects: running Docker log
limits are absent despite daemon config on disk; cron logs lack rotation;
monitor timestamp comparison and failed-alert retry are incorrect; backup
upload failure can still end with `backup OK`. No application deployment.
Details and scope limits:
`docs/OPS-CONFIG-AUDIT-2026-09-17.md`. Earlier claims that backup/monitor failures
cannot be silent are superseded; historical test counts are not a fresh gate.

**Structure.** `server/routes/admin.ts` (51 lines) is an entry point: router-wide
`authenticate` + `requireAdmin` then 11 sub-routers in `server/routes/admin/`.
`server/bot/bale.ts` keeps the `startBaleBot` handler monolith and imports its
shared pieces from `server/bot/bale/` (constants, types, session, media, catalog,
keyboards). Route bodies were sliced verbatim in both cases; only wiring differs.

**Performance.** `drizzle/sqlite/0013_hot_path_indexes.sql` (journal 14) added the
hot-path indexes proven by `EXPLAIN QUERY PLAN` on prod: `products(category)`,
`products(brand)`, `products(price)`, `orders(status, created_at)`. Before: the
category filter was a full `SCAN products` and a price-ordered page used a TEMP
B-TREE; after: `SEARCH … USING COVERING INDEX`. Catalogue search is still
`LIKE '%…%'` (no index can serve it) — an FTS5 table is the upgrade path once the
catalogue outgrows a few hundred rows.

**Hygiene.** `scripts/` is grouped by purpose (`gate/ audit/ ops/ data/ oneoff/`,
index in `scripts/README.md`); dated one-off reports live in `docs/archive/`
(index in `docs/README.md`); test tiers are indexed in `tests/README.md`.
Demo catalogue seeding is opt-in (`SEED_DEMO_DATA=1`) — no boot path may
fabricate products, reviews or coupons. `bale-worker/` is an unshipped worker
variant (see its README).

**Ops wiring (2026-09-17).** The DB is the only irreversible asset, so the VPS now
runs two managed cron entries, installed from the repo (`scripts/ops/install-cron.sh`
rewrites the block every run — host cron is NOT in git, and a moved script path
once killed monitoring silently):

```
30 2 * * *  ~/Janebi-Store/scripts/ops/backup-verify.sh        # snapshot + restore test + Bale upload
*/5 * * * *  python3 ~/Janebi-Store/scripts/ops/vps-monitor.py  # alerts to Bale
```

`backup-verify.sh` snapshots inside the container (`better-sqlite3 .backup()`,
WAL-consistent), then **proves the copy is usable**: ≥50 KiB, `PRAGMA
integrity_check = ok`, `foreign_key_check` empty, and a real read of the copy
(`products/users/orders/tables` counts). It uploads the file to both admin chats
on Bale (`sendDocument`; pin attempted, best-effort — private chats reject pinning)
and alerts on any failed step, so a backup cannot die quietly. Retention: newest 7
DB + 7 `.env` copies (the `.env` is deliberately NOT uploaded — it holds secrets).

`vps-monitor.py` alerts to Bale (plain text: Bale 500s on `parse_mode`) on: app
health, container state/`RestartCount`, disk ≥85%, ≥10× 5xx in 5 min from the nginx
access log, backup older than 30 h, and fatal container-log markers. A state file
gives one alert per incident + a 6-hourly reminder + a "recovered" message, so the
5-minute cron cannot spam.

**Security (same day).** CORS/X-Forwarded-Host trust removed (the header yielded a
credentialed `Access-Control-Allow-Origin` for any origin and poisoned nginx's
15-second API cache), health telemetry gated to in-host callers, CSP `http:` image
source dropped, JWT localStorage mirror deleted (cookie-only browser sessions),
nginx version banner off, sshd MaxAuthTries 3.

## 1. High-Level System Architecture & Flow

```
[ Client: React 19 + Vite + Tailwind v4 + Lucide + PWA ]
                      │ (HTTP REST / Cookies / JSON)
                      ▼
[ Server: Express 5 + Helmet + CORS + RateLimit + Pino ]
                      │
  ┌───────────────────┼───────────────────┐
  ▼                   ▼                   ▼
[ Auth & Users ]   [ Products & Cart ]  [ Orders & Payment ]
(JWT + Rotation)   (Filters/StockGuard) (Circuit Breaker Failover)
  │                   │                   │
  └───────────────────┼───────────────────┘
                      ▼
[ Data Layer: Drizzle ORM (Dual Schema: SQLite dev / PostgreSQL prod) ]
                      │
                      ▼
[ Database: SQLite (data/janebi.db) | Target: PostgreSQL 15 ]
```

---

## 2. Component & Module Matrix (Knowledge Graph)

### A. Core Backend Services & APIs (`server/`)
- **Server Entry:** `server/index.ts` (Express 5, middleware pipeline, static serving, graceful shutdown).
- **Database & Schema:** `server/db/schema.ts` (SQLite tables: `users`, `addresses`, `products`, `orders`, `orderItems`, `cartItems`, `wishlist`, `reviews`, `coupons`, `settings`, `contactMessages`, `newsletterSubscribers`).
- **Postgres Parity:** `server/db/schema.pg.ts`, `drizzle.pg.config.ts`, `docker-compose.yml`.
- **Authentication & Security:** `server/routes/auth.ts`, `server/middleware/auth.ts` (Bearer JWT, bcrypt password hashing, role-based access).
- **Payment & Failover Engine:**
  - Interface: `server/services/payment/IPaymentGateway.ts`
  - Adapters: `ZarinpalAdapter.ts`, `SamanAdapter.ts`
  - Router: `PaymentFailoverRouter.ts` (Circuit Breaker: CLOSED -> OPEN -> HALF_OPEN, auto-recovery).
- **Storefront & Admin APIs:**
  - `server/routes/products.ts` (Category/Brand/Price/Rating filtration, reviews recompute).
  - `server/routes/cart.ts` (Stock availability guard, max 10 quantity limit).
  - `server/routes/orders.ts` (Atomic `db.transaction`, stock decrements, VIP points unwind on cancel).
  - `server/routes/admin.ts` (entry point: router-wide `authenticate` + `requireAdmin`, then mounts 11 sub-routers under `server/routes/admin/` — `auditLogs`, `stats`, `users`, `products`, `orders`, `coupons`, `messages`, `reviews`, `newsletter`, `settings`, `backup`, plus `shared.ts` for the owner guard / pagination / audit writer).
  - `server/routes/coupons.ts` (Percentage / fixed discounts, minimum cart threshold).

### B. Frontend Architecture (`src/`)
- **App Shell & Routing:** `src/App.tsx`, `src/main.tsx` (React Router v7, React 19).
- **State & Contexts:** `CartContext.tsx`, `AuthContext.tsx`, `ToastContext.tsx`, `WishlistContext.tsx`, `CompareContext.tsx`.
- **Design Tokens & Theme:** `src/index.css` (Obsidian dark canvas `--color-canvas`, glassmorphic cards `--color-surface`, standard focus rings, expanded semantic brand scales `--color-primary-50..950`, accent tokens, elevation shadows `--shadow-elevation-1..3`, and brand glow filters).
- **Brand Identity & Vector Assets:** `src/components/Logo.tsx` (`Logo`, `LogoSymbol`), `public/favicon.svg`, `public/logo-fa.svg`, `public/logo-en.svg`, `public/logo-symbol.svg`, `public/icon-192.svg`, `public/icon-512.svg`.
- **Persian Normalization & Utils:** `src/lib/utils.ts` (`toPersianDigits`, `toEnglishDigits`, `normalizeIranianMobile`, `isValidIranianMobile`, `formatPrice`).
- **Checkout Validation:** `src/components/checkout/CheckoutRecipientForm.tsx` + `src/hooks/useCheckoutForm.ts` (live Persian-digit mobile & postal-code validation via `isValidIranianMobile`/`toEnglishDigits`).
- **PWA & Offline:** `public/manifest.webmanifest`, `public/sw.js` (Cache-first for assets, Stale-while-revalidate for API).
- **AI Search & Agent Readiness (AI SEO / AEO / GEO):**
  - `public/llms.txt` & `public/llms-full.txt` (Structured plain text store context and catalog for LLMs).
  - `public/pricing.md` (Machine-readable shipping rates, returns, and pricing policies).
  - `public/robots.txt` (Explicitly permits `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Bingbot`, `Applebot`).
  - `index.html` & `src/pages/ProductDetail.tsx` (Deep JSON-LD Graph Schema: `Organization`, `WebSite`, `Product`, `Offer`, `AggregateRating`).
  - `server/lib/breadcrumbs.ts` (Universal Prerender JSON-LD & Canonical link injection for `/products/:id`, `/product/:id`, `/blog/:slug`).
  - `server/lib/orderLifecycle.ts` (shared order-cancel data integrity: restock items + refund used VIP points — single source used by user-cancel, admin-cancel, failed-payment and payment-reaper paths; each caller keeps its own status guard/statusText/earn-clawback rules).
  - `server/app.ts` (Dynamic `X-Robots-Tag: noindex, follow` on search queries, `/cart`, `/login`, `/register`).
  - `server/index.ts` (Authentic HTTP 404 + noindex on non-existent product IDs; Soft 404 zero-tolerance).

---

## 3. Critical Invariants & Rules (Non-Negotiable)

1. **Transactional Stock & Checkout:** Always wrap order placement and cancellation in `db.transaction`. Stock must never go negative.
2. **Iranian Mobile & Persian Inputs:** Input phone numbers must strictly normalize to `09XXXXXXXXX` format using `normalizeIranianMobile`.
3. **Admin Security Gate:** All admin endpoints must be defended by `requireAuth` + `requireAdmin` (401/403).
4. **PROD-FIRST Rule:** Live `https://janebiarena.ir` is the reference, never local. User-reported errors are checked on production FIRST; after every fix: deploy + live test on the domain.
5. **Dual-Engine Browser Verification:** Valid live test = key pages + real flow (login/checkout/payment) on BOTH WebKit (Safari engine) and Chromium. Single-page headless Chromium load proves nothing; Safari-only errors are invisible to Chromium.
6. **Verification Requirement:** Every implementation turn must pass:
   ```bash
   npm run verify
   ```
   (Runs strict `tsc --noEmit`, all 353 Vitest unit/stress/concurrency tests across 48 suites, and full production build).

---

## 4. Live Test & Verification Topology (`tests/`)

- `tests/unit/concurrency-invariants.test.ts` (Stock race condition & Persian input invariants).
- `tests/unit/rate-limiting.test.ts` (Auth, login, reset-password, and OTP endpoint brute-force protection).
- `tests/unit/picture-image.test.tsx` (Responsive image pipeline, AVIF/WebP srcset and SVG priority rendering).
- `tests/api/frontend-backend-parity.test.ts` (End-to-End API contract parity for catalogue, user flows, and admin).
- `tests/unit/payment-failover.test.ts` (Payment gateway timeout switch & Circuit Breaker).
- `tests/unit/transaction-rollback.test.ts` (Atomic rollback on partial out-of-stock).
- `tests/concurrency/adversarial-stress.test.ts` (50 parallel shoppers for 1 unit of stock).
- `tests/api/` (`auth`, `admin`, `cart`, `products`, `orders`, `payment`, `reviews`, `users`, `coupons`).
- `tests/unit/phase1-foundation.test.ts` & `phase2-database.test.ts` (PostgreSQL parity & schema checks).
- **Live prod verification sweep (2026-08-30):** WebKit + Chromium on `/`, `/products`, `/checkout`, `/login` — 8/8 CLEAN (0 console errors/warnings, 0 failed requests).
- **authFetch token-recovery layer (2026-08-30):** `src/lib/api.ts` — single-flight 401→`POST /api/auth/refresh`→retry; all 41 Bearer call sites migrated (Profile, Cart/Wishlist/Auth contexts, checkout, OrderHistoryTab, PersonalInfoTab, ProductReviews, admin pages, AdminLayout, Dashboard). Server contract: refresh **without** cookie → `200 {authenticated:false}` (anonymous probe, no console noise); bad cookie → 401. Boot-time refresh in `AuthContext` unconditional (was dead code: `document.cookie.includes("refreshToken")` can never match an HttpOnly cookie). Access TTL 1d, refresh cookie 7d. Live-verified: stale-token orders flow recovers silently on Chromium + WebKit, anonymous home CLEAN.
- **Build-pipeline integrity (2026-08-31):** `.env` must NOT contain `NODE_ENV=development` — Vite 8/rolldown overrides its own build default and ships a dev bundle (jsxDEV transform, local file-path leaks, +37% size). Removed; prod bundle `index-fuFg16cz.js` verified jsxDEV:0 on live.
- **BrandShowcase marquee (2026-08-30):** dynamic track replication so half-track ≥ 2600px (never a seam/fast loop with few brands), fixed px/s speed, hover/focus pause (`BrandShowcase.tsx`, `index.css`).

## 5. Known Gaps & Debts (2026-08-31 Deep Audit → Sep 1 remediation)

Full evidence + remediation list: `PROJECT_AUDIT.md`. Highest-priority debts:
1. **Fake aggregate ratings — FIXED & COMMITTED (2026-09-01):** seed aggregates zeroed (`seed-data.ts`), client fallbacks removed (`ProductCard` default rating, `ProductReviews` fake list). Remaining: prod DB recompute of `products.rating/reviewsCount` from real `reviews`.
2. **OTP dead in prod — GATED (2026-09-01):** no SMS provider wired (`auth.ts`); `smsProviderEnabled` from `SMS_API_KEY`/`SMS_PROVIDER`; in production **all** OTP-driven endpoints (`/otp/send`, `/otp/verify`, `/reset-password`) return 503 `{error:'سرویس پیامکی فعال نیست'}`; dev/test keep the in-memory simulator flow. Add Kavenegar/Ghasedak adapter + env keys to re-enable.
3. **PG parity regression — FIXED (2026-08-31):** `blogPosts` added to `schema.pg.ts` (schema.pg.ts:152).
4. **Zero secondary indexes — FIXED & COMMITTED (2026-09-01):** migration `0005` (SQLite+PG) adds FK indexes: orders(user_id/created_at), order_items(order_id), reviews(product_id), cart_items(user_id), wishlist_items(user_id), addresses(user_id), product_features(product_id), contact_messages(status,created_at). Post-deploy: verify `PRAGMA table_info(orders)` has `created_at` + `EXPLAIN QUERY PLAN` no SCAN.
5. **SW default branch cache-first — FIXED & COMMITTED (2026-09-01):** default branch now network-first with cache-only-offline fallback; `CACHE_NAME`/`API_CACHE_NAME` bumped to v1.1.0 (old caches purged on activate).
6. **AI-SEO files — FIXED & COMMITTED (2026-09-01):** `llms.txt`/`llms-full.txt`/`pricing.md` regenerated from live API with real category slugs, real counts, unified store metadata.
7. **Prod DB residue — FIXED (2026-09-01):** 5 scratch tables dropped + 9 stale test coupons deleted in prod DB (4 real coupons remain: WELCOME10/OFF20/SUMMER30/JANEBI100). `deploy.sh` now also `docker cp`s `drizzle/` into the container (migrations previously only landed on host, not container — 0006 would have been skipped).
8. **Abandoned `pending_payment` orders — FIXED & COMMITTED (2026-09-01):** in-process reaper in `payment.ts` (5min interval, 60min cutoff, transaction-guarded restock + VIP refund, legacy NULL `created_at` falls back to base36 id timestamp; `orders.created_at` column added via migration 0005).
9. **Coupon hardening — FIXED (2026-09-01):** `coupons.usage_limit`/`used_count` columns (migration 0006 SQLite+PG, schema.ts + schema.pg.ts parity); order transaction increments `usedCount` and rejects exhausted codes («ظرفیت استفاده … تکمیل شده است»); validate endpoint enforces the cap too; per-IP `couponLimiter` (10/15min) on `/api/coupons`; admin create accepts `usageLimit`.
10. **Admin backup — FIXED (2026-09-01):** `/api/admin/backup` snapshots via SQLite `VACUUM INTO` into a temp file (consistent under WAL) and streams it; PG dialect returns explicit 400.
11. **OTP dead feature — GATED (2026-09-01):** `smsProviderEnabled` flag from `SMS_API_KEY`/`SMS_PROVIDER` env; `GET /api/auth/otp/status` drives the Login UI (OTP tab hidden when disabled); in production without a provider, `POST /api/auth/otp/send`, `/otp/verify` and `/reset-password` all hard-503 (`{error:'سرویس پیامکی فعال نیست'}`). Add Kavenegar/Ghasedak adapter + env keys to re-enable.
12. **`/api/reviews/latest` — LIVE (reintroduced 2026-09-01, commit f95acbd/7cffe99):** GET /api/reviews/latest returns up to 6 REAL reviews (LEFT JOIN users, INNER JOIN products, 60s `reviews:latest` cache busted on review create/admin delete). Consumed by `LatestReviews.tsx` homepage testimonials section — hidden on empty/error (zero fabricated data).
13. **PWA manifest + JSON-LD hygiene — FIXED (2026-09-01):** `theme_color` #F47C20 / `background_color` #0B1536 (Kinetic Commerce palette); `DynamicBreadcrumbs` JSON-LD escapes `<` as `\u003c` (self-XSS shape closed).

**Also removed (2026-09-01 repo hygiene):** `sketches/`, `firebase.json`/`.firebaserc`/`.firebase/`, `metadata.json`, `.neural_graph.json` from repo & disk; `SECRETS_MAP.md` gitignored (local-only ops map).

**Dead-code sweep r37b (2026-09-04, commits 2c2b6c4→2002ea5):** knip@5 + TS5 AST ref-counter scan of all 133 TS/TSX files. Removed: `formatTomanNumber`/`formatPersianDate` (utils.ts), `CategoryCardSkeleton`/`BrandCardSkeleton`/`OrderCardSkeleton` (Skeletons.tsx), 4 unused `AppError` subclasses (Forbidden/Conflict/Validation/Internal — BadRequest/Unauthorized/NotFound kept, used by phase1 test), `ORDERS_STORE` (seed-data.ts), empty `blogPostsRelations` (schema.pg.ts), dead `loadAdminChatIds` (bale.ts), 8 type-only `export` keywords, deps `@google/genai`+`thesvg`+`autoprefixer`. Keep-list (knip false positives: sw.js, seed-blog.ts, drizzle.pg.config.ts, bale-worker/worker.ts, seed.ts, closeDb, pino-pretty) → skill `dead-code-scan-janebi`. Gate: tsc clean, 344/344, `npm run verify` + `hermes verify` ALL PASS. Long-function refactor (98 fns ≥40 lines, top 742) explicitly deferred by user decision.

**Production-integrity audit r37c (2026-09-04, commits f224516/9af6a7d — PostgreSQL live):** (1) P0 clean-DB boot abort — PG poisons a tx after any error; `runPgMigrations` now wraps each statement in a SAVEPOINT. (2) P0 order-with-coupon broken on PG — migration 0006 named columns `usageLimit`/`usedCount` while routes query via the SQLite schema mapping (`usage_limit`/`used_count`); migration 0009 renames + `schema.pg.ts` aligned. **Rule: PG physical column names must match schema.ts mappings** (routes build queries from schema.ts). (3) P0 oversell on PG — stock deduction was TOCTOU (25 parallel orders on stock=1 → 9 winners, stock −8); fixed with atomic `stockQuantity >= qty` in the UPDATE `.where()` + `.returning()` row-count assert (post-fix: exactly 1 winner ×4 rounds). (4) P1 search case parity — SQLite LIKE case-insensitive vs PG case-sensitive; `likeWithEscape` now `lower()` both sides. (5) P2 NaN id params → 500; `numericIdParamSchema` on numeric routes. (6) Local SQLite DB journal corruption found & repaired: `audit_logs` was missing while journaled applied (stale restored backup); 0007 journal row removed and re-applied live (audit insert+select verified). Ops gotcha: stale server can silently hold :3999 (EADDRINUSE kills the new boot) — always `lsof -iTCP:<port>` before live tests. Gates: tsc clean, 344/344, PG-verification 5/5, clean-DB boot 10/10 migrations reproducible (journal=10, 16 tables, 11 FKs), full critical-flow smoke PASS on PG, `npm run verify` + `hermes verify` ok.

## 6. Ops

- **DB backup (2026-09-01):** `npm run db:backup` → `scripts/ops/backup-db.mjs` uses better-sqlite3 `VACUUM INTO` (consistent under WAL) to write `backups/janebi-<timestamp>.db` (override dir with `BACKUP_DIR`, db with `DATABASE_URL`); keeps the last 7, prunes older, exits non-zero on failure. `backups/` is gitignored.

## Ops (2026-09-01): OTP disabled in prod (503, no SMS provider — wire Kavenegar/Ghasedak to re-enable). DB backup: `npm run db:backup` → backups/*.db, keeps last 7.

## OTP forgot-password + mobile header fixes (2026-09-05, commit c3c6e9c)
- **OTP reset LIVE in prod:** SMS.ir provider wired (`SMS_API_KEY`+`SMS_TEMPLATE_ID`, sms.ir template «کد تایید شما: #CODE#»); `/api/auth/otp/status` → `{enabled:true}`; `/otp/send`, `/otp/verify`, `/reset-password` all active. Section-5 "OTP dead" items superseded.
- **"OTP SMS not received" diagnostic (2026-09-06, worked):** inside-container direct dispatch test proves key+template+number path: `docker exec janebi-store node -e "fetch('https://api.sms.ir/v1/send/verify',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.SMS_API_KEY},body:JSON.stringify({mobile:'9xxxxxxxxx',templateId:Number(process.env.SMS_TEMPLATE_ID),parameters:[{name:'Code',value:'12345'},{name:'Time',value:'۲ دقیقه'}]})}).then(r=>r.text()).then(console.log)"` → `{"status":1,"message":"موفق"}`. Server 200 + SMS.ir موفق = accepted to operator; late arrival is operator queue, NOT a server bug. Known risk: delivery delay can exceed the 2-min OTP TTL — if it recurs, bump TTL to 5min (expiresAt + `expiresIn: 120` → 300 + SMS template `Time` param) in `server/routes/auth.ts`.
- **Auth form UX (Login.tsx + AuthModal.tsx):** OTP input `autoComplete="one-time-code"` + `inputMode="numeric"` + `enterKeyHint="done"` (iOS/Android paste-suggestion); phone `username`, login pw `current-password`, reset pw `new-password`; forgot-password link added to header AuthModal footer (→ /login; was unreachable from header login). Verified live via `i.getAttribute('autocomplete')` — React renders it as lowercase attr; `input.autoComplete` camelCase prop probe returns '' on live (use getAttribute).
- **Mobile header overflow FIXED (was: headerScrollW 409>390 both engines — login button clipped off-viewport):** icon buttons p-2→p-1.5 + container gap 0.5 below sm; Logo md symbol w-9→w-8, EN wordmark `hidden sm:block`, md text-block `max-[379px]:hidden` (Tailwind v4 arbitrary max-* variant); login button px-3→2.5, label `hidden sm:inline` (old `hidden xs:inline` was DEAD — `xs` breakpoint undefined in this Tailwind v4 theme). Verified: headerScrollW==clientW at 320/360/390 on Chromium+WebKit, live + local.
- deploy.sh tar-docker "unexpected EOF" mid-output + trailing `✅ Deploy OK` was a FALSE ALARM: served-asset sha256 matched local exactly. Verify hashes, not tail lines.

## API client unification (2026-09-11, commit `cf2d1cb` — gate passed, not yet deployed)

- **`src/lib/jsonFetch.ts` (NEW):** `jsonFetch<T>(url, init)` (JSON-in/out POST/PUT, auto Content-Type, parses `{error}` into thrown `ApiError{status,message}`) + `getJson<T>(url)` (GET, `cache:'no-store'` — json cache-busting so callers can't read stale SW cache). Coexists with `authFetch` in `src/lib/api.ts` (authed path, untouched).
- **19 raw `fetch('/api…')` call sites migrated** across 16 files (Home, Header, HeaderSearch, Footer, VipClubBanner, LatestReviews, RelatedProducts, DynamicBreadcrumbs, Compare, Brands, Blog, Offers, NewProducts, Contact, VipClubTab, admin/Products ×2, ProductReviews, useStoreSettings, useProductFilters cat/brands). Side effects: removed `err: any` in Contact/Header/HeaderSearch (now `err instanceof Error`); Header/HeaderSearch category sorts typed `{count?: number}` instead of `any`; admin/Products list + stock-PUT now surface server error text.
- **Deliberate exemptions (raw fetch stays, documented in jsonFetch.ts header):** `ProductDetail.tsx` (AbortController + JSON-LD side-effects inside fetch chain), `AuthContext.tsx`/`Login.tsx`/`ForcedPasswordChange.tsx` (auth state machine, custom status handling), `useProductFilters.ts` product-list fetch (reads `X-Total-Count`/`X-Total-Pages` response headers), `src/lib/api.ts` (refresh single-flight).
- **Verify:** `npm run verify` ALL PASS (tsc strict clean, 406/411 tests in 56 suites, prod build 876ms). Net −36 LOC.
- **Boy-scout rule going forward:** any file opened for other work — migrate its raw JSON fetches to jsonFetch/getJson; do NOT touch exempted files' fetches.
- **Round closure (commit `09a6f37`, deployed + live-verified):** last raw JSON fetch migrated (admin/Products save-product PUT/POST). `grep` census: remaining raw `fetch('/api` = auth exemptions + api.ts only. Live dual-engine sweep (WebKit+Chromium, 7 pages, local prod boot): 0 local-app console/failed-request issues; only external noise = trustseal.enamad.ir 403/408 (known fragile gov server, documented fallback exists). Real header-search flow PASS on both engines: type «قاب» → Enter → `/products?search=قاب` 200.
- **Gotchas hit in this round (both fixed/known):** (1) prod CSP `upgrade-insecure-requests` makes WebKit rewrite ALL local http://127.0.0.1 asset fetches to https → TLS-fail noise; smoke boots now set `DISABLE_CSP_UPGRADE_INSECURE=1` (helmet removal shape: `upgradeInsecureRequests: null` — `[]`/false THROW). Prod keeps the directive (verified header present post-deploy). (2) test-artifact products (`image='/images/test.jpg'`, «کالای تست اینواریانت موجودی», ids 23318/23351/23384/23417) were live in local DB → 404 console noise; deleted (zero FK references verified first). NEVER trust a swept 404 list without classifying local-app vs external-host noise.
- **Follow-up round GOAL-09011b (same day):** (1) **Saman failover terminal LIVE on VPS** — `SAMAN_TERMINAL_ID=636806` appended to VPS `.env` (from SECRE_MAP) + `docker compose up -d --force-recreate app`; verified inside container (env value present), `saman adapter`+`HALF_OPEN` markers in served server.cjs, health ok. PaymentFailoverRouter is no longer single-gateway. (2) **admin/Orders.tsx zero-`any`** — new colocated `AdminOrder` interface mirroring the real DB row shape (flat recipientName/recipientPhone/refId/qty per schema.ts); killed all 4 `any`s + 3 phantom-field fallbacks (`o.userName` never existed on admin rows, `it.quantity` never existed on order_items). tsc clean, 406/411, deploy OK, served `index-L1PbJ-Jp.js` sha256 == local. Commit `44a1d6f`.

## Blog admin UI + review moderation (2026-09-06, commit `a144612` — deployed & live-verified)
- **`/admin/blog`** (`src/pages/admin/Blog.tsx`): full magazine CRUD — create/edit modal, publish-toggle (Eye/EyeOff), delete with confirm, search. Consumes the previously UI-less `/api/blog/admin` CRUD. Nav entry «مدیریت مجله (بلاگ)» (Newspaper icon). `/admin/blog` matches the SEO-004 `/^\/admin\/[a-z-]+$/` allowlist regex — no server change needed for new admin subpages.
- **Review moderation:** migration `0011_reviews_approved` (sqlite+pg: `approved boolean DEFAULT true NOT NULL`); public `GET /api/products/:id/reviews` (both shapes) + rating recompute filter `approved=true`; new `PUT /api/admin/reviews/:id/approved` recomputes product rating from approved reviews + busts `reviews:*`/`product:*`/`products`/`reviews:latest` caches; AdminReviews got a status column + رد/تأیید buttons. Policy = **post-moderation**: reviews publish immediately, admin can reject.
- **Deploy note:** tar must include `server/db` WHOLE (schema.ts alone without index.ts breaks the build — `rm -rf` before extract wipes it). E2E admin-flow test via in-container fetch needs admin creds in env (absent) — fallback verification: 401-on-admin-route + `approved=1` distribution + served `Blog-B-Wa6PHz.js` chunk (200) + journal=12.

## Audit remediation (2026-09-06, commit `02ef15b` — deployed & live-verified)
- **SEO-004 soft-404 fixed:** `server/index.ts` now mirrors the SPA route table (`SPA_ROUTES` set) in the prod catch-all — unknown paths return HTTP 404 + `X-Robots-Tag: noindex, follow` (was 200 + index). Static-route additions to `src/App.tsx` MUST be mirrored in that Set. Live-verified: `/nonexistent-xyz`→404+noindex, `/products/999999999`→404, all real routes→200.

## Bale bot (بله) complete overhaul — 100% Inline Keyboards (2026-09-07)
- **Engine:** Grammy 1.46 pointing at `https://tapi.bale.ai`. Long-polling with session Map + auto-prune.
- **100% Inline controls (دکمه‌های شیشه‌ای):** Main dashboard, paginated category selector (2-col grid + page navigation), quick stock/brand/warranty buttons, skip buttons, product confirmation modal, product management card, recent orders with status change buttons, store live stats, and inventory alerts.
- **Native photo download & user upload capability:**
  - Direct photo/document upload (uncompressed JPG/PNG/WebP or Photo) anywhere in bot: downloads via Bale CDN (`tapi.bale.ai`), verifies magic bytes, saves to `public/images/products/`.
  - Actionable options on upload: create new product prefilled with photo (`w:new:img`), or link to existing product by ID/search (`p:asg:img` / `p:set_img:`).
  - Product detail view card includes «📸 تغییر / آپلود عکس» (`p:pho:<id>`) for instant photo updates via upload or image URL.
  - Server static route `/images` registered in both Express (`server/app.ts`) and production server (`server/index.ts`) guaranteeing instant live serving of runtime uploaded images.
- **Proactive Event-Driven Notifications (Model 2):**
  - Typed domain event bus `server/services/events.ts` (`order:paid`, `stock:low`, `review:created`, `contact:created`).
  - Bot modules: `server/bot/bale.ts` (entry: `startBaleBot` handlers + re-exports) with shared pieces in
    `server/bot/bale/` — `constants.ts`, `types.ts`, `session.ts` (store + sweeper + formatters + audit),
    `media.ts` (Bale photo download), `catalog.ts` (categories/status/review approval), `keyboards.ts` (19 inline keyboards).
  - Bot notifier subscriber `server/bot/notifier.ts`: non-blocking `setImmediate` dispatch, multi-admin broadcast with `Promise.allSettled`, HTML-escaped content (`escapeHtml`) preventing Bale entity parse crashes, and 30-min inventory alert cooldown.
  - Interactive notification buttons: instant order processing (`o:s:<id>:processing`), quick +5 stock refill (`p:s:<id>:5`), review approve/reject (`rv:app:<id>`, `rv:rej:<id>`), contact message read/archive (`cm:read:<id>`, `cm:arc:<id>`).
- **Bale Bot API compliance:** All `callback_data` under 64 bytes (unit tested in `tests/unit/bale-bot.test.ts` and `tests/unit/event-notifier.test.ts`), strict instant `answerCallbackQuery` dispatch to eliminate client spinner hangs, Markdown-compliant spacing, in-place message updates (`editMessageText`).
- **Data & Financial integrity:** Order cancellations inside bot restock items and refund VIP points via `restockItemsAndRefundPoints` in transaction; product deletions clean up related cart/wishlist/review/feature records; audit logging on all actions.

- **Guest cart/wishlist merge-on-login:** `CartContext`/`WishlistContext` push localStorage items to the server (POST = upsert/idempotent) keyed by a `mergedForToken` ref (cart) before fetching the authoritative list. Was: silent REPLACE on login. FE CartItem.id is the product id (typeof number).
- **Live-price compare:** `CompareContext` uses the canonical `../types` Product (local duplicate deleted — it lacked `stockQuantity` and broke tsc) + new silent `replaceCompare()`; Compare page refetches each item on mount and drops deleted products.
- **ChatWidget honesty:** copy now says «راهنمای خودکار» — no fake «کارشناسان بررسی می‌کنند» claim; fallback reply points to phone/Contact page.
- **`GET /api/admin/orders` optional server pagination:** `?page=&limit=(1..200,def 50)&status=` → `{items,total,page,limit}`; no params → full array (back-compat; admin UI still client-side filters).
- **Deploy-path lesson:** VPS tree had drifted (`src/lib/coupon.ts`, `server/lib/breadcrumbs.ts` missing → build failures mid-deploy). Fix: ship whole `server/lib` + `src/lib` dirs, not just changed files. Old-container mystery (`/cart` served `index,follow` while new routes answered): stale container process — full `up -d --force-recreate` + image→host dist sync + restart cleared it. Verify served headers on a cache-busted URL, not memory of a previous fetch.

## Admin panel management upgrade (2026-09-07, commit `2a99775` — deployed & live-verified)
- **P0 catalogue fix:** `AdminProducts` fetched `/api/products` with no `limit` → API default page size 20, so the admin saw only 20 of 139+ products. Now `?limit=1000`.
- **Badge counters:** `/api/admin/stats` now returns `metrics.unreadMessages` + `metrics.pendingReviews` (two count(*) aggregates); AdminLayout sidebar shows badges on «نظرات کاربران» and «پیام‌های تماس» + Dashboard gets 2 new stat cards.
- **Quick stock edit:** click the stock cell in AdminProducts → inline numeric input, Enter/blur saves via `PUT /api/admin/products/:id {stockQuantity}` (partial update already supported), Esc cancels. Stock state updated optimistically in the list.
- **CSV/SMS copy fix (was silently broken):** Orders export used `o.recipient?.name` etc — field doesn't exist on the order row (real fields: `recipientName/recipientPhone/recipientAddress/recipientPostalCode`); columns always exported '-'. Also `paymentMethod` now renders the Persian label (کارت به کارت / پرداخت اینترنتی).
- **Coupon usage display:** coupon cards show `usedCount`/`usageLimit` («مصرف‌شده: ۳ از ۵۰ بار»), red + «(تکمیل)» when exhausted.
- **Verify:** npm run verify ALL PASS (389/389), prod health ok, served chunks contain new code (`limit=1000` in Products-BRuWamZn.js, `unreadMessages` in AdminLayout/Dashboard, `usedCount` in Coupons). Prod DB counters verified 0/0/139 via in-container sqlite query.

## Prod payment outage fix — APP_URL callback mismatch (2026-09-07, commit `803657f` — deployed & live-verified)
- Root cause: VPS `.env` `APP_URL="http://localhost:3000"` → Zarinpal request.json rejected with code **-14** ("callback URL domain does not match registered terminal domain") → all online payments 503. Soft failures (HTTP 200 + errors payload) were invisible in logs — router only logged thrown errors.
- Fix: `APP_URL="https://janebiarena.ir"` in VPS .env + `docker compose up -d --force-recreate app`; router now logs `[Payment Gateway Rejected]` for soft failures.
- Verified live: zarinpal probe w/ correct callback → code 100 Success, authority issued. Marker `Payment Gateway Rejected` present in served /app/dist/server.cjs.
- Remaining config notes: SAMAN_TERMINAL_ID NOT set on VPS (failover gateway dead — only matters if zarinpal circuit opens; terminal id lives in SECRETS_MAP, add to .env + recreate to enable). Disk 78% (5G free). No docker log rotation configured (json-file unlimited). Raw-IP host requests serve SPA 200 (Censys/scanners).

## VPS ops round GOAL-09011c (2026-09-11 late — deployed & live-verified)
- **Saman failover ACTIVE:** `SAMAN_TERMINAL_ID=636806` appended to VPS `.env` (value from SECRETS_MAP) + `docker compose up -d --force-recreate app`. Verified: in-container env present, health ok, live 200. Note: docker compose env_file loads at container creation — `restart` alone does NOT pick up new keys.
- **Scanner IP blocked:** 45.148.10.183 fired 994×4xx probes (wp-config/.env/error.log fishing) at raw IP → `ufw insert 1 deny from 45.148.10.183`; post-block log count = 0; store 200. Raw-IP SPA 200 issue remains open (needs nginx server_name guard or proxy-level check).
- **Disk 79%→70% (6.7G free):** `docker system prune` −1.8GB, `journalctl --vacuum-size=50M` −260MB, `apt-get clean`. Largest remaining: /var/lib/containerd overlayfs 12G with 135 Committed (inactive) snapshots — containerd-native GC (`ctr -n moby snapshots`/content prune or periodic docker image prune) is the next lever if disk climbs again.
- **Docker log rotation configured:** `/etc/docker/daemon.json` json-file max-size 10m × max-file 3. CAVEAT: applies to newly-created containers only — janebi-store's current container stays unlimited until its next recreate (next deploy.sh with force-recreate picks it up). NOTE (post-09012 deploy): recreated container still shows `LogConfig.Config: {}` — daemon.json log-opts apply at daemon level but the compose file may override per-service; if log growth recurs, set `logging:` block in docker-compose.yml (max-size 10m, max-file 3) which takes precedence.
- **DB backups on VPS = NONE** (no backups dir). `npm run db:backup` is local-only. Recommended next ops item: VPS-side cron `VACUUM INTO /home/ubuntu/backups/` (keep 7) — DB is the only stateful data.
- **Backup gap re-audited (2026-09-11 late) — actually COVERED:** `/home/ubuntu/bin/janebi-backup.sh` + cron `30 2 * * *` already run: in-container better-sqlite3 `backup()` → docker cp → `PRAGMA integrity_check` → keep 7 db + 7 .env. Log shows 7 consecutive OK nights (…→20260911 integrity=ok 588K). Corollary: PROJECT_GRAPH's earlier "backups dir absent" note was WRONG (checked wrong path). Verified live.
- **containerd snapshot verdict:** 12G overlayfs = 2 live images (janebi-store-app 1.22GB + postgres 417MB) + their build/layer history in the moby namespace (75 Committed snapshots parented by active layers; `ctr snapshots rm` refuses with "cannot remove snapshot with child" — parent chains). NOT safely reclaimable without deleting rollback history. Only real lever: periodic `docker image prune` + accepting build churn, or moving build off-VPS (buildx/GHA) so old layers never accumulate. Disk stable at 70% (6.7G free).

## Live black-box security audit (2026-09-14, commit `452d1cb` — deployed & live-verified)

Full report: `docs/SECURITY-AUDIT-2026-09-14.md`. Scope: unauthenticated external
surface of prod (curl/openssl; source read only to confirm root cause).

- **SEC-01 CRITICAL — backend bundle + source map were publicly downloadable.**
  `GET /server.cjs` → 200 (439 KB), `GET /server.cjs.map` → 200 (731 KB, `sourcesContent:true`,
  385 KB real TS across 49 server files). Root cause: prod web root `dist/` IS the esbuild
  output dir (`server/index.ts:117` `express.static(path.join(cwd,"dist"))`), so the SPA's own
  static mount served the compiled backend and its map. No secret literals in the bundle
  (all secrets via `process.env`), but the full route table/auth/validation logic was exposed.
  **Fix:** one guard middleware in `server/app.ts` (before every static mount) →
  `/(\.(cjs|map)$/i)` ⇒ 404. Regression probe `scripts/gate/static-exposure.sh` boots a real
  production server on an isolated DB and is wired into `npm run verify` as **step 4**.
  Live: both 404, legit `/assets/*.js` + `/manifest.webmanifest` still 200.
- **SEC-02 HIGH — IP rate limiting fully bypassable via client-supplied `X-Forwarded-For`.**
  nginx used `$proxy_add_x_forwarded_for` (append) while the app sets `trust proxy 1`, which
  resolves `req.ip` from the untrusted leftmost XFF entry = a client-controlled header.
  Proof: with the auth limiter saturated (429 unspoofed), 4 requests with distinct
  `X-Forwarded-For: 10.0.0.N` returned 401 (allowed). Impact: unlimited login/OTP-SMS
  brute force + bypass of coupon/contact/newsletter limiters.
  **Fix:** nginx overwrites — `proxy_set_header X-Forwarded-For $remote_addr;` (4 proxy
  locations); live conf now versioned at `deploy/nginx-janebi-store.conf`.
  Post-fix live: 9 rapid rotating-XFF calls → 401×5 then 429 (single bucket = real IP).
- **Verified sound:** TLS (HTTP/2, LE cert, HSTS 1y+subdomains), 301 http→https and www→apex
  canonical, full helmet header set + CSP reporting, `.env`/`.git`/`data/janebi.db`/`package.json`/
  `/metrics` 404, all `/api/admin/*` 401 unauthenticated, `alg:none` and garbage JWT rejected,
  Zod-validated + parameterized inputs (SQLi probes inert, malformed JSON → clean 400),
  no foreign-Origin CORS reflection, canonical/OG built from `APP_URL` (no Host poisoning),
  path-traversal variants 400/404, TRACE 405.
- **Advisory/accepted:** CSP `script-src 'unsafe-inline'` (inline bootstrap), no `/.well-known/security.txt`.

## SEC-03 hardening round (2026-09-14, commit `838f727` — deployed & live-verified)

Closes the two Advisory items of the 0914 audit + adds a drift guard for SEC-02.

- **`script-src 'unsafe-inline'` removed — hash-pinned instead.** The only *executable*
  inline script in the shipped shell is the anti-FOUC dark-mode bootstrap in
  `index.html` (every other inline `<script>` is `application/ld+json`, which is
  CSP-inert). `server/app.ts` now hashes the built shell at boot
  (`dist/index.html`, fallback `index.html`) and pins each inline block as
  `'sha256-…'` in `script-src`; no per-request HTML transform, no extra request,
  no CWV cost. Live header:
  `script-src 'self' 'sha256-knevCq+AQOF1vXhoY3xoLTrtVdGBZOb9BHSRkCe1FH8='; script-src-attr 'none'`.
- **Two new probes.** `scripts/gate/csp-inline.sh` (**gate step 5**) boots a real
  production server on an isolated DB and fails if the header and the served HTML
  disagree (any inline hash missing), if `'unsafe-inline'`/`'self'` regress, if
  `script-src-attr` stops being `none`, or if `security.txt` ≠ 200.
  `scripts/audit/csp-live.mjs` (chromium **and** webkit, prod) instruments
  `securitypolicyviolation` before any page script, pre-seeds `theme=dark`, then
  asserts zero violations, that the inline bootstrap **actually executed**
  (`documentElement.classList.contains('dark')`), and that the SPA mounted —
  proof that hash pinning works for real users, not just in the header. Live:
  `[chromium] PASS violations=0 script-src=0 dark=true` / `[webkit] PASS` same.
- **`/.well-known/security.txt` — 200, `text/plain`** (RFC 9116: Contact/Expires/
  Preferred-Languages/Canonical/Policy), sourced from `public/.well-known/` → vite copies
  to `dist/`, served by an explicit route: `express.static`'s `dotfiles:"ignore"` 404s any
  dot-directory, and `res.sendFile()` inherits the same rule from `send` — so the route
  reads + `res.send()` instead (`sendFile` on `/.well-known/*` returns a bare `404 Not Found`).
- **`scripts/ops/nginx-drift.sh` — SEC-02 drift guard (deliberately NOT in the gate: the
  gate must not depend on SSH).** Compares the live VPS `nginx -T` against the invariant
  (every proxy location overwrites `X-Forwarded-For $remote_addr`, zero
  `proxy_add_x_forwarded_for`) and adds a behavioural leg (7 rapid rotating-XFF login calls
  must hit `429`). Live run: `proxy locations=4  XFF-remote_addr=4  XFF-append=0` +
  `401×5 → 429×2` → PASS.
- **Gate after the round:** `npm run verify` EXIT=0 — strict tsc, **424 passed / 5 skipped
  (57 files)**, prod build, probe 4 (SEC-01) + probe 5 (SEC-03) PASS. Deploy `838f727`,
  `BUILD_INFO` on prod == HEAD (`838f727`), key pages `/ /products /cart /blog` all 200.

### بازرسی مستقل SEC-01/02/03 — کارت `t_fb3103bf` (2026-09-14، پروفایل `novin-khodro`) → **تأیید، تخلف صفر**

بازرس مستقل (مدل متفاوت، اسکیل `janebi-arena-production-readiness`) همهچیز را از صفر بازتولید کرد و تأییدم:
- **هش مستقل**: `base64(sha256(inline_body))` روی HTML گرفتهشده از prod vs هدر `script-src` → در هر ۴ مسیر `/`, `/products`, `/cart`, `/blog` مطابق، `inline_count=1`، `unsafe-inline=0`.
- **کنترل منفی هر دو پروپ** با ورودی متفاوت از کنترل منفی من: شل دستکاریشده → هش جدید `sha256-ls5V0JRfJCr54xLXpgrYhmKcohxvbrvVwhOPnfrokf0=` → `NOT PINNED` → exit 1؛ کانفیگ مصنوعی nginx → `XFF-append=1` → exit 1. یعنی منطق پروپها واقعی است، نه vacuously green.
- **`csp-live`**: chromium + webkit روی prod → `violations=0 script-src=0 dark=true rootChildren=2 consoleCSP=0`.
- **بایتپاریتی (این ریسک واقعی بود و بسته شد)**: `md5 dist/index.html = 919bfd9a26f62bfb43088ae4a985c8a7` یکسان در `dist` محلی، دیسک هاست VPS، و `/app/dist/index.html` داخل کانتینر — تأیید مستقل خودم هم همین را نشان داد. پس هش در بوت دقیقاً روی همان فایلی است که سرو میشود.
- **مسیرهای دیسکی nginx** (`^/fonts/`, `^/assets/*\.(js|css|woff2?|ttf|eot)$`, `^(products|brands)/*\.(svg|png|jpg|jpeg|webp|ico)$`, `^\d+\.txt$`) هیچکدام `*.html` را match نمیکنند → **fail-closed**: هر اسکریپت inline آینده که هش نخورده باشد بلاک میشود، نه سرو. تنها HTML استثنایی روی دیسک = فایل تأیید گوگل (۲۰۰، با هدر CSP، صفر `<script>`).
- **`style-src 'unsafe-inline'` حذفشدنی نیست**: ۹ مورد `style={{…}}` رانتایم در `src/` (تأیید مستقل من: `grep -ro "style={{" | wc -l = 9`) → نگه داشته شد، مستند.
- گیت: `npm run verify` EXIT=0 (۵۷ فایل، ۴۲۴ pass / ۵ skip)، probe4+probe5 PASS؛ `nginx -T` زنده: `XFF-remote_addr=4 append=0`؛ `/server.cjs` و `.map` ۴۰۴. هیچ تغییری روی prod داده نشد.

**درس عملیاتی این دور** (ثبت در skill `hermes-project-tracking`): کارت با `skills=[...]` باید اسکیلی را نام ببرد که روی **پروفایل assignee** نصب است؛ اسکیل ناموجود → `hermes --skill <x>` → `Error: Unknown skill(s)` و worker در ثانیهٔ اول exit 1 (dispatcher فقط «worker crashed» نشان میدهد). و مدل `default` (`openrouter/glm-5.3-flash` از گیتوی 127.0.0.1:20128) الان ۴۰۴ «No active credentials for provider: openrouter» میدهد → هر spawn پروفایل default، judge در goal-mode، و decompose کارتهای triage با همین علت میمیرد.
