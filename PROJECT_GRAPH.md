# ARCHITECTURE & PROJECT GRAPH — JANEBI ARENA

> **Autonomous Engineering Knowledge Base & Live System Map**
> **Last Verified & Updated:** 2026-09-05 (PostgreSQL audit r37c & UI fixes — commit `355239b`)
> **Status:** Live & Production Ready (48 test suites, 353 passing tests)
> **PRD Reference:** `AGENTS.md` | `PROJECT_AUDIT.md` | `TASKS.md`

---

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
  - `server/routes/admin.ts` (Protected CRUD, metrics, role promotion, status lifecycle).
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

- **DB backup (2026-09-01):** `npm run db:backup` → `scripts/backup-db.mjs` uses better-sqlite3 `VACUUM INTO` (consistent under WAL) to write `backups/janebi-<timestamp>.db` (override dir with `BACKUP_DIR`, db with `DATABASE_URL`); keeps the last 7, prunes older, exits non-zero on failure. `backups/` is gitignored.

## Ops (2026-09-01): OTP disabled in prod (503, no SMS provider — wire Kavenegar/Ghasedak to re-enable). DB backup: `npm run db:backup` → backups/*.db, keeps last 7.

## OTP forgot-password + mobile header fixes (2026-09-05, commit c3c6e9c)
- **OTP reset LIVE in prod:** SMS.ir provider wired (`SMS_API_KEY`+`SMS_TEMPLATE_ID`, sms.ir template «کد تایید شما: #CODE#»); `/api/auth/otp/status` → `{enabled:true}`; `/otp/send`, `/otp/verify`, `/reset-password` all active. Section-5 "OTP dead" items superseded.
- **"OTP SMS not received" diagnostic (2026-09-06, worked):** inside-container direct dispatch test proves key+template+number path: `docker exec janebi-store node -e "fetch('https://api.sms.ir/v1/send/verify',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.SMS_API_KEY},body:JSON.stringify({mobile:'9xxxxxxxxx',templateId:Number(process.env.SMS_TEMPLATE_ID),parameters:[{name:'Code',value:'12345'},{name:'Time',value:'۲ دقیقه'}]})}).then(r=>r.text()).then(console.log)"` → `{"status":1,"message":"موفق"}`. Server 200 + SMS.ir موفق = accepted to operator; late arrival is operator queue, NOT a server bug. Known risk: delivery delay can exceed the 2-min OTP TTL — if it recurs, bump TTL to 5min (expiresAt + `expiresIn: 120` → 300 + SMS template `Time` param) in `server/routes/auth.ts`.
- **Auth form UX (Login.tsx + AuthModal.tsx):** OTP input `autoComplete="one-time-code"` + `inputMode="numeric"` + `enterKeyHint="done"` (iOS/Android paste-suggestion); phone `username`, login pw `current-password`, reset pw `new-password`; forgot-password link added to header AuthModal footer (→ /login; was unreachable from header login). Verified live via `i.getAttribute('autocomplete')` — React renders it as lowercase attr; `input.autoComplete` camelCase prop probe returns '' on live (use getAttribute).
- **Mobile header overflow FIXED (was: headerScrollW 409>390 both engines — login button clipped off-viewport):** icon buttons p-2→p-1.5 + container gap 0.5 below sm; Logo md symbol w-9→w-8, EN wordmark `hidden sm:block`, md text-block `max-[379px]:hidden` (Tailwind v4 arbitrary max-* variant); login button px-3→2.5, label `hidden sm:inline` (old `hidden xs:inline` was DEAD — `xs` breakpoint undefined in this Tailwind v4 theme). Verified: headerScrollW==clientW at 320/360/390 on Chromium+WebKit, live + local.
- deploy.sh tar-docker "unexpected EOF" mid-output + trailing `✅ Deploy OK` was a FALSE ALARM: served-asset sha256 matched local exactly. Verify hashes, not tail lines.
