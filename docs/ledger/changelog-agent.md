# Change log — Janebi Store · change log

> **Status:** living, append-only · **Updated:** 2026-10-13 · **Scope:** one `## YYYY-MM-DD — title — status` entry per landed change, newest first.
> **Role:** agent-facing change log — commit, what moved, how it was verified.
> Open work and priorities live in `docs/ledger/tasks.md`; the system map lives in `docs/reference/project-graph.md`. On 2026-10-13 the entries dated 2026-08-28 to 2026-09-02 were moved from the old `## [date] - title` style to this heading format, and all entries were sorted newest first. Entry text is unchanged.

## 2026-10-13 — Admin product form: category options now the approved 14
- `src/pages/admin/Products.tsx`: the category dropdown is built from `APPROVED_CATEGORIES` (new `src/lib/approvedCategories.ts`), replacing 8 hard-coded names of which 7 were not in `docs/reference/CATEGORY-TREE.md`. `CATEGORY_DEFAULT_IMAGES` and `PRESET_GALLERY` use the approved names. A category value that is not approved, if one already exists on a product, is kept as an extra option so editing cannot silently change it.
- New test `tests/unit/approved-categories.test.ts` keeps the code list identical to the locked doc. Typecheck passes. Server-side validation is not changed (see tasks).

## 2026-10-13 — Status check: the 2026-10-12 SEO pass and PostgreSQL removal are live
- Verified against the served site, not the working tree: `/BUILD_INFO` returns release `1e999f8`, which contains the SEO commit `054e940` (ancestor check passes). Unknown blog URL → 404; `/cart` has its own title. The "LOCAL ONLY, not deployed" headings below describe the moment they were written, not the current state. PostgreSQL: on the VPS the `postgresql` service is inactive, no postgres process runs, and the only container is `janebi-store` (read-only check). The app rejects `postgres://` URLs at startup (`server/db/index.ts`); `package.json` has no PostgreSQL driver.

## 2026-10-12 — SEO release blockers fixed (phase 4) — LOCAL ONLY, not committed, not deployed
- **Article lookup failure is 503, not 404:** `server/lib/seoMeta.ts` `articleMeta` throws `SeoLookupUnavailable` on a database error (a missing or unpublished article still returns null → 404). `unavailableFor` answers 503 with `Retry-After: 60` and `Cache-Control: no-store`, and a fixed body with no error text; the detail goes to the server log only. Products keep the generic shell on failure, as before. Verified on a production build: a healthy copy answers 200 / 404 / 404; a copy without `blog_posts` answers 503 (`no such table: blog_posts` in the server log only). `/about` and `/products/:id` unchanged.
- **`/contact` metadata:** the description named WhatsApp, Instagram and Telegram, which appear nowhere in `src/`. It now names the phone number, the email address and the contact form that the page shows.
- **`/offers` metadata:** the title («ویژه و محدود») and description («تخفیف‌های جاری») promised a live, limited discount, while the page can be empty. Both are replaced with neutral section wording. No figure, percentage or time window.
- **Guards:** `tests/unit/route-registry.test.ts` now checks that `/contact` names only channels in `Contact.tsx`, and that `/offers` makes no discount promise. `tests/unit/route-seo-pages.test.ts` checks the database-error path with one mocked query (the database is not touched).
- **Docs:** `docs/reference/project-graph.md`, `docs/reference/seo-baseline.md` and `docs/reference/seo-claims.md` now describe the code as it is. The «no unbacked claim» invariant is replaced by the exact guard scope. The «ارسال سریع» reasoning is corrected: Terms states the delivery timing. Open owner decisions are listed in `seo-claims.md`; none was decided in code.
- **Verification (local, scratch data):** `tsc --noEmit` exit 0; `npm run build` exit 0; `npm run verify` exit 0 (Vitest 79 files passed / 1 skipped; 635 tests passed / 5 skipped — the 5 are PostgreSQL tests needing `PG_DATABASE_URL`, not run); rate-limit proof, SEC-01 and SEC-03 pass. Browser `e2e/route-seo.spec.ts` + `e2e/route-seo-coverage.spec.ts`: 32 passed, 0 skipped, against the phase 4 build on a scratch copy of the local fixture database.
- **Still open (owner decisions, not changed):** legal scope of the authenticity guarantee and «سلامت فیزیکی»; the «شرایط گارانتی» promise in Terms; the superlatives and «۲۴/۷» support claim in About; direct-sourcing and hologram claims in About, Footer and Brands; the visible «اورجینال» and «ویژه و محدود» headings. Full list in `docs/reference/seo-claims.md`.

