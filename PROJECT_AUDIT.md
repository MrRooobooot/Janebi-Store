# PROJECT_AUDIT.md — Deep Forensic Audit (Code / DB / Mock-Data / Gaps)

**Project**: Janebi Store (Janebi Arena)
**Date**: 2026-08-31
**Auditor**: Code-Pro (Senior Software Architect & Principal Engineer)
**Scope**: Read-only deep audit — server code, DB schema+prod data, mock/placeholder data, missing features. Per-section scores /100.
**Verification base**: `npm run verify` green (36 suites / 297 tests), live `https://janebiarena.ir` probes, prod SQLite direct inspection (2026-08-31).

---

## 1. Executive Summary

The platform is structurally sound: transactional orders, coupon re-validation server-side, gateway failover, and admin guards are real, tested code — no fabricated test results. The dominant weakness class is **trust-gap data**: seeded fake review counts (up to 450) shown against 2 real reviews, dead OTP in production (no SMS provider), a stale/fabricated `llms.txt` catalog with wrong category slugs, and duplicated/conflicting business constants (3 different support phone numbers, 2 free-shipping thresholds).

Scores range 55–92. Priority fixes are listed per section; all are small, contained changes.

---

## 2. Section Scores (/100)

| # | Section | Score | Verdict |
|---|---------|-------|---------|
| 1 | Auth & Session Security | **90** | Strong; OTP is dead in prod |
| 2 | Payment & Failover | **88** | Solid; minor verify-flow gaps |
| 3 | Orders, Stock & Concurrency | **92** | Best-audited core; near-bulletproof |
| 4 | Cart & Coupons | **82** | Server-side correct; client discount display drift |
| 5 | Product Catalog & Reviews | **62** | Fake aggregate ratings — worst data-integrity issue |
| 6 | Brands & Categories | **70** | Counts live; metadata hardcoded in seed file |
| 7 | Admin Panel | **85** | Full CRUD real; backup stream lacks VACUUM/consistency |
| 8 | Home & Storefront UI | **78** | Hero slide hack; dead `/api/reviews/latest` |
| 9 | Static Pages (About/Blog/Contact…) | **75** | Real APIs; blog DB empty (0 posts) |
| 10 | PWA / SW / Caching | **72** | SW default branch cache-first traps `/api/settings` |
| 11 | Database Schema & Parity | **68** | PG schema misses `blog_posts`; zero secondary indexes |
| 12 | Prod DB Hygiene | **74** | 5 leftover scratch tables; 9 stale test coupons |
| 13 | AI-SEO / AEO (llms.txt, JSON-LD) | **55** | Fabricated stats + dead links — actively harmful |
| 14 | Search & Filtering | **80** | Real SQL; `LIKE` unescaped `%`/`_` |
| 15 | Security Headers & Rate Limits | **88** | Helmet+CSP+limits verified live |

---

## 3. Findings — Detail & Evidence

### 3.1 Auth & Session (90)
**Verified good**: bcrypt(10), Bearer+cookie dual read (`server/middleware/auth.ts:16-24`), DB-backed user re-check per request (revocation works), refresh rotation with HttpOnly cookie, boot-refresh in `AuthContext`, 5/15min rate limits, `authenticate+requireAdmin` mounted on the whole admin router (`admin.ts:11`).

**Gaps**:
- **OTP is a dead feature in production.** `auth.ts:231-241`: no SMS provider integration exists; in prod the code is generated into in-memory `otpStore` and *never delivered*. Frontend (`Login.tsx:47`, `AuthContext.tsx:131`) exposes OTP login/reset-password UI that cannot work on live. Fix: integrate Kavenegar/Ghasedak or hide OTP UI until a provider is configured.
- `otpStore` is in-memory — restart wipes pending codes (acceptable single-instance; document it).
- Password policy only min-length in Zod; no complexity rule (acceptable for v1, note it).

