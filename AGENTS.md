# AGENTS.md — Janebi Store · Project Reference Document (PRD)

> **Last Updated**: 2026-08-29T18:15:00+03:30  
> **Status**: Production Ready & Deployed  
> **Domain**: https://janebiarena.ir  
> **Root**: `/Users/aidin/Desktop/Janebi-Store`

---

## 1. Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Frontend | React + Vite SPA | React 19, Vite 8 (Rolldown engine), Persian RTL |
| Styling & Theme | Tailwind CSS v4 + Design Tokens | Custom CSS variables (`--color-surface`, `--color-canvas`) |
| Animations | Motion (framer-motion) | Smooth transitions & micro-interactions |
| Routing | React Router DOM | v7 (with single/plural `/products/:id` alias) |
| Icons | Lucide React | Pure SVG vector icons (no text emojis) |
| Backend | Express | v5.1.0 with robust JSON/URL middleware |
| ORM | Drizzle ORM | v0.45.1 (Dual dialect SQLite/PostgreSQL) |
| DB Engine | better-sqlite3 (Prod/Dev) & pg (Ready) | SQLite (`data/janebi.db`) on VPS, PostgreSQL parity ready |
| Validation | Zod | Shared strict input validation |
| Auth | JWT + bcryptjs | HttpOnly cookies + Bearer auth + role protection |
| Rate Limiting | express-rate-limit | Strict auth/OTP limits (5/15min) + general limiter (600/15min) |
| Security | Helmet + CORS + Strict Sanitization | Security headers (HSTS, CSP, XFO, nosniff, referrer) |
| Build & Runtime | Vite + Esbuild | `dist/` (client) + `dist/server.cjs` (node bundle) |
| PWA & Offline | Web App Manifest + Service Worker | Stale-While-Revalidate APIs + Cache-First assets |

---

## 2. Directory Layout

```
Janebi-Store/
├── src/
│   ├── components/         # 40+ Shared UI components (ProductCard, Header, Footer, PictureImage, etc.)
│   ├── contexts/           # React Contexts (Auth, Cart, Toast, Wishlist, Compare)
│   ├── pages/              # 20+ Storefront & Admin page routes (Home, Products, Cart, Checkout, Profile, Admin)
│   ├── lib/                # Shared utilities (Persian digits, phone normalization, price format, API fetch)
│   ├── types/              # Domain TypeScript types
│   ├── App.tsx             # Root router with Suspense/Lazy load boundaries
│   ├── main.tsx            # App entry point + SW registration + PWA setup
│   └── index.css           # Tailwind v4 theme, design tokens, focus rings, Vazirmatn font
├── server/
│   ├── db/                 # Drizzle schemas (schema.ts for SQLite, schema.pg.ts for PostgreSQL)
│   ├── middleware/         # Auth, AdminOnly, RateLimiter, ErrorHandler, RequestId
│   ├── routes/             # Express routes (auth, products, cart, orders, admin, coupons, wishlist, reviews, payment, contact)
│   ├── services/           # Payment gateway adapters (Zarinpal, Saman) & PaymentFailoverRouter
│   └── index.ts            # Server entrypoint with static serving & graceful shutdown
├── tests/
│   ├── api/                # API integration test suites (auth, admin, cart, orders, payment, parity, etc.)
│   ├── unit/               # Unit test suites (invariants, rate-limiting, payment-failover, persian-utils, etc.)
│   └── concurrency/        # Adversarial stock concurrency test suites
├── public/                 # Static assets, local product SVGs, manifest.webmanifest, sw.js
├── scripts/                # Verification and deploy scripts (verify-all.sh, deploy.sh, vps-monitor.py)
├── PROJECT_GRAPH.md        # Permanent architectural knowledge base & live system map
├── TASKS.md                # Task tracker and backlog
├── CHANGELOG_AGENT.md      # Chronological work logs
└── PROJECT_AUDIT.md        # Comprehensive production readiness audit
```

---

## 3. Database Schema (Drizzle SQLite / PostgreSQL Parity)

1. **`users`**: `id`, `name`, `phone` (unique), `email`, `password`, `role` (`customer` | `admin`), `avatar`, `vipPoints`, `createdAt`, `updatedAt`
2. **`addresses`**: `id`, `userId`, `title`, `fullName`, `phone`, `province`, `city`, `address`, `postalCode`, `isDefault`, `createdAt`
3. **`products`**: `id`, `name`, `nameEn`, `slug`, `price`, `originalPrice`, `discount`, `rating`, `reviewsCount`, `image`, `images`, `category`, `brand`, `stockQuantity`, `isNew`, `isSpecial`, `specs`, `description`, `createdAt`
4. **`orders`**: `id`, `userId`, `total`, `discount`, `shippingFee`, `finalTotal`, `status` (`pending` | `processing` | `shipped` | `delivered` | `cancelled`), `paymentMethod` (`online` | `cod`), `paymentStatus` (`pending` | `paid` | `failed`), `shippingAddress`, `shippingMethod`, `notes`, `couponCode`, `vipPointsUsed`, `vipPointsEarned`, `createdAt`, `updatedAt`
5. **`orderItems`**: `id`, `orderId`, `productId`, `name`, `price`, `quantity`, `color`, `image`
6. **`cartItems`**: `id`, `userId`, `productId`, `quantity`, `color`, `createdAt`
7. **`wishlist`**: `id`, `userId`, `productId`, `createdAt`
8. **`reviews`**: `id`, `productId`, `userId`, `userName`, `userAvatar`, `rating`, `title`, `comment`, `likes`, `isBuyer`, `isVerified`, `createdAt`
9. **`coupons`**: `id`, `code` (unique), `discountType` (`percent` | `fixed`), `discountValue`, `minAmount`, `maxDiscount`, `expiresAt`, `isActive`, `createdAt`
10. **`settings`**: `id`, `key` (unique), `value`, `updatedAt`
11. **`contactMessages`**: `id`, `name`, `phone`, `email`, `subject`, `message`, `status` (`unread` | `read` | `archived`), `createdAt`
12. **`newsletterSubscribers`**: `id`, `email` (unique), `createdAt`

