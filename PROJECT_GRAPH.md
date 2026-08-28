# ARCHITECTURE & PROJECT GRAPH — JANEBI ARENA

> **Autonomous Engineering Knowledge Base & Live System Map**
> **Last Verified & Updated:** 2026-08-29
> **Status:** Live & Production Ready (36 test suites, 297 passing tests)

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
- **Design Tokens & Theme:** `src/index.css` (Obsidian dark canvas `--color-canvas`, glassmorphic cards `--color-surface`, standard focus rings).
- **Persian Normalization & Utils:** `src/lib/utils.ts` (`toPersianDigits`, `toEnglishDigits`, `normalizeIranianMobile`, `isValidIranianMobile`, `formatPrice`).
- **PWA & Offline:** `public/manifest.webmanifest`, `public/sw.js` (Cache-first for assets, Stale-while-revalidate for API).

---

## 3. Critical Invariants & Rules (Non-Negotiable)

1. **Transactional Stock & Checkout:** Always wrap order placement and cancellation in `db.transaction`. Stock must never go negative.
2. **Iranian Mobile & Persian Inputs:** Input phone numbers must strictly normalize to `09XXXXXXXXX` format using `normalizeIranianMobile`.
3. **Admin Security Gate:** All admin endpoints must be defended by `requireAuth` + `requireAdmin` (401/403).
4. **Verification Requirement:** Every implementation turn must pass:
   ```bash
   npm run verify
   ```
   (Runs strict `tsc --noEmit`, all 291 Vitest unit/stress/concurrency tests, and full production build).

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