### 3.2 Payment & Failover (88)
**Verified good**: ownership check before gateway call (`payment.ts:22-28`), idempotent verify (status!==`pending_payment` short-circuit), failure→restock+VIP-refund inside `db.transaction`, dummy-authority path gated behind `NODE_ENV!=="production"` (`payment.ts:120-127`), circuit breaker with HALF_OPEN recovery (tested).

**Gaps**:
- `/api/payment/verify` is unauthenticated by design (gateway redirect) — correct, but it trusts `req.query.provider` (`payment.ts:145`) to pin the verify gateway. An attacker with a valid authority can force the wrong adapter. Low risk (authority is server-issued), still remove the client-influenced override or sign it.
- Verify error log prints full gateway payload (`console.error('Payment Verification Error:', verifyResult)`) — noisy, and log leak of raw response shapes. Route through pino with redaction.
- Amount check: Zarinpal v4 verify returns verified amount; code does not compare it to `order.total` (gateway-side check exists but explicit comparison = defense-in-depth).
- The 24h prod log showed a real Zarinpal `-51` (session expired) handled correctly → user redirected to failed callback. Works, but the order stayed `pending_payment` until verify was called — the restock ran only because the user's browser hit verify. **No reaper for abandoned `pending_payment` orders** → stock stays deducted indefinitely if the user never returns. Add a cron/SWEEP: cancel+restock orders pending > 60min.

### 3.3 Orders, Stock & Concurrency (92)
**Verified good**: single `db.transaction` wraps product re-fetch (server-side prices from DB, never client), stock guard, coupon re-validation, VIP deduction, insert, cart clearing (`orders.ts:70-250`); cancel restocks + refunds points; aggregate duplicate product IDs before stock check; adversarial 50-shopper race test passes; free-shipping threshold mirrored exactly from shared constants.

**Gaps**:
- Order `id` = `ORD-<rand>` text PK — fine, but no `createdAt` column (only `date` text). Time analytics rely on string sort of ISO — currently correct, fragile.
- `orders.userId` nullable (guest orders by design?) — but checkout requires auth via `authFetch`; a null userId order is unreachable from UI. Tighten schema or document guest path.

### 3.4 Cart & Coupons (82)
**Verified good**: stock + max-10 guards on add (`cart.ts:51-69`), server re-validates coupon (active/expiry/minTotal/percent-capped) inside the order transaction (`orders.ts:122-145`), validate endpoint public but stateless.

**Gaps**:
- **Client/server discount drift**: `CartSummaryCard` shows `cartTotal - discount` with standard shipping only (`CartSummaryCard.tsx:30`), while checkout recomputes with express option; coupon discount displayed on cart page may differ from final server-computed total. Not exploitable (server wins) but confusing UX.
- `/api/coupons/validate` is unauthenticated and unthrottled beyond global 600/15min → coupon-code brute force (WELCOME10-style codes enumerable). Add per-IP limiter (e.g. 10/15min).
- Coupon table has no `usageLimit`/`usedCount` — a single-use campaign code cannot exist. Schema gap.

### 3.5 Product Catalog & Reviews (62) — **worst area**
**Verified good**: review POST recomputes AVG+count transactionally (`products.ts:186-203`), reviews cache invalidated, verified-buyer flag set by order lookup, XSS-safe rendering (no user HTML anywhere; 1 `dangerouslySetInnerHTML` = JSON-LD only).

**Gaps — must fix**:
1. **Fake aggregate ratings in prod.** Seed data hardcodes `rating: 4.8, reviewsCount: 56/30/88/128/210/310/450` per product; DB has exactly **2 real reviews** (both product 1). ProductDetail prints "۴.۹ از ۵ (۴۵۰ نظر)" (`ProductDetail.tsx:284`) — a fabricated trust signal, and reviews tab shows "۴۵۰" over an empty list. ProductCard falls back to `'۴.۸'` when rating missing (`ProductCard.tsx:111`). This is the single largest credibility bug on the site.
   **Fix**: one-time SQL: recompute all aggregates from `reviews` table (most products → rating 0, count 0), and stop seeding fake numbers (`seed-data.ts` + `server/index.ts:36-62` seed path).