## 2026-10-12 — SEO coverage and metadata ownership (3 phases) — LOCAL ONLY, not committed, not deployed
- **Registry + owners:** `src/lib/routeSeo.ts` is the one static table (server and client). `src/components/RouteHead.tsx` writes static, admin and 404 heads and resets on route change; Products, ProductDetail and Blog own their dynamic heads. Details in `docs/reference/project-graph.md` (section «SEO metadata ownership»).
- **Server:** every public route now gets its own title, canonical, robots and Twitter tags (previously 8 account/checkout/admin routes and both 404 kinds carried the homepage head). Unknown and unpublished `/blog/:slug` answer HTTP 404 (were 200 soft 404). 404 pages have no canonical or og:url.
- **Catalogue count:** `useProductFilters` starts `loading=true`, so the JSON-LD `numberOfItems` is written only after the first settled result. Before: `3` (SSR) → `0` → `3` in the browser. After: `3` → `3`.
- **JSON-LD:** BlogPosting no longer appears twice on a direct article load; the article keeps the server breadcrumb; the homepage FAQ block is not cleared by a child reset (caught by probe during this pass, fixed, tested).
- **Copy:** unbacked claims removed from metadata and from three visible catalogue/product lines (see `docs/reference/seo-claims.md`). Homepage title unchanged; homepage description, og and twitter descriptions and the Organization JSON-LD changed in `index.html` and mirrored in `HOME_SEO`.
- **Docs:** `docs/reference/seo-baseline.md` (ownership, before/after measurements, limits), `docs/reference/seo-claims.md` (claim register), `docs/README.md` index rows.
- **Verification (local):** `npm run verify` exit 0 (typecheck, Vitest 79 files passed / 1 skipped, 625 tests passed / 5 skipped — the 5 are PostgreSQL tests needing `PG_DATABASE_URL`; build; rate-limit proof; SEC-01 and SEC-03 pass). Browser specs `e2e/route-seo.spec.ts` (7) and `e2e/route-seo-coverage.spec.ts` (25) — 32 passed against a local production build on a scratch SQLite DB with fake products and posts. The `❌ SQLite migration FAILED` line in the gate log is the deliberate corrupt-migration test, not a failure.
- **Open (not fixed):** visible claims outside metadata (About, FAQ answers, Footer, ChatWidget, Brands, Offers); the visible article breadcrumb shows the raw slug; the head stays on the previous listing while a filter request is in flight.

## 2026-09-21 — Admin-only cost/barcode fields + product soft-hide (is_active) — COMMITTED, DEPLOYED, live-verified
- **Schema (both dialects) + migration `0015_products_cost_barcode_active.sql`:** `cost_price`, `barcode`, `is_active INTEGER NOT NULL DEFAULT 1` + `idx_products_active`. Additive; prod applied it at boot (journal 15 → 16 rows, `pragma_table_info(products)` ends `...,sku,cost_price,barcode,is_active`, 45/45 rows `is_active=1`).
- **Wholesale never leaks:** every public read path excludes the three fields via drizzle `columns: { costPrice: false, barcode: false, isActive: false }` — `routes/products.ts` (list + `/:id`), `routes/cart.ts` (GET hydration), `routes/wishlist.ts`. Live proof: `GET /api/products?limit=1000` → 45 items, leaks `costPrice=0 barcode=0 isActive=0`, response keys byte-identical to pre-change; `GET /api/products/5632` → all three absent.
- **New `GET /api/admin/products`** (in `routes/admin/products.ts`): the only full-catalogue reader — includes hidden rows, the commercial fields, and `features` flattened to `string[]`; `401` without a token. The admin panel now reads it instead of the public list. `POST`/`PUT /api/admin/products` accept `costPrice`/`barcode`/`isActive` (validator: `isActive` coerced to literal 0|1).
- **Soft-hide semantics:** `is_active=0` drops a product from the public list, 404s on detail, is refused by the cart, and is excluded from `/sitemap.xml` + the category/brand count aggregates — while the row survives for order history (`order_items` keeps its own title/image/brand snapshot) and stays editable in the panel. This closes the long-open TASKS decision (physical deletion of order-referenced rows was never required).
- **Admin UI (`src/pages/admin/Products.tsx`, `src/types/index.ts`):** «قیمت خرید» + «بارکد» inputs, «نمایش در فروشگاه» toggle, a «حاشیه سود» column (amount + percent, red «زیر کف» badge under `MIN_MARGIN_PCT = 10`, green otherwise) and a grey «مخفی» badge; the last five `as any` casts in that file are gone (`as_any=0`).
- **Verification:** `tests/api/products-admin-fields.test.ts` (6 tests) locks the contract — public omission, hidden 404, cart refusal, admin completeness, PUT/POST persistence. Full gate `npm run verify` = **488 passed / 5 skipped (63 files)**, tsc clean, SEC-01 + SEC-03 pass. Deploy OK (`health ok`, IndexNow 200). Live dual-engine probe (Chromium + WebKit × `/`, `/products`, `/product/5632`): 18/20/4 cards, PDP h1 renders, **0 pageerrors**.
- **Also fixed:** `scripts/data/merge-dup-brands.cjs` was syntactically broken (missing `=` in five places) and had a wrong DB path — rewritten idempotent. Prod brands verified clean (`ارلدام 37 · MCdodo 7 · بیسوس 1`), so no merge was needed. `scripts/data/price-watch.mjs` gained `tierOf()`: per-row buying bucket (`پک`/`زیر باند`/`هم‌تراز`/`مذاکره`/`حذف-تعویض`) in JSON, an MD column, and a console summary.

## 2026-09-21 (b) — GSC coverage: category canonicals were pointing at the wrong page — FIXED, live-verified
- **Defect (proved live):** `/products?category=<name>` — the two category landing pages that the sitemap
  submits — declared `canonical=https://janebiarena.ir/products`, so Google filed both under
  "Alternate page with proper canonical tag" (506 group) and neither could rank for its own name.
  Any *unmatched* category value (stale/dash form) fell through to the shell canonical
  `https://janebiarena.ir/` → "Duplicate without user-selected canonical" (219 group) attributed to home.
