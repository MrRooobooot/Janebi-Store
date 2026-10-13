# AGENTS.md — Janebi Store · Project Reference Document (PRD)

> **Last Updated**: 2026-09-05T09:30:00+03:30 (content) · 2026-10-10: doc paths updated for the `docs/` reorganisation only — rest of this file not re-verified; current test counts are in `tests/README.md` · 2026-10-13: docs standardised (`docs/documentation-standard.md`); ledgers moved to `docs/ledger/` and `docs/reference/project-graph.md`; §1–§4 corrected against code (versions, layout, schema, endpoints, rate limits)
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
| Backend | Express | v5 (`express` ^5.2.1) with JSON/URL middleware |
| ORM | Drizzle ORM | v0.45 (`drizzle-orm` ^0.45.2, SQLite) |
| DB Engine | better-sqlite3 | SQLite (`data/janebi.db`) — the only supported database |
| Validation | Zod | Shared strict input validation |
| Auth | JWT (`jsonwebtoken`) + bcrypt (`bcrypt` ^6, 10 rounds) | HttpOnly cookies + Bearer auth + role protection |
| Rate Limiting | express-rate-limit | Auth/OTP: 5 requests per minute per IP; general `/api/` limiter: 600 per 15 min |
| Security | Helmet + CORS (allow-list from `APP_URL` / `CORS_ORIGIN`) | Security headers via Helmet, CSP with hash-pinned inline scripts |
| Build & Runtime | Vite + Esbuild | `dist/` (client) + `dist/server.cjs` (node bundle) |
| PWA & Offline | Web App Manifest + Service Worker | Stale-While-Revalidate APIs + Cache-First assets |

---

## 2. Directory Layout

```
Janebi-Store/
├── src/
│   ├── components/         # 40+ Shared UI components (ProductCard, Header, Footer, PictureImage, etc.)
│   ├── contexts/           # React Contexts (Auth, Cart, Compare, Theme, Toast, Wishlist)
│   ├── pages/              # 20+ Storefront & Admin page routes (Home, Products, Cart, Checkout, Profile, Admin)
│   ├── lib/                # Shared utilities (Persian digits, phone normalization, price format, API fetch)
│   ├── types/              # Domain TypeScript types
│   ├── App.tsx             # Root router with Suspense/Lazy load boundaries
│   ├── main.tsx            # App entry point + SW registration + PWA setup
│   └── index.css           # Tailwind v4 theme, design tokens, focus rings, Vazirmatn font
├── server/
│   ├── db/                 # Drizzle schema (schema.ts) and SQLite client
│   ├── middleware/         # auth (authenticate, requireAdmin), validate, errorHandler, requestId; rate limiters are defined in app.ts
│   ├── routes/             # Express routers mounted in app.ts (auth, products, cart, orders, admin/ sub-routers, coupons, wishlist, reviews, payment, contact, users, blog, settings, brands, categories, upload)
│   ├── services/payment/   # ZarinpalAdapter, SamanAdapter, PaymentFailoverRouter (per-gateway circuit breaker)
│   └── index.ts            # Server entrypoint with static serving & graceful shutdown
├── tests/
│   ├── api/                # API integration test suites (auth, admin, cart, orders, payment, parity, etc.)
│   ├── unit/               # Unit test suites (invariants, rate-limiting, payment-failover, persian-utils, etc.)
│   └── concurrency/        # Adversarial stock concurrency test suites
├── public/                 # Static assets, local product SVGs, manifest.webmanifest, sw.js
├── scripts/                # Operator tooling in gate/, audit/, ops/, data/, oneoff/ (see scripts/README.md); verify-all.sh is the gate
├── e2e/                    # Playwright E2E specs (npm run test:e2e)
├── drizzle/                # Migrations — sqlite/ (journal-tracked)
├── docs/                   # README.md (index) · documentation-standard.md · ledger/ (tasks.md, changelog-agent.md) · reference/ (living, incl. project-graph.md) · reports/ (dated, frozen) · archive/ · data/ · business/
├── .hermes/                # Agent ops state (git-ignored)
├── deploy.sh               # Production deploy (rsync + remote docker rebuild, deploy-lock)
├── README.md               # Public overview (GitHub front page)
└── AGENTS.md               # This file: rules, stack, verification commands
```