2. `DEFAULT_REVIEWS` fallback in `ProductReviews.tsx:31-59` — on API failure shows fabricated reviews as if real. Remove the fake fallback; show an error/empty state instead (mock-data rule).
3. Product images are static local SVGs (`/products/*.svg`) — fine for now, no admin upload path (documented operator gap).

### 3.6 Brands & Categories (70)
**Verified good**: `/api/brands` computes counts live from DB and appends operator-added brands (`brands.ts:18-52`); categories via GROUP BY aggregate + cache (`categories.ts`).

**Gaps**:
- Brand metadata (faName, logo, desc) lives in `server/data/seed-data.ts:208` `ALL_BRANDS` — code-level constant, not admin-editable. Violates the operator-manageability principle; a new brand added via product edit gets empty `faName`/`desc`.
- No `brands`/`categories` tables; category rename = full products-table update. Acceptable at current scale, document the ceiling.

### 3.7 Admin Panel (85)
**Verified good**: `router.use(authenticate, requireAdmin)` on all 25 routes; stats/analytics use SQL aggregates; product delete cascades cart/wishlist/compare refs; role promotion + password reset present; settings persisted in `store_settings`.

**Gaps**:
- `/api/admin/backup` streams the raw SQLite file while WAL is active (`admin.ts:719-734`) → backup may be mid-transaction/torn. Use `VACUUM INTO` or sqlite `backup API`.
- `/settings` PUT does not invalidate `appCache` used by `/api/settings` public GET (15s nginx + SW layer on top) → admin sees success but storefront lag is opaque (up to minutes for SW clients; see §10).
- `users/:id/points` allows arbitrary VIP point set — fine for ops, but no audit log of admin actions (who changed what). Add minimal `admin_audit` table later.
- Messages viewer exists but 430 contact messages with no pagination cap in UI (fetches all; 430 rows OK now).

### 3.8 Home & Storefront UI (78)
**Verified good**: deals/tabs computed from live `/api/products` (`Home.tsx:116-129`), BrandShowcase marquee now loop-safe with live counts, hero content from settings API.

**Gaps**:
- **Hero slide 1 guard is a content hack**: `settings.heroSlide1Title && !settings.heroSlide1Title.includes('فست')` (`Home.tsx:46-47`) — client-side reject of a specific old value. If the operator saves a title containing 'فست' it is silently replaced by hardcoded text. Move the default to the server DEFAULTS and drop the client hack.
- `/api/reviews/latest` (`reviews.ts`) is mounted but **no frontend consumer** (dead endpoint) — homepage has no testimonials section at all. Either build the section (real reviews only) or delete the route.
- Hero images hardcoded paths (`/products/hld-13.svg` etc.) while settings carry only text fields — operator can't change hero imagery without a deploy.

### 3.9 Static Pages (75)
**Verified good**: Contact posts to real `/api/contact` (430 real messages prove usage), Brands page live from `/api/brands`, Offers/NewProducts live from `/api/products`, Privacy/Terms/FAQ real content, empty-state messaging honest.

**Gaps**:
- `blog_posts` table exists with full admin CRUD (`blog.ts`) but **0 rows in prod** — Blog page shows "به زودی" forever. Seed 2-3 real posts or hide nav entry until content exists.
- `NewProducts`/`Offers` duplicate Products-page logic instead of reusing `useProductFilters` (drift risk on sort params).

### 3.10 PWA / SW / Caching (72)
**Verified good**: precache list correct, skipWaiting+clients.claim so updates land next load, hashed assets never stale (cache key = URL), API SWR for products/categories, navigation network-first, reduced-motion guards added.