- **Fix (`server/lib/seoMeta.ts`):** the filtered URL is its own canonical
  (`/products?category=<encodeURIComponent>`, encoded exactly like the sitemap); `sort`/`page` variants
  canonicalise to the plain category URL; an unmatched category falls back to the **hub** meta
  (`PRODUCTS_HUB_META`), never the homepage. Category must also have at least one active product.
- **Proof:** `npm run verify` EXIT=0 (63 suites / 490 tests, +3 canonical tests in
  `tests/unit/seo-meta.test.ts`); deployed; live probe — category → self canonical, `+sort&page` →
  plain category, stale → `/products`, hub/product/utm unchanged, `?search=` still `noindex, follow`.
- **Still open (not fixable from the repo):** Googlebot's shell has an empty `#root` and no `<noscript>`
  (6KB HTML, title + JSON-LD only) — the likely driver of "Crawled – currently not indexed" (134) and the
  256/1972 index ratio. Clean fix = build-time prerender of the 81 sitemap URLs (app uses `createRoot`,
  so no hydration risk). The 678 "Excluded by noindex" / 122 404 / 32 robots-blocked groups need the
  per-group URL export from GSC to attribute; the domain's legacy WordPress footprint
  (robots.txt still lists `/wp-content/`, `/themes/`) is the likely bulk.

## 2026-09-19 — Live health sweep + VPS disk reclamation (82% → 29%) — COMMITTED, VERIFIED
- **Health sweep (prod, read-only):** 10 pages (home/products/PDP×2/blog/cart/checkout/offers/login/admin) all 200 with zero console errors/pageerrors; API health/products/blog/categories/settings/sitemap/robots 200; anonymous protected routes 401; `POST /api/auth/session` → `200 {"authenticated":false}`; all 7 index.html assets 200; CSP/HSTS/XFO intact; `/.env` + `/.git/config` → 404; DB `integrity_check ok`; daily backup 02:30 OK (`products=38 tables=25 uploaded=2`); SSL valid to 2026-11-13; nginx 0×5xx (404s = bot scans).
- **Two false alarms disproven, not "fixed":** (a) `?search=قاب/شارژر/گلس` → 0 results is data-limited — the catalogue is 38 products in ONE category (`هولدر و نگهدارنده`); FTS5 verified live (`نگهدارنده`→38, `ارلدام`→37, `EH288`→1, `مگنتی`→1). (b) enamad trustseal 408 from a non-Iran IP returns `200` real PNG from the VPS — external geo noise, badge fine.
- **Root cause of 82% disk = Docker build cache (12.35GB, 78 entries, 0 active)**, not app data (home 52M, nginx logs 1.8M). Reclaimed: `docker builder prune` (cache → 0, which also removes the stale-src rebuild hazard) + `journalctl --vacuum-size=100M` (117M) + 11 old `/tmp` deploy payloads (7×78MB src/dist snapshots + 4 more, gated on `tar tf` members ⊆ `src|dist|server`). Final: **6.4G used / 16G free / 29%**.
- **Quarantine protocol (nothing deleted unproven):** 6 junk DB files in `data/` (`janebi-corrupt.db`, `janebi-consistent{,-pre-rotation}.db`, `janebi-pre-testorder-purge.db`, `store.db` 0-byte, `.bak_check`) → `tar czf` → `gzip -t` → extract + md5-per-member → `scp` off-box + md5 remote==local → then `rm`. Archive: `~/backups/junk-db-20260919-094711.tar.gz` (356286 B, md5 `8aba9ca811ff21deaa1bb42971db2c22`) on both VPS and local `/Users/aidin/backups/`.
- **Post-reclaim proof:** both images present, both containers `Up`, postgres volume untouched, DB `integrity_check ok` + `foreign_key_check []` + 38/3/1 counts + FTS 38, live smoke re-run 10/10 pages 200, `monitor.log` = all clear, cron intact.
- **Ops note:** heavy remote commands (`docker prune`, full-root `du`) drop the SSH channel on the 1.9GB box — often *after* completing; re-measure with `df` instead of re-running. Procedure distilled into skill `prod-data-residue-cleanup` (§ Host-level residue). New reusable tool: `scripts/oneoff/live-smoke.cjs` (620ffd4).

## 2026-09-15 (r39 rotation) — Post 16 (Baseus Adaman 20000/65W) + BlogPosting prerender + reader UX — COMMITTED, deploy blocked (SSH down)
- Post 16 «پاوربانک بیسوس Adaman ۲۰۰۰۰ با خروجی ۶۵ وات» (brasresi-powerbank-baseus-adaman-20000-65w) به scripts/data/seed-blog.ts اضافه شد — بر اساس محصول واقعی id 7 (SKU PB-BS-65W). SEED_BLOG_ONLY filter اضافه شد برای seed نقطه‌ای (ران موازی پست خودش را دارد).
- Server prerender BlogPosting JSON-LD برای /blog/:slug (blogPostingJsonLdFor در server/lib/breadcrumbs.ts؛ builder مشترک src/lib/blogJsonLd.ts؛ honesty gate: slug نامشخص/غیرمنتشر → بدون injection).
- Reader modal UX: Escape-close + body scroll-lock.
- Gate npm run verify ALL GREEN؛ jsxDEV=0. Commit be76f19 pushed.
- DEPLOY BLOCKED: ssh root@<server-ip> (port 22) → Connection refused برای ~۱۲ دقیقه (site/HTTPS سالم است 200). پس از بازگشت SSH: deploy.sh با /tmp/janebi-deploy.lock، سپس در کانتینر: SEED_BLOG_ONLY=brasresi-powerbank-baseus-adaman-20000-65w node scripts/seed-blog → انتظار /api/blog=16، چک JSON-LD prerender در HTML خام /blog/:slug.

