# AGENTS.md — Janebi Store · Project Reference Document (PRD)

> **Last Updated**: 2026-09-05T09:30:00+03:30  
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
├── scripts/                # Verification & data scripts (verify-all.sh, seed-blog.ts, backup-db.mjs, vps-monitor.py)
├── e2e/                    # Playwright E2E specs (npm run test:e2e)
├── drizzle/                # Migrations — sqlite/ + pg/ (dual dialect, journal-tracked)
├── docs/                   # Baselines (architecture/auth/db/payment/api), SEO handbook, dated review reports
├── .hermes/                # Agent ops state — agents-status.json feed, dashboard widget, reports/ archive
├── .agents/                # Historical multi-agent build archive (briefings/handoffs, Aug 2026)
├── deploy.sh               # Production deploy (rsync + remote docker rebuild, deploy-lock)
├── PROJECT_GRAPH.md        # Permanent architectural knowledge base & live system map
├── TASKS.md                # Task tracker and backlog
├── CHANGELOG_AGENT.md      # Chronological work logs
├── agent.md                # Project status ledger (historical decisions D1-D10, deployment status)
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
8. **`reviews`**: `id`, `productId`, `userId`, `userName`, `userAvatar`, `rating`, `title`, `comment`, `likes`, `isBuyer`, `isVerified`, `approved`, `createdAt`
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
npm run verify      # Adversarial gate: typecheck + Vitest + build + scripts/gate SEC-01/SEC-03 (~2 min)
npm run lint        # tsc --noEmit (strict via tsconfig "strict": true)
npm test            # vitest run (64 suites / 495 tests; 5 PG tests skip unless PG_DATABASE_URL is set)
npm run test:e2e    # Playwright real-user e2e — NOT part of `npm run verify`
bash scripts/gate/test-gate-guards.sh   # regression guards for the SEC-01/SEC-03 gate scripts
npm run build       # Vite client build + Esbuild server bundle
npm start           # node dist/server.cjs (production start)
```

## 🔒 Category Tree Rule (HARD, user-mandated)
The store category structure is CLOSED/FIXED — exactly the user-approved list.
- NEVER create, rename, merge, split, move, or delete any category/subcategory without the user's explicit approval in chat.
- Brands, device models, and technical specs are Attributes/Filters — NEVER categories.
- A product matching no existing category → report to the user first. Creating a category for it is forbidden.
- Any proposed category change goes to the user BEFORE implementation.

---

## 6. Fast verification loop

```bash
npx vitest run --changed HEAD      # diff-scoped first pass — measured 1.1s vs 38s for the full suite
npm run verify                     # full adversarial gate — the ONLY completion authority
npx tsc --noEmit                   # typecheck alone, 1.8s (TypeScript 7 native compiler)
```

Run the scoped pass while iterating; run `npm run verify` before claiming anything is done. A scoped
green is a signal, never evidence of completion.

## 7. Code-intelligence pipeline (use before reading files)

```bash
~/.local/bin/codebase-memory-mcp cli --json search_graph '{"project":"Users-aidin-Desktop-Janebi-Store","query":"…"}'
~/.local/bin/codebase-memory-mcp cli --json trace_path   '{"project":"Users-aidin-Desktop-Janebi-Store","…"}'
~/.local/bin/codebase-memory-mcp cli --json get_architecture '{"project":"Users-aidin-Desktop-Janebi-Store"}'
ast-grep -p '<pattern>' --lang ts server src      # structural; skips comments and strings
```

Graph first (macro), Serena/LSP for named symbols (micro), `ast-grep` for patterns, `read_file` only
where all three are silent. The graph CLI works outside MCP and returns `symbol → file:line` with
scores in ~3.3s.

**Scope rule:** LSP surgery (`find_referencing_symbols`, `replace_symbol_body`) applies to **named
symbols only**. Anonymous route handlers and inline callbacks have no LSP symbol — there the valid
path is graph Route-node isolation (a `Route` with no consumer edges) plus a grep zero-consumer
proof, then `patch`. Never force LSP where no symbol exists; never patch a named symbol without the
reference check.

## 8. Operational traps (paid for — do not re-learn)

- **Project graph:** consult `PROJECT_GRAPH.md` first on any feature/debug turn; update it after
  non-trivial tasks or schema/endpoint changes.
- **Persistent dev DB + tests = residue:** `vitest.config.ts` pins `DATABASE_URL=:memory:`, so
  `npm run verify` does NOT touch `data/janebi.db` (verified 2026-09-24: db mtime unchanged across a
  full verify run). Residue comes from e2e (`data/janebi.e2e.db`) and the live-prod `scripts/audit/*`
  probes — not from the gate. Purge LAST, then verify counts and `integrity_check`.
- **Vitest parallel flake:** rerun the file in isolation; green + untouched files → contention.
- **Peer/self reports are stale by the time you read them:** re-ground on HEAD, prod `BUILD_INFO`
  and live DB counts before confirming a batch is closed.
- **Subagent contracts:** JSON first; a retry restates the evidence. One child per repo+round, ONE
  stamp per round. Verify claims yourself (git log + gate + curl the SERVED artifact).
  `delegate_task` timeout ≠ failure → `action=list`. Goals must be literals.
- **Bulk sed of stamps:** rewrite assertion MESSAGES; flip negative stale-guards; grep
  `!index|!includes`. **Cache-bust grep is per-asset:** exact `file?v=X`, curl each changed asset.
  **Escape drift in seeds:** literal `\n` vs real newline → verify the live API.
- **Deploy:** lock `/tmp/janebi-deploy.lock`; never commit build artifacts; `docker cp` needs an
  ABSOLUTE path; blog seed = esbuild bundle → scp → docker cp → node in-container.
- **Migrations:** PRAGMA-verify prod post-deploy. An empty catch is a bug class.
- **Blog id-vs-slug (recurring KeyError):** `/api/blog` items have NO `slug` key — key on `id`
  (`i.get('slug') or i.get('id')`); briefs must carry the DB id from `seed-blog.ts`, never the
  title-slug from commit messages. A bundled seed smoke-run from `/tmp` fails on the
  better-sqlite3 external — verify via the esbuild output, not require-from-tmp.
- **Shared-tree siblings:** re-read shared files (TASKS / CHANGELOG / tests) right before each patch;
  version asserts track the LATEST sibling bump. Hotspot: `scripts/seed-blog.ts` (a supervisor child
  and the orchestrator cron edit it in overlapping rounds).
- **DOM probes:** try/catch per section; reset ALL filters; scripts via a written file; QA FAIL only
  on direct evidence.
- **`tsx -e` traps:** `npx tsx -e 'await …'` fails (CJS, no top-level await); importing
  `scripts/seed-blog.ts` RUNS `main()` as a side effect — verify via a temp `.ts`, sync import,
  delete after.
- **Environment:** `browser_exec` is unusable on this Mac (needs Chromium as default browser) — after
  2 failures use Playwright via the project venv in the terminal. Never `find` across the whole home
  (~420s). `web_search` 403s → `web_extract` / delegate. Raw-IP curl blocked → delegate the QA child.
  SSH outage: 2 retries then a BLOCKED report (TCP open + ssh refused = fail2ban/sshd, needs the VPS
  console). Oversized inline shell one-liners are blocklisted → write a script file, run it, delete it.
- **Hero art (home):** the home hero is an IMAGE-ONLY banner — no copy, no catalogue cards (the
  first `<div>` inside the hero `<section>` of `Home.tsx`). One absolutely-positioned `<Link>` layer
  per slide, crossfaded on the 6s rotation; the layer itself links to that slide's category and
  carries the `aria-label`, while the page `h1` stays `sr-only`. A slide goes full-bleed **only**
  when its image path starts with `/images/hero/` (`HERO_ART` in `Home.tsx`); the bundled product
  SVGs stay contained on the branded gradient + dot-grid backdrop. Files
  `public/images/hero/slide-{1,2,3}.webp` (1536×1024, subject centred with ~15% margin — desktop
  crops to 2.5:1, phones to 4:3) wired via `store_settings` keys `heroSlide1Image`…`heroSlide3Image`.
  Ken Burns runs on the active layer only; rotation and drift are both off under
  `prefers-reduced-motion`. Slides whose category has no stock are dropped (prod shows 2 of 3).
- **Memory writes:** batch atomically; `replace` `old_text` must match the CURRENT entry; an
  over-limit rejection lists `current_entries` — prune and add in the SAME retry batch.