---

## 4. API Endpoints

### 4.1 Public Storefront APIs
- `GET /api/health` — DB & system status probe
- `GET /api/products` — Filterable catalogue (category, brand, price, search, pagination)
- `GET /api/products/:id` — Single product details with specs & reviews
- `GET /api/products/:id/reviews` — Product reviews list
- `POST /api/products/:id/reviews` — Submit product review (recomputes product rating dynamically)
- `POST /api/coupons/validate` — Validate discount coupon codes
- `POST /api/contact` — Persist customer contact message
- `POST /api/newsletter` — Subscribe email to newsletter

### 4.2 Auth & User APIs
- `POST /api/auth/register` — Register via Iranian mobile + password
- `POST /api/auth/login` — Authenticate and issue JWT tokens
- `GET /api/auth/me` — Return current authenticated user profile
- `POST /api/auth/otp/send` — Rate-limited SMS OTP dispatch
- `POST /api/auth/otp/verify` — Verify SMS OTP code
- `POST /api/auth/reset-password` — Rate-limited password reset flow
- `GET /api/users/me` — User details and addresses
- `PUT /api/users/me` — Update user profile
- `PUT /api/users/me/password` — Update user password

### 4.3 Shopping Cart, Wishlist & Orders
- `GET /api/cart` — List user cart items
- `POST /api/cart` — Add item with stock limit guard (max 10)
- `PUT /api/cart/:id` — Update cart item quantity
- `DELETE /api/cart/:id` — Remove item from cart
- `DELETE /api/cart` — Clear entire cart
- `GET /api/wishlist` — List user wishlist items
- `POST /api/wishlist` — Toggle/add item to wishlist
- `DELETE /api/wishlist/:id` — Remove item from wishlist
- `POST /api/orders` — Atomic `db.transaction` order creation with stock deduction
- `GET /api/orders` — List user orders
- `GET /api/orders/:id` — Get single order detail
- `POST /api/orders/:id/cancel` — Cancel pending/processing order (restocks items + unwinds VIP points)

### 4.4 Payment Gateways (Failover Router)
- `POST /api/payment/request` — Request payment link (Zarinpal primary, Saman fallback)
- `GET /api/payment/verify` — Verify banking switch transaction and finalize order

### 4.5 Admin Panel APIs (requireAuth + requireAdmin)
- `GET /api/admin/stats` — Dashboard sales, revenue, user, and order statistics
- `GET /api/admin/orders` — Manage all orders with pagination & status filters
- `PUT /api/admin/orders/:id/status` — Lifecycle transition (pending/processing/shipped/delivered/cancelled) with atomic inventory restock on cancel
- `GET /api/admin/products` & `POST /api/admin/products` — Product catalogue management
- `PUT /api/admin/products/:id` & `DELETE /api/admin/products/:id` — Product updates and cascade deletions
- `GET /api/admin/users` — List users securely (passwords omitted)
- `PUT /api/admin/users/:id/role` — Promote/demote user roles
- `PUT /api/admin/users/:id/password` — Admin reset user password
- `GET /api/admin/coupons` & `POST /api/admin/coupons` & `DELETE /api/admin/coupons/:code` — Coupon management
- `GET /api/admin/settings` & `PUT /api/admin/settings` — Persistent store configuration
- `GET /api/admin/messages` — Customer contact messages viewer
- `GET /api/admin/newsletter` — Newsletter subscribers export

---

## 5. Verification Commands

```bash
npm run verify      # Consolidated adversarial quality gate (Typecheck + 297 Vitest tests + Full Build)
npm run lint        # tsc --noEmit (strict TypeScript check)
npm test            # vitest run (36 test suites)
npm run build       # Vite client build + Esbuild server bundle
npm start           # node dist/server.cjs (production start)
```

## 🔒 Category Tree Rule (HARD, user-mandated)
The store category structure is CLOSED/FIXED — exactly the user-approved list.
- NEVER create, rename, merge, split, move, or delete any category/subcategory without the user's explicit approval in chat.
- Brands, device models, and technical specs are Attributes/Filters — NEVER categories.
- A product matching no existing category → report to the user first. Creating a category for it is forbidden.
- Any proposed category change goes to the user BEFORE implementation.