## 2026-09-11 — API Client Unification (jsonFetch/getJson) — COMMITTED (cf2d1cb, 09a6f37), DEPLOYED, live-verified
- **New `src/lib/jsonFetch.ts`:** `jsonFetch<T>` (JSON POST/PUT, auto Content-Type, throws typed `ApiError{status,message}` parsed from server `{error}`) + `getJson<T>` (GET, `cache:'no-store'`). Coexists with `authFetch` (authed path untouched).
- **20 raw JSON fetch call sites migrated across 17 files** (Home, Header, HeaderSearch, Footer, VipClubBanner, LatestReviews, RelatedProducts, DynamicBreadcrumbs, Compare, Brands, Blog, Offers, NewProducts, Contact, VipClubTab, admin/Products ×3, ProductReviews, useStoreSettings, useProductFilters cat/brands). Documented exemptions (stay raw): ProductDetail (AbortController+JSON-LD), AuthContext/Login/ForcedPasswordChange (auth state machine), useProductFilters list fetch (reads X-Total-Count/X-Total-Pages headers), api.ts refresh single-flight.
- **Side effects:** killed `err: any` in Contact/Header/HeaderSearch (`err instanceof Error`); category sorts typed `{count?: number}`; admin product save + stock-PUT now surface real server error text.
- **Class bug found & fixed during verification:** prod CSP `upgrade-insecure-requests` makes WebKit rewrite ALL local http://127.0.0.1 asset fetches to https → TLS-fail noise. Fix: local smoke boots set `DISABLE_CSP_UPGRADE_INSECURE=1`; helmet removal shape is `upgradeInsecureRequests: null` (`[]`/false throw) in server/app.ts. Prod directive verified intact post-deploy (curl grep = 1).
- **Test-artifact DB rows purged (local):** 4 products «کالای تست اینواریانت موجودی» image=/images/test.jpg (ids 23318/23351/23384/23417) — FK-census zero on order_items/cart_items/wishlist_items/reviews/product_features before delete; API cache-bust confirmed 0.
- **Verification:** npm run verify ALL PASS (tsc strict clean, 406/411 in 56 suites, build 876ms). Live: `bash deploy.sh` health ok; served `index-DWJsrLFt.js` sha256 == local. Dual-engine sweep (WebKit+Chromium, 7 pages, local prod boot): 0 same-host console/failed-request issues; only external noise = trustseal.enamad.ir 403/408 (known fragile gov server). Real header-search flow PASS both engines («قاب» → /products?search=). Net −36 LOC.
- Reusable procedure distilled to skill `surgical-refactor-playbook`; PROJECT_GRAPH.md + TASKS.md updated (38794a9).

## 2026-09-11 (cron round) — Blog post 11 + article-modal UX
- Blog post 11 «پایه رومیزی موبایل» seeded to prod (id: rahnamaye-entekhab-stand-rumizi-mobile) — /api/blog now 11 posts; page 200, sitemap updated.
- Blog article modal: copy-article-link button (clipboard, copied state, 44px touch target, a11y labels) shipped in Blog chunk (live-verified in Blog-DDFBn9YL.js).
- Gate npm run verify 100% green (both rounds). Commits f8c31c8, d716657.

## 2026-09-10 (cron round) — Blog post 10 + tag SEO/UI
- Blog post 10 «گلس دوربین و محافظ لنز» seeded to prod (id: rahnamaye-gols-doorbin-mohafez-lanz) — /api/blog now 10 posts.
- Blog article modal: real DB tag chips (Lucide Tag icon, orange pill, RTL, 44px-safe) + BlogPosting JSON-LD `keywords` from tags (blogJsonLd.ts).
- OG image meta (og:image/twitter:image 1200x630) shipped by concurrent actor (fe06350).
- Gate: npm run verify ALL PASSED. Commit 2c484e9, deploy OK, live-verified (API post present + Blog-UTDO_GPA.js chunk contains tag UI).

## 2026-09-08 (r38) — Real-User E2E Suite (86 green) — COMMITTED, PUSHED
- **New: `e2e/real-user.spec.ts` (43 tests × chromium+webkit = 86):** real browser clicks/typing, visible-UI outcome assertions, zero uncaught-JS/console-error tolerance. Coverage: Home (hero dots, theme toggle, search), catalog filters/pagination, product detail + reviews, cart drawer/qty/coupon, auth register/login/logout, wishlist/compare, checkout COD + online gateway path, static pages, 404, mobile UX, admin dashboard/products/orders/coupons/users/reviews/settings/audit/newsletter/blog.
- **New: `playwright.e2e.config.ts` + `e2e/global-setup.ts`:** isolated DB via `VACUUM INTO` (prod DB never touched), bcrypt-seeded admin, `NODE_ENV=test` (rate limiters skip), per-worker Vite route warmup, globalSetup runs once (config is per-worker).
- **App defects found & fixed by the suite:** admin Products list fetched with browser cache (`Cache-Control: max-age=30`) → stale table after create/delete → `cache:'no-store'`; admin Orders status dropdown hover-only → keyboard/AT unusable → `group-focus-within`.
- **Gate:** npm run verify (54 files, 389 tests) + full E2E 86/86 green (~2.6min). Run: `npm run test:e2e`.