**Gaps**:
- **SW default branch is cache-first for every other GET** (`sw.js:106-111`) → `/api/settings`, `/api/coupons-active`, `/api/reviews/latest`, `/api/blog` are served from cache **forever** once seen (they're never invalidated). Admin setting changes / new blog posts may never reach returning PWA clients. Fix: default branch → network-first (or add those paths to the SWR list).
- `CACHE_NAME` never bumped (v1.0.0 since creation) — combined with the above, stale settings have been shipping for weeks.
- `manifest.webmanifest` still `theme_color: #ea580c` + `background_color: #08090a` — palette was migrated to Kinetic Commerce (`#f47c20` family / Deep Space) in `index.css`; manifest/`<meta theme-color>` now disagree with live CSS.
- iOS doesn't support SVG mask icons; no 192/512 PNG fallback → "Add to Home Screen" icon may be blank on older iOS.

### 3.11 Database Schema & Parity (68)
**Verified good**: 14 SQLite tables, Drizzle relations complete, PG migrations auto-applied idempotently on boot (`db/index.ts:32-55`), `integrity_check` = ok on prod, better-sqlite3 sync transactions for SQLite + portable async wrapper.

**Gaps**:
1. **`schema.pg.ts` is missing `blogPosts`** — SQLite has it (`schema.ts:150-161`), PG does not. The parity claim in PROJECT_GRAPH ("100% column and relation parity verified") is **no longer true** since blog_posts was added. PG boot tolerates missing table only because blog route would 500 on PG dialect. Fix: add `pgTable('blog_posts', …)` + matching relation.
2. **Zero secondary indexes.** Prod `EXPLAIN QUERY PLAN`: `SCAN orders` for user lookup, `SCAN reviews` for product lookup. Only unique-indexes exist (phone, sku). Needed at minimum: `orders(user_id)`, `order_items(order_id)`, `reviews(product_id)`, `cart_items(user_id)`, `wishlist_items(user_id)`, `addresses(user_id)`, `contact_messages(status, created_at)`. Cheap now (2 orders / 430 msgs), mandatory before real traffic.
3. No `createdAt` on orders/users (text `date`/`joined_date` only) — analytics sorting fragile.
4. `coupons` lacks `usageLimit`/`usedCount` (see §3.4).

### 3.12 Prod DB Hygiene (74)
**Verified data**: users 364 (5 admin), products 14, orders 2 (both cancelled), order_items 2, reviews 2, addresses 1, cart 4, wishlist 3, newsletter 0, contact 430, blog 0, coupons 11 active (9 are stale test rows `E2ECOUPON_*`/`EXPIRED_*`/`LIVE_*` ×3 pairs), store_settings 4 hero keys.

**Gaps**:
- **5 leftover scratch/test tables in the production DB**: `scratch_t`, `scratch_t2`, `s3`, `s4`, `mutex_t` — plus a stray empty `store.db` (0 bytes, Aug 27) and legacy `janebi-consistent.db` / `janebi-corrupt.db` files in the data dir. Drop the tables, delete the stray files after next backup.
- 9 stale test coupons visible to any visitor via `/api/coupons-active` (VipClub tab lists them as real offers). Delete or deactivate.
- Contact messages 430 and never archived → trim/archive policy needed.

### 3.13 AI-SEO / AEO (55) — actively wrong today
- `public/llms.txt` phone `۰۲۱-۸۸۸۸۸۸۸۸` vs live settings `۰۲۱-۸۸۸۸۹۹۹۹` vs address "چارسو" vs settings "مجتمع نور" — the AI-facing doc contradicts the storefront.
- Its 7 category links use **nonexistent category slugs** (`کاور و قاب`, `گلس و محافظ صفحه`, `شارژر و آداپتور`, `کابل شارژ`, `هندزفری و هدفون`, `هولدر و پایه نگهدارنده`) → all return `[]` on live API (verified). Real slugs: `قاب و کاور`, `گلس`, `شارژر`, `کابل`, `هندزفری`, `هولدر و پایه`.
- `pricing.md`/`llms-full.txt` contain the same fabricated product-count era data.
- JSON-LD Product schema (`ProductDetail.tsx:66-91`) emits the fake `rating`/`reviewCount` values → AI/search engines ingest fabricated trust data. After fixing §3.5(1), these become honest automatically.
- `DynamicBreadcrumbs.tsx:137-150` injects URL-path-derived strings into JSON-LD without `</script>` escaping — self-XSS-shaped, low risk (path not rendered as HTML), fix with `.replace(/</g,'\\u003c')` while touching the file.

### 3.14 Search & Filtering (80)
**Verified good**: SQL-side category/brand/price/stock/discount filters, real COUNT aggregate, pagination headers, `popular` sort by rating, client cache + X-Cache headers.

**Gaps**:
- `search` interpolates user input into LIKE pattern (`products.ts:34`) — `%`/`_` wildcards unescaped (functional oddity, not injection). Escape or FTS5 later.
- Sort by rating will rank products by the fake aggregates until §3.5(1) is fixed.

### 3.15 Security Headers & Rate Limits (88)
Live-verified on every response: full Helmet CSP (self + zarinpal/google hosts), HSTS, XFO, nosniff, referrer-policy, COOP/CORP, rate-limit headers (600/15min), auth limiter 5/15min tested. Gaps: CSP allows `style-src 'unsafe-inline'` (Tailwind runtime needs it today); no `Permissions-Policy` header; no CSP `report-uri` observability.

---

## 4. Mock / Fabricated Data Inventory (action list)

| Location | What | Severity | Action |
|---|------|----------|--------|
| `seed-data.ts` products `rating`/`reviewsCount` | Fake 4.x ratings, 30–450 fake counts | HIGH | Recompute from `reviews`; zero-out seeds |
| `ProductReviews.tsx:31-59` `DEFAULT_REVIEWS` | Fabricated reviews on API failure | HIGH | Replace with error/empty state |
| `ProductCard.tsx:111` `'۴.۸'` rating fallback | Fabricated default rating | HIGH | Show nothing when 0 |
| `public/llms.txt`, `llms-full.txt`, `pricing.md` | Fake counts, wrong slugs/phone/address | HIGH | Regenerate from live API |
| ChatWidget `generateBotResponse` | Rule-based bot posing as support | MED | Honest label «دستیار هوشمند» + real settings values (already uses them) |
| `useStoreSettings.ts` FALLBACK block | Static contact data differing from server DEFAULTS | MED | Single-source the constants |
| Scratch tables + test coupons in prod DB | Test residue | MED | Drop/delete |
| `sw.js` CACHE_NAME `v1.0.0` | Stale-version hygiene | LOW | Bump + fix §3.10 |

---

## 5. Scorecard Rationale (compact)

Scores combine: correctness (verified by tests + live probes), data integrity (mock audit), operational safety (backup/cache/logs), and operator-manageability (admin can run the store without code changes). The two sub-60 scores (Catalog 62, AI-SEO 55) are both rooted in the same seeded-fake-data problem — one coordinated fix (recompute aggregates + regenerate AI files + remove client fallbacks) lifts both to ~85.

---

## 6. Remediation Priority

1. **P0** — Recompute real ratings/counts; delete fake seed aggregates; remove `DEFAULT_REVIEWS` fallback and `ProductCard` default rating.
2. **P0** — Abandoned-`pending_payment` reaper (stock stuck deducted).
3. **P1** — SW default branch network-first + bump CACHE_NAME; settings PUT invalidates appCache.
4. **P1** — PG schema `blog_posts` parity; secondary indexes migration.
5. **P1** — Regenerate `llms.txt`/`llms-full.txt`/`pricing.md` from live API; fix phone/address conflicts (single source: store settings).
6. **P2** — SMS provider for OTP (or hide OTP UI); coupon limiter + usageLimit schema; backup via `VACUUM INTO`; drop scratch tables + stale coupons; manifest theme colors; JSON-LD `</script>` escape; remove `/reviews/latest` or build section.

**Sign-off**: Audit evidence-based, zero code changed during this audit. All claims above carry file:line or live-probe evidence.
