# ARCHITECTURE & PROJECT GRAPH — JANEBI ARENA

> **Autonomous Engineering Knowledge Base & Live System Map**
> **Last Verified & Updated:** 2026-08-31 (Deep Forensic Audit — see `PROJECT_AUDIT.md` §2026-08-31)
> **Status:** Live & Production Ready (36 test suites, 297 passing tests)
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
   (Runs strict `tsc --noEmit`, all 297 Vitest unit/stress/concurrency tests, and full production build).

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
2. **OTP dead in prod** — no SMS provider wired (`auth.ts:231-241`); login/reset OTP UI non-functional on live.
3. **PG parity regression — FIXED (2026-08-31):** `blogPosts` added to `schema.pg.ts` (schema.pg.ts:152).
4. **Zero secondary indexes — FIXED & COMMITTED (2026-09-01):** migration `0005` (SQLite+PG) adds FK indexes: orders(user_id/created_at), order_items(order_id), reviews(product_id), cart_items(user_id), wishlist_items(user_id), addresses(user_id), product_features(product_id), contact_messages(status,created_at). Post-deploy: verify `PRAGMA table_info(orders)` has `created_at` + `EXPLAIN QUERY PLAN` no SCAN.
5. **SW default branch cache-first — FIXED & COMMITTED (2026-09-01):** default branch now network-first with cache-only-offline fallback; `CACHE_NAME`/`API_CACHE_NAME` bumped to v1.1.0 (old caches purged on activate).
6. **AI-SEO files — FIXED & COMMITTED (2026-09-01):** `llms.txt`/`llms-full.txt`/`pricing.md` regenerated from live API with real category slugs, real counts, unified store metadata.
7. **Prod DB residue — FIXED (2026-09-01):** 5 scratch tables dropped + 9 stale test coupons deleted in prod DB (4 real coupons remain: WELCOME10/OFF20/SUMMER30/JANEBI100). `deploy.sh` now also `docker cp`s `drizzle/` into the container (migrations previously only landed on host, not container — 0006 would have been skipped).
8. **Abandoned `pending_payment` orders — FIXED & COMMITTED (2026-09-01):** in-process reaper in `payment.ts` (5min interval, 60min cutoff, transaction-guarded restock + VIP refund, legacy NULL `created_at` falls back to base36 id timestamp; `orders.created_at` column added via migration 0005).
9. **Coupon hardening — FIXED (2026-09-01):** `coupons.usage_limit`/`used_count` columns (migration 0006 SQLite+PG, schema.ts + schema.pg.ts parity); order transaction increments `usedCount` and rejects exhausted codes («ظرفیت استفاده … تکمیل شده است»); validate endpoint enforces the cap too; per-IP `couponLimiter` (10/15min) on `/api/coupons`; admin create accepts `usageLimit`.

**Also removed (2026-09-01 repo hygiene):** `sketches/`, `firebase.json`/`.firebaserc`/`.firebase/`, `metadata.json`, `.neural_graph.json` from repo & disk; `SECRETS_MAP.md` gitignored (local-only ops map).