## 2026-09-06 (audit remediation) — soft-404, guest-cart merge, honest chat widget (02ef15b, SHIPPED live)
- Full site+admin audit (CBM route cross-map + knip + live sweep) → findings in `.hermes/reports/audit-2026-09-06.json` (commits f4609d1/c96e8b5).
- SEO-004: unknown SPA paths now 404+noindex (`server/index.ts` SPA_ROUTES allowlist) — was soft-404 (200+index). Live: /nonexistent-xyz→404.
- Guest cart/wishlist MERGE on login (CartContext `mergedForToken` ref + server upserts) — was silent replace.
- Compare: canonical Product type + silent `replaceCompare` + mount-time live-price refetch; deleted products dropped.
- ChatWidget: honest «راهنمای خودکار» copy; fake «کارشناسان در حال بررسی» claim removed.
- `GET /api/admin/orders` optional `?page&limit&status` server pagination (back-compat full list).
- Dead code: BrandShowcase.tsx (orphan since 247d4c3), 8 qa-*.cjs reports, intra-file-only exports un-exported.
- Deploy: ship whole `server/lib`+`src/lib` dirs (VPS tree had drifted → mid-deploy build failures). Full `force-recreate` + image→host dist sync + restart cleared stale-container header mismatch. Gate: tsc clean, 375/53 tests, verify ALL PASS.

## 2026-09-05 (r37d) — UI/UX Hardening, Coupon Parity & Prod Deploy — COMMITTED, DEPLOYED
- **P0 Coupon Discount Parity (`src/lib/coupon.ts`):** client-side checkout calculation now mirrors server formula exactly for percentage/fixed caps.
- **P1 Payment Route 404:** `/payment` fallback alias added to frontend router avoiding 404 on callback redirects.
- **P1 Order History Filter:** `pending_payment` orders visible and retryable in user order history tab.
- **P1 Lightbox Escape & Scroll-Lock:** modal image viewer keyboard accessibility and body scroll lock fixed.
- **P2 Polish:** CSS `scale-108` utility fix, mobile action bar iOS safe-area insets, admin modals Escape dismissal.
- **Gates:** 48 test suites, 353 passing tests, clean build, verified live on janebiarena.ir.

## 2026-09-04 (r37c) — Production-Integrity Audit (PostgreSQL) — COMMITTED
- P0 oversell on PG: order stock deduction was SELECT-then-conditional-UPDATE (TOCTOU). Live evidence: 25 parallel orders on stock=1 → 9 winners, stock −8. Fix: atomic `stockQuantity >= qty` predicate + `.returning()` row-count check inside the order transaction (orders.ts). Post-fix: 25 parallel orders → exactly 1×201, stock=0 (4/4 rounds stable).
- P1 search case parity: `likeWithEscape` now lowers both sides — SQLite LIKE is case-insensitive for ASCII but PG LIKE is case-sensitive (live: `?search=anker` 0 vs `Anker` 3 on PG). Post-fix: 3/3 on PG.
- P2 NaN→500: non-numeric id params (DELETE /api/wishlist/wish-…) returned 500 on PG. New `numericIdParamSchema` for numeric-id routes (cart/products/wishlist); string address ids keep `idParamSchema`. Live: 400 now.
- Server-boot false alarm resolved: stale server (old bundle) was still listening on :3999 — concurrent-order results before fix were partially measured against the pre-fix build. Verified fixed bundle live afterwards.
- Gates: tsc clean, 344/344 (incl. 17 concurrency/rollback tests), PG-verification suite 5/5, clean-DB PG boot 10/10 migrations (journal=10, 16 tables), full critical-flow smoke PASS (register/login/cart/coupon validate+apply+usage-limit/order/stock/restock/cancel/reviews/admin CRUD/sitemap/health/401/403/400 contracts).

## 2026-09-04 (r37b) — Dead-code sweep, behavior-preserving — COMMITTED, PUSHED
- Scan: Serena MCP در کاتالوگ نیست → knip@5 + TS5 AST ref-counter (tsc@7 lacks createSourceFile؛ typescript@5.9 در /tmp).
- Removed: formatTomanNumber/formatPersianDate، ۳ Skeleton مرده، ۴ AppError subclass بی‌مصرف (BadRequest/Unauthorized/NotFound ماند — تست phase1)، ORDERS_STORE، blogPostsRelations خالی، loadAdminChatIds مرده (bale.ts)، ۸ export keyword زائد تایپ‌محور، deps @google/genai + thesvg + autoprefixer.
- Keep-list (false positive های knip): sw.js، seed-blog.ts، drizzle.pg.config.ts، bale-worker/worker.ts، seed.ts، closeDb، pino-pretty، ۳ AppError class → skill `dead-code-scan-janebi`.
- Long-fn refactor (۹۸ تابع ≥۴۰ خط، بزرگ‌ترین ProductDetail 742) با تصمیم کاربر به تعویق افتاد.
- Gate: tsc clean، 344/344، npm run verify ALL PASS، hermes verify ok (runtime boot 200). Commits 2c2b6c4 / efe2216 / 2002ea5.