---

## 3. Database Schema (Drizzle SQLite)

15 SQLite tables, defined in `server/db/schema.ts`: `users`, `addresses`, `products`, `product_features`, `orders`, `order_items`, `reviews`, `coupons`, `cart_items`, `wishlist_items`, `contact_messages`, `newsletter_subscribers`, `store_settings`, `blog_posts`, `audit_logs`. Column-level detail, money units and casing rules: `docs/reference/database-baseline.md`.

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
- `POST /api/contact/newsletter` — Subscribe email to newsletter

### 4.2 Auth & User APIs
- `POST /api/auth/register` — Register via Iranian mobile + password
- `POST /api/auth/login` — Authenticate and issue JWT tokens
- `GET /api/auth/me` — Return current authenticated user profile
- `POST /api/auth/refresh`, `POST /api/auth/session`, `POST /api/auth/logout` — token lifecycle; `GET /api/auth/otp/status` — OTP availability flag
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
- `GET /api/orders` (also `GET /api/orders/my-orders`) — List user orders
- `GET /api/orders/:id` — Get single order detail
- `POST /api/orders/:id/cancel` — Cancel pending/processing order (restocks items + unwinds VIP points)

### 4.4 Payment Gateways (Failover Router)
- `POST /api/payment/request` — Request payment link (Zarinpal primary, Saman fallback)
- `GET /api/payment/verify` — Verify banking switch transaction and finalize order

**Payment-session TTL (single source of truth: `server/routes/payment.ts`)**
- The payment expiry window is **45min anchored on `payment_requested_at`** (written in the same statement that stores a fresh authority). The order's `created_at` never bounds a payment session — an order may sit pending for hours before anyone clicks Pay.
- A live session (`< 45min`) is returned unchanged (`reused:true`). Past 45min the dead authority is cleared and a **fresh** one is minted on the next Pay click; the order stays `pending_payment` (expired callbacks redirect with `status=expired`, they do not cancel).
- Reaper (`reapAbandonedOrders`, every 5min) cancels only `pending_payment` orders with `ref_id IS NULL`: `payment_requested_at + 45min`, plus a 24h `created_at` window for carts that never reached a gateway.
- Both cancel paths (verify + reaper) flip the status **conditionally first**, then restock/refund only if they won — a concurrent real verify always wins and a paid order is never cancelled or double-restocked. `vip_points_used` must be read **before** the flip zeroes it.
- Prod DB `orders` column casing is mixed: `payment_requested_at`, `payment_amount`, `payment_url`, `vip_points_used`, `created_at`, `user_id` are snake_case; `refId`, `statusText`, `authority` are as-is. `order_items` uses `order_id`/`product_id`/`qty`. Read the schema (`pragma_table_info`) before writing ops probes.

### 4.5 Admin Panel APIs (`authenticate` + `requireAdmin`, applied by `router.use` in `server/routes/admin.ts`)
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
- `GET /api/admin/contact-messages` — Customer contact messages viewer
- `GET /api/admin/newsletter` — Newsletter subscribers export

---

## 5. Verification Commands

