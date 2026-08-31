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

## 5. Known Gaps & Debts (2026-08-31 Deep Audit)

Full evidence + remediation list: `PROJECT_AUDIT.md`. Highest-priority debts:
1. **Fake aggregate ratings** — `products.rating/reviewsCount` seeded with fabricated values (max 450) vs 2 real reviews; P0 recompute + remove client fallbacks (`DEFAULT_REVIEWS`, `ProductCard` '۴.۸' default).
2. **OTP dead in prod** — no SMS provider wired (`auth.ts:231-241`); login/reset OTP UI non-functional on live.
3. **PG parity regression** — `schema.pg.ts` lacks `blog_posts` (SQLite has it).
4. **Zero secondary indexes** — prod `EXPLAIN` shows full `SCAN orders`/`SCAN reviews`; FK-index migration needed before traffic growth.
5. **SW default branch cache-first** — `/api/settings`, `/api/coupons-active`, `/api/blog` cached forever once seen; `CACHE_NAME` never bumped.
6. **AI-SEO files stale/fabricated** — `llms.txt` phone/address conflict + 7 dead category links (verified `[]` on live API).
7. **Prod DB residue** — scratch tables (`scratch_t`, `scratch_t2`, `s3`, `s4`, `mutex_t`) + 9 stale test coupons visible in VipClub tab.
8. **Abandoned `pending_payment` orders** — no reaper; stock stays deducted if user never returns from gateway.