## 2026-09-03 — Image performance / LCP round (TEAM-FRONTEND)
- 21 raw <img> tags patched: loading=lazy + decoding=async + explicit width/height (storefront, cart, checkout, profile, admin); LCP hero/preloads untouched.
- ProductCard SmartImage: width/height + sizes attr -> card-grid srcset coverage via PictureImage (AVIF/WebP for raster, SVG passthrough).
- Raster compression: no-op — zero images >100KB in public/ (largest is 6.6KB icon PNG; imagery is vector SVG). No fabricated work.
- Image 404 audit: deleted 244 /images/test.jpg inventory-test residue rows from local dev DB; all 14 real product images resolve (0 missing). Prod DB check deferred to next VPS deploy.
- npm run verify 100% green (44 suites / 331 tests + tsc + build); jsxDEV=0, no /Users/ leaks. Report: .hermes/reports/frontend-image-perf-2026-09-03.md.

## 2026-09-02 — OTP UI gating (audit P2: dead OTP in prod)
- Login.tsx fetches GET /api/auth/otp/status on mount; enabled=false hides OTP login tab + OTP reset path (Persian notice), fail-safe = hidden on fetch error.
- New src/lib/otp.ts resolver + tests/unit/login-otp-gate.test.ts. npm run verify green; jsxDEV=0, no /Users/ leaks.
- Deployed: c11f9ca; live /api/auth/otp/status={"enabled":false}, bundle Login-D0G6tgAE.js contains gate, health ok.


## 2026-09-02 — SMS.ir OTP dispatch (deploy.sh P0 env-overwrite fix + template gating)
- **P0 fix — deploy.sh no longer syncs local `.env` to VPS:** the WIP `rsync ./.env $REMOTE:$APP_DIR/.env` (which would have overwritten prod APP_URL/JWT secrets/Zarinpal keys with local dev values) replaced with a merge-safe SSH step: for each `SMS_*` key present locally, append to remote `.env` ONLY if the key line is absent (per-key `grep -q || printf >>`). Existing remote lines are never touched.
- **Placeholder template gating (`server/routes/auth.ts`):** `smsTemplateIdConfigured()` — real dispatch via `https://api.sms.ir/v1/send/verify` requires BOTH `SMS_API_KEY` and a real (non-`123456`) `SMS_TEMPLATE_ID`. Incomplete config → graceful fallback: dev simulator log in dev, warn + silent no-send in prod (no 502 leak). `smsProviderEnabled`/`smsTemplateIdConfigured` are dynamic getters so tests can toggle env at runtime.
- **`server/env.ts`:** `SMS_TEMPLATE_ID` added as optional string (empty allowed).
- **`.env.example`:** `SMS_API_KEY` optional (empty = OTP gracefully disabled), `SMS_TEMPLATE_ID` commented with placeholder warning.
- **Test hermeticity (`tests/unit/otp-production-gate.test.ts`):** snapshots + stubs `SMS_*` env in beforeAll/afterAll so the 503 gate passes even on machines whose local `.env` sets SMS keys.
- **Collateral fix:** `src/components/ProductReviews.tsx` destructured missing `initialRating` prop (TS2304 blocking the gate).
- **Quality gate:** `npm run verify` 100% PASSED (tsc strict + 322 Vitest tests + Vite client & Esbuild server builds).

## 2026-09-02 — §3.15 Hardening Cluster (headers + settings single-sourcing)
- **CSP report-uri via env (`1cd3b12`):** `server/app.ts` Helmet CSP now emits the legacy `report-uri` directive ONLY when `CSP_REPORT_URI` is set in the environment (no placeholder URL in code). Modern `report-to` transport (per-request `Reporting-Endpoints` header + rate-limited internal `/api/csp-report` 204 sink) stays active unconditionally.
- **Settings fallback single-sourcing (`1cd3b12`):** remaining duplicated `'جانبی آرنا'` literals in `src/pages/ProductDetail.tsx` (JSON-LD seller name, share title) replaced with `STORE_SETTINGS_DEFAULTS.storeName` from `src/lib/constants.ts` — the same single source the server and `useStoreSettings` already use. Zero behavior change.
- **Permissions-Policy (pre-existing, live-verified):** header was already shipped in the earlier headers cluster; aligned to spec `payment=(self)` (commit `b7e3d82`, 2026-09-02) — live header now `camera=(), geolocation=(), microphone=(), payment=(self), usb=(), interest-cohort=()`.
- **Re-deploy + re-verify (b7e3d82):** `npm run verify` ALL PASS (tsc strict + 319 tests + builds + post-build audit). Deployed via `./deploy.sh` (health ok). Live evidence: `curl -sI https://janebiarena.ir | grep -i permissions-policy` shows `payment=(self)`; `/api/health` 200.
- **Quality gate:** `npm run verify` 100% PASSED (tsc strict + Vitest + builds + post-build audit). Deployed via `./deploy.sh` (health ok). Live evidence 2026-09-02: Permissions-Policy header present on janebiarena.ir, `/api/health` 200, homepage bundle hash changed (`index-8xinYUga.js`). TASKS.md §3.15 marked closed.