```bash
npm run verify      # Adversarial gate: typecheck + Vitest + build + scripts/gate SEC-01/SEC-03 (~2 min)
npm run lint        # tsc --noEmit (strict via tsconfig "strict": true)
npm test            # vitest run (SQLite only)
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

> On 2026-10-13 `~/.local/bin/codebase-memory-mcp` was not installed at that path. The commands below apply only where the binary exists; `ast-grep` and grep work everywhere.

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

- **Project graph:** consult `docs/reference/project-graph.md` first on any feature/debug turn; update it after
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
- **Product photos:** the git source is `assets/product-photos/` (tracked). Run
  `scripts/ops/sync-product-photos.sh --vps` to copy them into the runtime folder
  `/home/ubuntu/Janebi-Store/public/images/products` (bind-mounted to `/app/public/images`, served at
  `/images`) and `dist/images/products` (nginx root). Record each new file in
  `docs/data/product-photos.json` (source, SHA-256, check). Backed up nightly by
  `scripts/ops/backup-product-photos.sh` (cron 02:40, Bale off-box). Rows inserted by script bypass
  `logAudit` and `appCache.invalidate`: use the admin API, or pair a script with a restart, and say so
  in the changelog.
- **Product prices:** a product with `cost_price` set is priced by `scripts/ops/reprice-from-cost.cjs`
  (sale = cost × 1.20 by default, rounded up to 5,000 toman, floor 10%, one `audit_logs` row per
  change). Run `--dry-run` first, then `--apply`; add `--publish` to show hidden costed products.
  Products without `cost_price` (MCdodo, Earldom) keep the owner's sale price. Back up the DB first.
- **Migrations:** PRAGMA-verify prod post-deploy. An empty catch is a bug class.
- **Blog id-vs-slug (recurring KeyError):** `/api/blog` items have NO `slug` key — key on `id`
  (`i.get('slug') or i.get('id')`); briefs must carry the DB id from `scripts/data/seed-blog.ts`, never the
  title-slug from commit messages. A bundled seed smoke-run from `/tmp` fails on the
  better-sqlite3 external — verify via the esbuild output, not require-from-tmp.
- **Shared-tree siblings:** re-read shared files (`docs/ledger/tasks.md` / `docs/ledger/changelog-agent.md` / tests) right before each patch;
  version asserts track the LATEST sibling bump. Hotspot: `scripts/data/seed-blog.ts` (a supervisor child
  and the orchestrator cron edit it in overlapping rounds).
- **DOM probes:** try/catch per section; reset ALL filters; scripts via a written file; QA FAIL only
  on direct evidence.
- **`tsx -e` traps:** `npx tsx -e 'await …'` fails (CJS, no top-level await); importing
  `scripts/data/seed-blog.ts` RUNS `main()` as a side effect — verify via a temp `.ts`, sync import,
  delete after.
- **Environment:** `browser_exec` is unusable on this Mac (needs Chromium as default browser) — after
  2 failures use Playwright via the project venv in the terminal. Never `find` across the whole home
  (~420s). `web_search` 403s → `web_extract` / delegate. Raw-IP curl blocked → delegate the QA child.
  SSH outage: 2 retries then a BLOCKED report (TCP open + ssh refused = fail2ban/sshd, needs the VPS
  console). Oversized inline shell one-liners are blocklisted → write a script file, run it, delete it.
- **Hero (home):** a 2:1 product photo with HTML type on the empty right. `HERO_COPY` in
  `Home.tsx` is the only copy source — the homepage does not read `heroSlide*` settings.
  Photos are `public/images/hero/holder.webp` and `cable.webp` (1600×800, product on the left,
  no type inside the file). The frame is `aspect-[2/1]` with `object-cover`, so phone and laptop
  share one crop. Two slides, one per live category («هولدر و نگهدارنده», «کابل و سیم»). Each
  slide is an absolutely-positioned `<Link>`, crossfaded on a 6s rotation that stays off under
  `prefers-reduced-motion`. Arrows sit in a bottom bar. The page `h1` stays `sr-only`.
  A category missing from the live catalogue drops its slide. Do not point the hero back at
  `slide-1.webp` / `slide-3.webp`.
- **Memory writes:** batch atomically; `replace` `old_text` must match the CURRENT entry; an
  over-limit rejection lists `current_entries` — prune and add in the SAME retry batch.