## 2026-09-02 — Admin dashboard sales trend + admin form digit consistency (625d33c)
- `GET /api/admin/analytics` now returns `salesTrend` (14 daily buckets of real completed-order revenue/counts; `created_at` first, `ORD-<base36>` id fallback for legacy rows). Zero fabricated data.
- Admin Dashboard: full-width dual-theme bar chart (pure CSS, Persian day labels, formatPrice/toPersianDigits tooltips, honest empty state).
- Digit consistency: admin numeric inputs (Users VIP points, Settings free-shipping threshold, Coupons discount value, Products discount/stock) moved from `type=number` to `text+inputMode=numeric` with `toEnglishDigits` normalization; Coupons percent>99 guard added.
- Gates: `npm run verify` PASS; artifact audit clean (jsxDEV=0, no /Users/ leaks); `./deploy.sh` OK; live verified on janebiarena.ir (analytics endpoint returns 14-bucket trend — currently all zeros, honest: only 2 cancelled orders exist in prod).
- Report: `.hermes/reports/orchestrator-2026-09-02-sales-trend.md`

## 2026-09-02 (c) — Product reviews UX, blog JSON-LD, SMS.ir OTP dispatch cluster
- DESIGN: product reviews UX polish — honest "جدید" empty state (removed fake 4.7 fallback), dual-theme cards, Persian digits/dates, 44px a11y targets, reduced-motion. (9c1cc49)
- SEO: JSON-LD BlogPosting on blog reader via src/lib/blogJsonLd.ts, honesty-gated fields, 7 new vitest tests. (9c1cc49)
- Also landed: SMS.ir OTP dispatch cluster (9c3ffe2). Deploy OK, live bundle Dj3Salu_, jsxDEV=0, /blog 200. Gate: 329 tests.

## 2026-09-01 — Remediation Commit, Skill Refactor & Repo Hygiene
- **Uncommitted remediation landed (Aug 31 wave):** payment-reaper (`server/routes/payment.ts` — 5min interval, 60min abandoned `pending_payment` cutoff with legacy base36-id fallback, transaction-guarded restock + VIP refund), `orders.created_at` column + SQLite/PG migrations (`drizzle/*/0005_order_created_at_indexes.sql` + secondary indexes), seed fake aggregates zeroed (`seed-data.ts` rating/reviewsCount → 0), SW default branch network-first with cache bump v1.1.0 (`public/sw.js`), llms.txt/llms-full.txt/pricing.md regenerated from live API, admin settings doc anchor, ProductCard '۴.۸' fallback removed, ProductReviews fake list removed.
- **Quality gate:** `npm run verify` 100% PASSED (tsc strict + full Vitest suite + Vite client & Esbuild server build); post-build artifact audit `jsxDEV:0`, `/Users/` leaks:0.
- **Skill refactor (Hermes profile):** recreated lost `iran-ecommerce-storefront-engineering`, added Related-Skills routing to `janebi-arena-production-readiness`, de-Prisma'd `fullstack-project-audit` + `production-ready-fullstack-patterns`, corrected `production-readiness-verification` pitfalls to Janebi reality (mobile admin login, `/api/admin/stats`, `npm run verify`).
- **Repo hygiene (local + git):** removed dead artifacts from repo & disk — `sketches/` (3 design mockups, superseded by shipped design system), `firebase.json`/`.firebaserc`/`.firebase/` (legacy hosting, project uses Docker+VPS deploy), `metadata.json`, `.neural_graph.json`; local-only removals of stale `playwright-report/` + `test-results/`. `SECRETS_MAP.md` stays local (gitignored) as the ops credential map. `agent.md` + `docs/*-baseline.md` retained (still valid baselines).

## 2026-09-01 — Blog Post 8 + Blog listing polish (01a58a3, SHIPPED live)
- scripts/data/seed-blog.ts: post 8 «راهنمای خرید کابل شارژ» (rahnamaye-kharid-kabel-sharzh) — real editorial content, no stubs.
- src/pages/static/Blog.tsx: Persian-digit reading-time badge from real content length, hover lift with prefers-reduced-motion, 44px touch targets + Persian aria-labels.
- Gate: npm run verify ALL PASS (45 suites/341 tests); artifact audit jsxDEV=0, /Users/=0.
- Deploy: deploy.sh with /tmp/janebi-deploy.lock; prod seed via esbuild bundle (--external:better-sqlite3 --external:pg) → docker cp → node in-container (8 exists, 1 inserted).
- Live verify: /api/blog=8, served bundle index-D6DVro4s.js == local, sitemap.xml includes blog slugs (9 urls), health ok.

## 2026-08-30 — Prod-First Safari/WebKit Bug Sweep & Live Verification

- **Checkout Validation Fix (`c4cd855`):** Resolved Safari `SyntaxError: Unexpected token '{'` on the checkout entry page by wiring live recipient validation to `isValidIranianMobile` + `toEnglishDigits` in `CheckoutRecipientForm.tsx` / `useCheckoutForm.ts`; `server/validators/index.ts` `orderSubmitSchema` made nullable/optional-safe for optional order fields.
- **Auth Noise Reduction (`58f6de2`):** Eliminated unnecessary `401` network calls from `/api/auth/me` and `/api/auth/refresh` for unauthenticated guest visits in `src/contexts/AuthContext.tsx`.
- **Admin Guest Guard (`a79771c`):** Admin layout stats fetch now skipped for unauthenticated guest visits in `src/components/admin/AdminLayout.tsx`.
- **WebKit Preload Warnings (`a73741c`):** Removed 4 unused image preloads (`products/hld-13.svg`, `brands/apple.svg`, `brands/samsung.svg`, `brands/anker.svg`) from `index.html` that triggered Safari console warnings.
- **Dual-Engine Live Verification:** Playwright WebKit + Chromium sweep of `/`, `/products`, `/checkout`, `/login` on production — 8/8 CLEAN (0 console errors/warnings, 0 failed requests). `npm run test` 297/297, `tsc --noEmit` clean, build OK, deployed via `deploy.sh`, health `{"status":"ok","database":"ok"}`.
- **Governance:** PROD-FIRST + dual-engine (WebKit & Chromium) verification rules codified as invariants in `docs/reference/project-graph.md`.

## 2026-08-29 — Brand Identity Overhaul, E2E Contract Suite & Security Defense Hardening
- **Brand Identity & Typography:** Upgraded brand logo and typography across Header, Footer, and Admin panel using vibrant orange/amber gradients, hover micro-interactions, and monospace bilingual tags.
- **Enforced Rate-Limiting:** Secured `/api/auth/otp/send`, `/api/auth/otp/verify`, and `/api/auth/reset-password` against SMS and credential brute-force attacks via rate-limit middleware and automated verification in `tests/unit/rate-limiting.test.ts`.
- **E2E API Contract Parity:** Created comprehensive test suite `tests/api/frontend-backend-parity.test.ts` verifying all public catalogue, user authenticated flows (cart, wishlist, orders), and admin management endpoints.
- **Automated Visual & A11y Audit:** Executed full browser audit via `browser_exec` across all 16 core storefront and admin routes; confirmed 0 horizontal overflows (CLS/x-scroll) and standard WCAG AA ARIA labeling on all interactive controls.
- **High-DPI Responsive Image Pipeline:** Integrated 1x/2x srcset generation in `<PictureImage>` and added asset preloading hints in `index.html` for LCP optimization.
- **Quality Gates:** 36 test files (297 tests) passing 100% with strict TypeScript validation and successful production deployment to `janebiarena.ir`.

## 2026-08-29 — Hardcore Adversarial Verification Harness & Invariant Guard
- Added unified adversarial verification pipeline in `scripts/verify-all.sh` wired to `npm run verify` (`tsc --noEmit` + `vitest run` + client/server production build).
- Implemented `tests/unit/concurrency-invariants.test.ts` verifying Persian unicode/mobile normalization, invalid edge cases, and zero-negative-stock transactional invariants.
- Configured and linked profile `code-pro` (`SOUL.md`) with explicit engineering invariants and adversarial quality gates for Janebi Arena.
- Verified 33 test files (291 passing tests) with 100% build and type-safety clean.

## 2026-08-28 — Storefront Accessibility, Design System & UX Hardening

### Added
- CSS Design Tokens (`--color-surface`, `--color-canvas`, `--color-border`, `--color-text`) implemented natively in `index.css` via Tailwind 4 variables.
- Payment Gateway Architecture & Auto-Failover Router (`server/services/payment/`) with Circuit Breaker support across Zarinpal and Saman/Shaparak.
- Unit tests (`tests/unit/payment-failover.test.ts`) validating automated failover routing, authority resolution, and Circuit Breaker state tracking.
- Progressive Web App (PWA) manifest (`manifest.webmanifest`) with standalone display, Persian metadata, RTL orientation, and vector icons.
- Service Worker (`sw.js`) providing Cache-First static asset delivery, Stale-While-Revalidate for catalogue APIs, and offline fallback.
- `<PictureImage>` responsive `<picture>` component with automatic AVIF/WebP resolution, cache-busting, and CLS protection.
- Standardized `.min-touch-target` class enforcing 44px minimum interactive boundaries for mobile accessibility.
- Enhanced `EmptyState` component with responsive padding, smooth spring entrance animations, and high-contrast primary CTA buttons.
- Linear/Raycast-inspired glassmorphic styling for `ProductCardSkeleton` and `ProductDetailSkeleton` matching live UI components.
- Real-time customer savings calculator badge in `ProductDetail.tsx` and stock urgency FOMO badge on `ProductCard.tsx`.
- Sticky filter and sort header in `ProductSortHeader.tsx` with glassmorphic backdrop blur on catalog pages.
- Localized Persian typography for `FreeShippingBar.tsx` progress percentage and thresholds.

### Changed
- Massive refactoring of 64+ React `.tsx` components, replacing hardcoded hex colors (`bg-white`, `bg-gray-50`, `dark:bg-gray-900`) with native semantic CSS design tokens.
- Refactored `index.css` to enforce WCAG AA-compliant high-contrast focus rings (`:focus-visible`) across light and dark themes.
- Updated `ProductCard.tsx` with discrete ARIA labels on Wishlist and Compare toggle buttons, expanding touch hitboxes to 36x36/44x44px.
- Upgraded `Header.tsx` accessibility tags and compare count badge attributes.
- Improved `ToastContext.tsx` with `role="alert"` and `aria-live="assertive"` for screen reader announcements.
- Enhanced `MobileBottomNav.tsx` touch padding and accessible navigation labels.

### Verified
- `npm run lint`: 0 errors (clean TypeScript compilation).
- `npm run test`: 32 test suites passed (288 tests).
- `npm run build`: Production client and server build succeeded.
- Live VPS deployment (`janebiarena.ir`): 200 OK, healthy DB, zero downtime.
