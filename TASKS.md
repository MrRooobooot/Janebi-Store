# TASKS.md — Janebi Store UI/UX & Quality Audit

## Status: Completed (Aug 28, 2026)

### Round r39 (2026-09-15a) — Post 16 (Baseus Adaman) + BlogPosting Prerender + Reader UX (COMMITTED — deploy BLOCKED by SSH outage)

- [x] Post 16 نوشته و به seed اضافه شد: «پاوربانک بیسوس Adaman ۲۰۰۰۰ با خروجی ۶۵ وات» (id: brasresi-powerbank-baseus-adaman-20000-65w) — بر اساس محصول واقعی فروشگاه (product id 7، SKU PB-BS-65W، image /products/pb-7.svg). Zero-fabrication: همه مشخصات از /api/products/7.
- [x] SEO: prerender سمت سرور BlogPosting JSON-LD برای /blog/:slug (server/lib/breadcrumbs.ts → blogPostingJsonLdFor + اتصال در server/index.ts prod branch). Unknown/unpublished slug → بدون injection (honesty gate).
- [x] UI/UX: مودال مقاله — Escape برای بستن + قفل اسکرول بک‌گراند (src/pages/static/Blog.tsx).
- [x] scripts/seed-blog.ts: فیلتر SEED_BLOG_ONLY=<id> برای seed نقطه‌ای (جلوگیری از seed پستِ ران موازی).
- [x] Gate: npm run verify 100% green؛ grep -c jsxDEV dist/assets/index-*.js = 0. Commit be76f19 + push.
- [x] DEPLOY UNBLOCKED: SSH برگشت (2026-09-XX probe OK)، پست ۱۶ زنده (/api/blog شامل brasresi-adaman)، پارتی باندل index-D8BhX27m.js == محلی، BlogPosting JSON-LD سمت سرور روی /blog/:slug تأیید شد. r39 کامل SHIPPED.
- [!] تداخل ران موازی: ران همزمان دیگری پست «باتری در سرما و گرما» (rahnamaye-battery-sarma-garma) را در seed-file به‌عنوان «پست ۱۶» کامیت کرده ولی هنوز seed/deploy نکرده — با فیلتر SEED_BLOG_ONLY پست آن ران در این دیپلوی seed نمی‌شود.

### Round r38 (2026-09-13b) — Blog Post 15 + Post-14 Body Repair + Sitemap Fix (SHIPPED, live)
- [x] پست پانزدهم «چرا گوشی هنگام شارژ داغ می‌شود؟» (rahnamaye-garmi-goshi-hange-sharzh، commit aac0b52) — ۷ پاراگراف تحریریه واقعی، سید ایمپوتنت prod. زنده: /api/blog=15، در sitemap داینامیک.
- [x] ریشه‌یابی P0: post-14 بدنه زنده فاقد پاراگراف بود — seed از `join('\\\\n\\\\n')` (لیترال بک‌اسلش) استفاده کرده بود؛ ریشه کلاس باگ: بازنویسی bulkِ r37 خود join را خراب کرد. seed اصلاح + repair-blog-texts.ts پست ۱۴ را پوشش داد (8/8 repaired، live literal-\\n = 0).
- [x] SEO: sitemap — 15 URL استاتیک اضافه‌شده حذف شد (روت داینامیک /sitemap.xml خودش پست‌ها را از DB تزریق می‌کرد → dup). حالا 40 locs، 0 dup، hub lastmod بروز (r38b، commit f6879d6).
- [x] گیت verify سبز ×2، jsxDEV=0، دیپلوی با لاک ×2، sweep دو-موتوره (WebKit+Chromium) روی /blog و پست جدید: 0 خطای JS.
- Next: پست ۱۶ + روتشن UI/SEO (پررندر JSON-LD برای کرالرها، چون BlogPosting فقط کلاینت-ساید تزریق می‌شود).

### Round 2026-09-01c (r37) — Blog Post 14 + Corrupted-Text Repair + Reading Progress (SHIPPED, live)
- [x] پست چهاردهم «چند وات شارژر برای گوشی شما کافی است؟ راهنمای واقعی PD، QC و شارژ سریع» (rahnamaye-vate-sharzhe-divari، commit 42f136d) — محتوای تحریریه واقعی، سید ایمپوتنت prod. زنده: /api/blog=14، در sitemap داینامیک.
- [x] تعمیر P0: پاراگراف‌های خراب/به‌هم‌ریخته در ۷ پست زنده (fandaki، gols-doorbin، paye-negahdarande، shishe-gherat، powerbank، kabel، asrar) — seed اصلاح شد و scripts/repair-blog-texts.ts (commit eaa539d) بدنه/excerpt را از seed اصلاح‌شده آپدیت کرد: 7/7 repaired، live bad-marker scan = 0.
- [x] UI: نوار پیشرفت مطالعه در مودال مقاله (Blog.tsx) — sticky، dual-theme، role=progressbar، motion-reduce، reset هنگام تعویض مقاله. گیت verify سبز (ALL GATES PASSED)، jsxDEV=0، دیپلوی با لاک، chunk زنده Blog-wHzWFrzX.js شامل progressbar، freshness 20260913a در index.html زنده.
- [x] نکته عملیاتی: هنگام ssh/HTTP timeout گذرا روی VPS (چند دقیقه)، صبر و تست مجدد قبل از هر اقدام — سرور خودش برگشت (load 0.01) و repair اجرا شد. Next: پست ۱۵ + روتشن UI/SEO.

### Round 2026-09-09 — Blog Post 9 (SHIPPED, live)
- [x] پست دوازدهم «شارژر فندکی خودرو» (fandaki-khodro، commit 40f0ba3) + پست سیزدهم «پایه شارژ مغناطیسی» (magnisi، commit 7788af0، از child تیم) — محتوای تحریریه واقعی. سید ایمپوتنت prod (esbuild → docker cp → node درون کانتینر؛ 11×exists، 2 inserted). زنده: /api/blog=13، هر دو slug در sitemap.xml. Next: پست ۱۴ + روتشن UI/SEO.
- [x] پست نهم «پایه نگهدارنده موبایل خودرو» (rahnamaye-entekhab-paye-negahdarande-khodro، commit 82973d8) — محتوای تحریریه واقعی (سگردان/داشبورد/CD-Slot، مگنت Mag-Safe، شارژر فندکی PD)، تصویر /products/hld-13.svg. سید ایمپوتنت prod (esbuild bundle → docker cp → node درون کانتینر؛ 8×exists، 1 inserted). زنده: /api/blog=9، health ok. گیت verify سبز. دیپلوی با lock (این راند: فقط seed، بدون تغییر باندل). Next: پست ۱۰ + روتشن UI/SEO.

### Round 2026-09-01b — Blog Post 8 + Blog Listing Polish (SHIPPED, live)
- [x] پست هشتم «راهنمای خرید کابل شارژ» (rahnamaye-kharid-kabel-sharzh، commit 01a58a3) — scripts/seed-blog.ts، محتوای تحریریه واقعی (USB-C/Lightning/کابل تقلبی). سید ایمپوتنت prod (esbuild bundle --external:better-sqlite3 --external:pg → docker cp → node درون کانتینر؛ 8×exists، 1 inserted). زنده: /api/blog=8، sitemap شامل slug.
- [x] پولیش لیست وبلاگ (src/pages/static/Blog.tsx): بج زمان مطالعه ارقام فارسی از محتوای واقعی، hover lift با motion-reduce، touch targets ≥44px. گیت verify سبز (341/341)، jsxDEV=0، دیپلوی با lock؛ باندل زنده index-D6DVro4s.js == محلی. Next: UI polish round بعدی، پست ۹.

### Round 2026-09-06 — Blog Post 7 + Related Posts (SHIPPED, live)
- [x] پست هفتم «شارژر بی‌سیم چیست و برای چه کسی منطقی است؟» (rahnamaye-sharzh-bisim-mag-safe، commit 99de0a2) — محتوای تحریریه واقعی Qi/Mag-Safe/گرما، seed ایمپوتنت prod (ssh → docker cp باندل esbuild --external:better-sqlite3 --external:pg → node درون کانتینر). زنده: /api/blog=7.
- [x] بخش «مطالب مرتبط» در مودال مقاله (Blog.tsx): هم‌دسته‌ها جدیدترین اول، حذف مقاله جاری، cap=2، fallback به جدیدترین‌ها، a11y focus ring، motion-reduce. گیت verify سبز، jsxDEV=0، دیپلوی OK (lock رعایت شد)، chunk زنده Blog-CD-DezN_.js == محلی و شامل «مطالب مرتبط». Next: UI polish round بعدی، پست ۸.

### Round 2026-09-05 — Blog Post 6 (SHIPPED, live)
- [x] پست ششم «شیشه گیرات یا محافظ هیدروژل؟» (a3eada0) — محتوای تحریریه واقعی، تصویر واقعی /products/gls-3.svg، سید ایمپوتنت prod بدون دیپلوی (docker cp باندل esbuild + node درون کانتینر، --external:better-sqlite3). زنده: /api/blog=6، detail 200، sitemap شامل slug. BlogPosting JSON-LD client-side (SPA) — قابل مشاهده با curl نیست، کامپوننت src/lib/blogJsonLd.ts سر جاست. Next: UI polish round، پست ۷.

### Round 2026-09-04b — Category-aware catalog header + dynamic meta & CollectionPage JSON-LD (SHIPPED, deployed)
- [x] /products UI: H1 «خرید {دسته}» + بج دسته + شمارش واقعی (اعداد فارسی) در حالت فیلترشده (commit c0c4a7b)
- [x] src/lib/catalogSeo.ts: title/description/og داینامیک + CollectionPage JSON-LD از X-Total-Count واقعی، escape، پاک‌سازی unmount
- [x] verify سبز، jsxDEV=0، دیپلوی، health ok، chunk زنده Products-sZ1Rcj61.js حاوی ثابت‌های فیچر. گزارش: .hermes/reports/catalog-seo-2026-09-04b.md

### Round 2026-09-04 — RelatedProducts + ItemList JSON-LD (SHIPPED, deployed)
- [x] بخش «محصولات مشابه» در ProductDetail (commit bb792d9): واکشی واقعی `/api/products?category=&limit=8`، حذف محصول جاری، ۴ کارت ProductCard، ItemList JSON-LD از داده واقعی، اعداد فارسی، آیکون Lucide، escape JSON-LD. `npm run verify` سبز، jsxDEV=0. دیپلوی شد؛ باندل زنده index-DbkyNQN3.js == محلی؛ chunk زنده ProductDetail شامل «محصولات مشابه». گزارش: .hermes/reports/related-products-seo-2026-09-04.md

### Round 2026-09-03b — Reviews Pagination (TEAM-FRONTEND, SHIPPED, QA pending→next round)
- [x] GET product reviews paginated (?page&limit → {reviews,total,page,pages}, newest first, 6 new tests; ProductReviews.tsx Persian pagination). Commit 383f6cc, `npm run verify` green (44 suites/337 tests), deployed 2026-09-03 (live bundle index-2CuGcgTU.js == local), live endpoint verified {reviews:[],total:0,page:1,pages:1}.
- [x] Prod DB residue check closed: 0 rows with image '/images/test.jpg' on VPS (in-container probe).
- [x] QA PASS 2026-09-03 on image-perf/contrast-r7 cluster (.hermes/reports/qa-2026-09-03.md, 8/8 checks).
- Next: JSON-LD BlogPosting live-check on detail pages, next design/SEO cluster.

### Round 2026-09-03 — Image Performance / LCP (TEAM-FRONTEND, SHIPPED, QA PASS)
- [x] Raster census: zero images >100KB in public/ (all product/brand imagery is SVG, largest asset is 6.6KB icon PNG) — compression round is an honest no-op, no WebP candidates exist.
- [x] 21 raw `<img>` tags across storefront/profile/checkout/admin patched with `loading="lazy"` + `decoding="async"` + explicit width/height; LCP hero/preloads untouched (ProductCard.tsx, ProductDetail, Compare, Brands, Blog, Footer Enamad, HeaderSearch, cart ×2, checkout summary, profile ×4, admin ×4).
- [x] ProductCard SmartImage now passes width/height + `sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"` for card-grid srcset coverage.
- [x] Image 404 audit: deleted 244 `/images/test.jpg` inventory-test residue rows from local dev DB; 14 real products all resolve to existing files (0 missing). Prod DB residue check deferred to next deploy on VPS.
- [x] Gate: `npm run verify` 100% green (44 suites / 331 tests + tsc + build), jsxDEV=0, no /Users/ leaks. Report: `.hermes/reports/frontend-image-perf-2026-09-03.md`.

### Round 2026-09-02d — Blog Sitemap Slugs + Contrast r4/5 (SHIPPED, QA PASS)
- [x] **Per-post blog sitemap** (95b72b9): GET /sitemap.xml dynamic from blog_posts (real slug + lastmod, none fabricated), /blog/:slug deep-link route, tests/api/sitemap.test.ts. Live: 0 post entries because prod /api/blog = [] (no published posts — content gap noted).
- [x] **Contrast r4/5** (6d50ba7, 0bf6ba6): Header nav/user menu, MobileBottomNav, NotFound, ProductFilterSidebar, ProductSortHeader, AdminProducts — zinc/gray light-mode bumps.
- [x] QA PASS (.hermes/reports/qa-2026-09-02d.md): deploy health ok, bundle index-BEQ5_HOe.js, routes 200.
- Next: image compression round (Novin-style), product reviews pagination, blog content seeding (prod has 0 posts).

### Round 2026-09-02b — Blog/Admin Design + CWV/SEO (SHIPPED, QA PASS)
- [x] **Blog & Admin design polish** (978daf8): Blog.tsx card grid (h-10 sm:h-11 line-clamp-2 titles), dual-theme zinc tokens, toPersianDigits dates, 44px Persian aria-label touch targets, prefers-reduced-motion; AdminLayout.tsx surface/border tokens + 44px a11y buttons.
- [x] **CWV/SEO** (6b1ccc1): Blog.tsx images loading=lazy + decoding=async (LCP preloads untouched), sitemap.xml /blog entry, /blog live 200.
- [x] QA PASS (.hermes/reports/qa-blog-admin-cwv-2026-09-02.md): verify 100% green, commits on origin, live bundle sha256 == local (cluster already live).
- Next: blog per-post sitemap slugs (none exist yet), product-page reviews UX, JSON-LD BlogPosting.

### 0. Automated Asset WebP/AVIF Image Pipeline & LCP Optimization
- [x] Implemented reusable `<PictureImage>` component supporting `image/avif`, `image/webp`, and SVG/PNG fallbacks.
- [x] Added `priority={true}` with `loading="eager"` and `fetchPriority="high"` for Hero and LCP banners.
- [x] Enforced explicit width/height and aspect ratios on product tiles and deal cards to eliminate CLS.
- [x] Integrated backwards compatibility into `SmartImage` and `BrandLogo` components.

### 1. Accessibility & WCAG AA Audit
- [x] Enforced strict 2px high-contrast focus rings with dark/light mode parity.
- [x] Standardized ARIA labels across navigation, header controls, product cards, wishlist, and compare buttons.
- [x] Accessible contrast helpers for muted text in both obsidian dark mode and light theme.
- [x] Full Persian RTL typographic alignment with self-hosted Vazirmatn font.

### 2. Design System Consistency
- [x] Unified Obsidian dark canvas (`#08090a`) and glassmorphic surface cards (`linear-card`).
- [x] Standardized border radius hierarchy (`rounded-2xl`, `rounded-3xl`) and shadow elevation.
- [x] Normalized button interactions with macOS-native inset depth (`raycast-btn`).

### 3. UX & Interaction Flow
- [x] Overhauled `EmptyState` component with responsive padding, spring animations, and action triggers.
- [x] Redesigned `ProductCardSkeleton` and `ProductDetailSkeleton` matching the card aspect ratios and borders.
- [x] Interactive touch targets meet or exceed 44px minimum touch criteria on mobile viewports.
- [x] Mobile bottom bar upgraded with enhanced touch area and active indicators.

### 5. Design Tokens & CSS Variables
- [x] Extracted hardcoded hex colors into standard CSS design tokens (`--color-surface-light/dark`, `--color-canvas-light/dark`, `--color-border-light/dark`, `--color-text-main-light/dark`).
- [x] Migrated 64+ React `.tsx` components to use `var(--color-...)` for background, borders, and text variables.
- [x] Tested across light and dark theme context switching securely without visual flash.

---

### Round 2026-09-05 — Product Reviews Tab Polish (TEAM-FRONTEND, SHIPPED, live-verified)
- [x] Persian-digit localization in ProductReviews (star counts, percentages, aria labels).
- [x] Zero-review honesty gate: recommend-percentage badge hidden when no reviews (was "۰٪ ...").
- [x] gray→zinc token normalization across the component (file grep gray = CLEAN).
- [x] npm run verify green; artifact audit jsxDEV=0, /Users/=0; live chunk ProductDetail-BWHXF9Vv.js contains «تحلیل امتیاز خریداران», jsxDEV=0.
- [x] Deploy: lock ACTIVE (cron actor mid-deploy same tree) → commit+push only (71745ad); concurrent deploy shipped it; live 200 + health ok after lock cleared.
- Next: blog post 7 editorial content; rotate to cart/checkout or footer polish cluster.

## 🎯 Next Priority Backlog (Phase Next)

- [x] OTP UI gated behind GET /api/auth/otp/status (prod enabled=false → OTP tab hidden, password reset shows Persian notice). Commit c11f9ca, live-verified 2026-09-02.
- [x] SMS.ir OTP dispatch (2026-09-02): server/routes/auth.ts sends OTP via api.sms.ir/v1/send/verify when SMS_API_KEY + real SMS_TEMPLATE_ID configured; '123456' placeholder treated as not-configured (graceful dev-sim/prod no-send, no 502 leak). P0 fixed: deploy.sh no longer rsyncs local .env over VPS .env — merge-safe per-key append of missing SMS_* keys only. `npm run verify` green; live-verified same day.
- [x] Brand PNG cleanup (P2): verified no-op 2026-09-02 — only icon-192/512.png exist (both referenced, PWA-required); all brand logos are referenced SVGs; zero unreferenced PNGs. Item closed.
- [x] Admin panel follow-up (admin-review): newsletter chain + rate limiter + bulk endpoints (9b0d2b9) + admin pagination/bulk UI (PageControls.tsx, d3dc6d9) — `npm run verify` green, deployed + live-verified 2026-09-02.

- [x] Full automated visual & design audit across all storefront & admin routes via `browser_exec`.
- [x] Zero horizontal scroll (CLS/Overflow) verified on all 16 core pages.
- [x] Fixed interactive ARIA labels and button touch targets across Header, Footer, and ChatWidget.
- [x] Purged legacy mock/test images from DB and verified vector SVG rendering parity.
- [x] Strict brute-force rate-limiting on all authentication, reset-password, and SMS OTP endpoints with automated test suite (`tests/unit/rate-limiting.test.ts`).

### Priority 2: Full PWA & Offline Support
- [x] Add Web App Manifest (`manifest.webmanifest`) with `dir="rtl"`, standalone mode, and responsive vector icons (192px / 512px).
- [x] Implement Service Worker (`sw.js`) with Stale-While-Revalidate for catalogue APIs, Cache-First for static assets/fonts, and Offline fallback.
- [x] Registered Service Worker lifecycle in `main.tsx` and linked manifest in `index.html`.

### 3. Iranian Payment Gateways Auto-Failover
- [x] Implemented unified `IPaymentGateway` interface and adapter architecture (`ZarinpalAdapter`, `SamanAdapter`).
- [x] Built resilient `PaymentFailoverRouter` with Circuit Breaker (CLOSED / OPEN / HALF_OPEN states) and consecutive failure tracking.
- [x] Integrated failover dispatch with Idempotency Key header support and atomic order restock / VIP refund rollback.
- [x] Authored unit test suite in `tests/unit/payment-failover.test.ts` verifying auto-switch to Saman when Zarinpal times out.

### 4. Hardcore Adversarial Verification Harness & Invariants
- [x] Created consolidated verification pipeline (`scripts/verify-all.sh`) and unified `npm run verify` command (Strict Typecheck + Vitest + Full Build).
- [x] Implemented comprehensive transactional invariants and Persian input edge-case test suite (`tests/unit/concurrency-invariants.test.ts`).
- [x] Locked profile `code-pro` (`SOUL.md`) to zero-sycophancy and mandatory `npm run verify` enforcement on Janebi Arena.
- [x] Full Production Readiness Documentation & System PRD (`AGENTS.md`, `PROJECT_AUDIT.md`, `PROJECT_GRAPH.md`).
- [x] Verified full verification pipeline (`npm run verify`): 36 test files (297 tests passed), TypeScript clean, client & server builds valid.

## Status: Completed (Aug 30, 2026) — Prod-First Safari/WebKit Bug Sweep

### 6. Production Live Bug Fixes (all deployed to janebiarena.ir)
- [x] Fixed Safari `SyntaxError: Unexpected token '{'` on checkout entry: Persian-digit-aware live validation in `CheckoutRecipientForm.tsx` (`isValidIranianMobile`) + postal code `toEnglishDigits` (`c4cd855`).
- [x] Server-side order validator made nullable/optional-safe: `server/validators/index.ts` `orderSubmitSchema` (`c4cd855`).
- [x] Eliminated unnecessary `401` network calls from `/api/auth/me` + `/api/auth/refresh` on unauthenticated guest visits (`src/contexts/AuthContext.tsx`, `58f6de2`).
- [x] Guarded admin layout stats fetch against unauthenticated guest visits (`src/components/admin/AdminLayout.tsx`, `a79771c`).
- [x] Removed 4 unused image preloads (`products/hld-13.svg`, `brands/apple.svg`, `brands/samsung.svg`, `brands/anker.svg`) causing WebKit preload console warnings (`index.html`, `a73741c`).
- [x] Live verification: WebKit + Chromium on `/`, `/products`, `/checkout`, `/login` — 8/8 CLEAN (0 errors, 0 warnings, 0 failed 4xx/5xx requests); deployed via `deploy.sh`, health `{"status":"ok","database":"ok"}`.
- [x] Governance: PROD-FIRST + dual-engine (WebKit & Chromium) verification rules codified in `PROJECT_GRAPH.md` invariants.

## Status: Completed (Aug 31, 2026) — Build Integrity & Deep Forensic Audit

### 7. Build & Deploy Fixes
- [x] Removed `NODE_ENV=development` from `.env` — Vite 8 was shipping a dev-mode bundle to production (jsxDEV ×763, 30 local path leaks, +37% bundle size). Prod now `production mode`, bundle `index-fuFg16cz.js` verified `jsxDEV:0` on live (`8e170c2`).
- [x] Guarded `vite.config.ts` with explicit production NODE_ENV + `esbuild.drop: ['debugger']` (defense-in-depth; Vite 8 uses oxc over esbuild options).

### 8. Deep Forensic Audit (READ-ONLY — findings only, no code changed)
Full evidence, per-section scores /100, and remediation priorities: **`PROJECT_AUDIT.md` (2026-08-31 edition)**.

Key findings (P0 first):
- [!] Fake aggregate ratings/counts seeded in prod (`reviewsCount` up to 450 vs 2 real reviews) + client fallbacks (`DEFAULT_REVIEWS`, ProductCard `'۴.۸'` default) — must recompute & remove.
- [!] OTP login/reset dead in production (no SMS provider; code generated but never delivered).
- [!] No reaper for abandoned `pending_payment` orders → stock stays deducted.
- [x] P1: SW default branch cache-first traps — FIXED (SW v1.1.0 network-first default, CACHE bumped; P0 verified live).
- [x] P1: `schema.pg.ts` missing `blog_posts` — FIXED (blogPosts pgTable present, schema.pg.ts:155; indexes 0005 SQLite+PG shipped).
- [x] P1: `llms.txt`/`pricing.md` fabricated stats — FIXED (regenerated from live API, verified on prod).
- [x] P2: scratch tables + 9 test coupons — CLEANED (backup janebi-pre-hygiene-1788234770.db, prod re-verified Sep 1); manifest colors, JSON-LD escape, coupon usageLimit, VACUUM INTO backup — all shipped (cluster B).

## Status: Remediation committed (Sep 1, 2026)
- [x] P0 fixes committed: payment-reaper + `orders.created_at` + indexes (0005 SQLite/PG), seed aggregates zeroed, fake client fallbacks removed (ProductCard default rating, ProductReviews DEFAULT_REVIEWS), SW default network-first v1.1.0, llms.txt/pricing.md regenerated from live API.
- [x] P0 verified live on janebiarena.ir: ratings now honest (product 1 → 4.5/2 real; others 0/0), SW v1.1.0, llms.txt real slugs/metadata.
- [x] P2 cluster A (Sep 1): coupon limiter (10/15min per-IP) + `usageLimit`/`usedCount` schema (0006 SQLite+PG) + order-transaction redemption increment + admin create accepts `usageLimit`; prod DB hygiene: 5 scratch tables dropped, 9 stale test coupons deleted (4 real coupons remain); `deploy.sh` now docker-cps `drizzle/` into container.
- [x] P2 cluster B (Sep 1): admin backup via `VACUUM INTO` (consistent WAL-safe snapshot, temp file streamed + cleaned); manifest theme colors synced to Kinetic Commerce palette; JSON-LD breadcrumbs `<` escape; dead `/api/reviews/latest` route removed; OTP feature-gated (`SMS_API_KEY`/`SMS_PROVIDER` env → `GET /api/auth/otp/status`; Login hides OTP tab; `/otp/send` 503 in prod without provider). Live-verified: otp/status `{"enabled":false}`, send=503, reviews/latest=404, manifest new colors, Playwright live flow browse→product→cart→checkout passed with honest rating «۴.۶ از ۵ (۲ نظر)» on product 1.
- [x] Repo hygiene: sketches/, firebase legacy (.firebaserc/.firebase/firebase.json), metadata.json, .neural_graph.json removed; SECRETS_MAP.md local-only (gitignored).

## Status: Prod DB hygiene verified (2026-09-01) — orchestrator round
- [x] Scratch/test tables: census on prod shows ZERO of the 5 audit-listed tables (already purged with Aug-29 rebuild) — no DROP needed.
- [x] Coupons: only 4 real business coupons (WELCOME10/OFF20/SUMMER30/JANEBI100); the 9 stale E2E coupons do not exist — no action needed.
- [x] Migration 0005: prod had only 6/9 idx_* indexes (runner silently skipped 3 statements); missing idx_wishlist_items_user_id, idx_product_features_product_id, idx_contact_messages_status applied manually in-container; re-verified 9/9. integrity_check=ok.
- Evidence: .hermes/reports/backend-db-hygiene.md (commit 7a86682). Independent orchestrator probes: health ok, /api/coupons-active = 4 real coupons only, idx census 9/9.
- Follow-up: SQLite migration runner lacks journaling (`__drizzle_migrations` absent) — partial-application risk remains; track as P2.

## Status: Prod DB hygiene round 2 (2026-09-01, independent re-verification)
- [x] Line 88 P2 prod-DB portion re-verified: backup taken first (`/home/ubuntu/backups/janebi-pre-hygiene-1788234770.db`); sqlite_master census = ZERO scratch/test tables (`scratch_t`,`scratch_t2`,`s3`,`s4`,`mutex_t` absent); coupons = only 4 real marketing coupons (JANEBI100/OFF20/SUMMER30/WELCOME10), zero test coupons; live `/api/coupons-active` = same 4. Nothing to drop or deactivate.
- Evidence: .hermes/reports/backend-db-hygiene-round2.md

## Status: Migration journaling fixed (2026-09-01 round 2)
- [x] P2 follow-up DONE (commit f8b953f): `server/db/index.ts` journaled migrations — `__drizzle_migrations` (sha256/file, SQLite+PG), per-file transaction with journal insert inside the tx, loud failure (file+statement+error to stderr, abort) instead of the old empty-catch silent swallow; legacy backfill for existing prod DB. New tests/unit/migration-journal.test.ts (3 tests).
- [x] Gate: npm run verify — 37 suites / 300 tests PASS. Deployed via deploy.sh; prod verified: journal=7 entries (0000–0006), 9/9 idx_ indexes, integrity_check ok, health ok after keep-alive.
- [x] QA PASS (TEAM-QA, commit 33bf5c6): verify 37/300 green; live /api/health ok, /api/products 14 items, /api/coupons-active exactly 4 real coupons, bundle index-Du9A2uvd.js matches local build. Report: .hermes/reports/qa-2026-09-01-migration-journal.md.
- Next: §3.15 gaps (Permissions-Policy header, CSP report-uri), useStoreSettings fallback single-sourcing.
- [x] Commit f95acbd + 7cffe99 (2026-09-01, QA PASS): hero slide imagery now settings-driven (`heroSlide1Image/2/3` in server DEFAULTS + admin PUT allow-list, zero visual change) — operator can change hero images without a deploy; homepage testimonials section `LatestReviews.tsx` consumes real `GET /api/reviews/latest` (hidden on empty/error); audit_logs table + audit-logged admin mutations (§3.7); blog hidden from sitemap while empty (§3.8/3.9). Deployed + live-verified.
- [x] QA (7c463d4): verify 37/300 green; live probes 200 on /,/products,/products/14,/login; csp-report 204; /api/settings byte-identical to defaults; PUT invalidation code-verified. FAIL item: `reportUris` → invalid CSP directive. Fixed in f2fb02c (`reportUri`), deployed; live header now `report-uri /api/csp-report` verified.
- Next: §3.14 LIKE wildcard escaping; §3.8/3.9 blog seed posts or hide nav; §3.7 admin audit-log table.

## Status: §3.15 headers + settings single-sourcing cluster CLOSED (2026-09-02)
- [x] Permissions-Policy header live (commit 7cffe99-era, verified 2026-09-02; `payment=(self)` align in commit b7e3d82): `camera=(), geolocation=(), microphone=(), payment=(self), usb=(), interest-cohort=()` — helmet v8 removed its middleware, set manually in server/app.ts.
- [x] CSP report-uri via optional env (commit 1cd3b12): `CSP_REPORT_URI` env var drives the legacy `report-uri` directive, emitted only when set (no placeholder URL in code); modern `report-to` transport (Reporting-Endpoints header, internal `/api/csp-report` endpoint with rate-limited 204 sink) stays active regardless.
- [x] useStoreSettings single-source fallback: src/hooks/useStoreSettings.ts + admin Settings.tsx already spread shared `STORE_SETTINGS_DEFAULTS` (src/lib/constants.ts, also consumed by server/routes/settings.ts) — remaining duplicated `'جانبی آرنا'` literals in ProductDetail.tsx (JSON-LD seller name, share title) now import it (commit 1cd3b12). Zero behavior change.
- [x] Gate: npm run verify ALL PASS. Deployed via deploy.sh (health ok). Live evidence 2026-09-02: `curl -sI https://janebiarena.ir | grep -i permissions-policy` → header present; `/api/health` 200 ok; homepage bundle `index-8xinYUga.js` (hash changed from index-Du9A2uvd.js); live CSP has no `report-uri` (CSP_REPORT_URI unset, by design) but `Reporting-Endpoints: csp-endpoint=...` present. Report: .hermes/reports/s315-headers-2026-09-02.md.

### §3.14 LIKE wildcard escaping (2026-09-01, QA PASS)
- [x] `server/utils/like.ts` `escapeLikePattern` (\ % _) + `containsLikePattern` با `escape '\\'` applied to title/category/brand search in `server/routes/products.ts` (commit 0393582) + `tests/unit/like-escape.test.ts` — gate 39 files / 306 tests PASS.
- [x] QA PASS (commit 9a77fd0, report `.hermes/reports/qa-like-escape.md`); deployed via deploy.sh (health ok); live probes: `?search=%25` → `[]` (literal), `?search=قاب` → real Nillkin results.

### OTP Dead-Feature Removal + DB Backup (2026-09-01, QA PASS)
- [x] OTP login/reset UI hidden (dead feature, no SMS provider); endpoints hard-503 in prod — live verified: `POST /api/auth/otp/send` → 503 «سرویس پیامکی فعال نیست»
- [x] JSON-LD `</script>` escape in ProductDetail (\u003c/\u003e/\u0026)
- [x] `scripts/backup-db.mjs` (`npm run db:backup`) — VACUUM INTO, keeps last 7
- Commits 741b1b5 + 30ef18f, deployed, live probes 200. QA: .hermes/reports/qa-2026-09-01-otp-hide.md

### P2 UI cluster (2026-09-01, QA PASS)
- [x] §3.9 filter reuse: shared `src/lib/productQuery.ts` buildProductQuery() — NewProducts (newest) + Offers (onlyDiscounted+discount-desc) use identical query params as Products (commit da2d470).
- [x] §3.10 iOS PNG icons: real rendered public/icon-192.png (2,812 B) + icon-512.png (6,668 B), manifest PNG-first + apple-touch-icon in index.html.
- [x] §3.8 hero 'فست' guard + §3.9 blog nav gating: already closed by earlier clusters (server DEFAULTS verbatim render; no blog links in storefront chrome) — verified no-op.
- [x] QA PASS (commit 3dbd58d): verify 39 suites/306 tests green; live probes 200, PNG bytes match repo, dual-engine 6 pages clean, zero horizontal overflow on 390px. Report: qa-2026-09-01-p2-ui-cluster.md. Deployed.
- Next: §3.12 contact messages archive policy; remaining P2s minimal.

### §3.12 Contact-messages archive policy (2026-09-02, QA PASS via orchestrator verification)
- [x] `archived` status (strict allow-list), `GET /api/admin/contact-messages ?status=` filter (archived hidden by default), auto-archive reaper (1h setInterval, transaction-guarded/idempotent, `ARCHIVE_AFTER_DAYS=90` in src/lib/constants.ts), admin Messages.tsx archive/unarchive + status pills (Persian RTL).
- [x] Commit adbcdc9 (6 files +303/−21), deployed via deploy.sh; bundle index-BplrxINR.js live == local; health ok. Orchestrator re-verified: 2 new test suites 13/13 pass; live admin probes — 430 rows default, archived=0, invalid filter 400, archive/unarchive roundtrip 200.
- Report: .hermes/reports/backend-contact-archive.md
- Close-out re-verification 2026-09-02 (session s312): npm run verify ALL GREEN (42 files/322 tests), all §3.12 criteria confirmed in current tree (UI tabs + archive buttons, API filters, reaper, unread-count exclusion invariant). Docs-only commit — no code change. Report: .hermes/reports/s312-contact-archive-2026-09-02.md
- Next: audit priority list (§6) fully closed. Backlog EMPTY — cron reads reports for regressions only.

### Product-detail design+SEO cluster (2026-09-02, deployed + live-verified)
- [x] TEAM-FRONTEND commit 58e34f7: sticky desktop buy-box + image lightbox polish (theme tokens, Persian digits, ≥44px a11y targets) + Product JSON-LD enrichment (image array absolute URLs, sku, additionalProperty from real category/brand/warranty/features; FAQPage skipped — no real FAQ source).
- [x] Gate npm run verify ALL GREEN (orchestrator re-ran). Deployed via deploy.sh — health ok, bundle index-DPcNgX2n.js live, /products/1 → 200.
- Next: rotate to cart/checkout or admin design + next SEO item.

### Cart/Checkout design + SEO crawlability cluster (2026-09-02, deployed + orchestrator live-verified)
- [x] TEAM-FRONTEND commit 78226bd: kinetic palette tokens on Cart/Checkout summary + coupon feedback (role=status/alert, authFetch), rewritten data-driven CheckoutStepsBar (aria-current, Persian digits, reused on Cart), EmptyState polish, ≥44px a11y targets + prefers-reduced-motion. Gate 42 files/322 tests GREEN.
- [x] TEAM-BACKEND/SEO commit 5eeec55: sitemap lastmod 2026-09-02 + real product URLs, X-Robots-Tag header, absolute canonical — rest audited no-op with live evidence.
- [x] Orchestrator live checks: health 200, live bundle index-BiBTCCwB.js == cluster build, sitemap 24× lastmod 2026-09-02, canonical + x-robots-tag present.
- Reports: .hermes/reports/frontend-cart-checkout-2026-09-02.md, backend-seo-2026-09-02.md
- Next: rotate to product/blog or admin design + next SEO item (Core Web Vitals).

### Reviews-pagination cluster QA (2026-09-03b, PASS)
- [x] TEAM-QA: npm run verify 44 files/337 tests GREEN + live bundle index-2CuGcgTU.js; 20/20 live checks (Persian pagination UI, ?page&limit meta, page1≠page2, empty-state 'جدید' no fabricated rating, dual-engine console clean, 390px no overflow). Report: .hermes/reports/qa-2026-09-03b-reviews.md
- Next: blog seeding (prod 0 posts) + JSON-LD BlogPosting (SEO item).

## Round 2026-09-03c
- [x] Design: product gallery interaction + spec-table zebra/dark tokens + Persian a11y (3ef7b25) — QA PASS, deployed, live bundle index-DNtSEzq_.js
- [x] SEO groundwork: blog_posts tags column + PG parity migration 0008 (5bdb8d5) — QA PASS, deployed
- [x] SEO: blog seed content (3 authentic Persian posts) + JSON-LD BlogPosting + sitemap blog URLs — commit 24fd04f, verify 44/337 GREEN, deployed; prod DB seeded via docker cp into /app; live: /api/blog=3, sitemap 3 blog URLs, /blog/:slug 200. Report: qa-2026-09-03b-reviews.md / session 2026-09-03d.
- Next: JSON-LD detail live-check; rotate to next design/SEO cluster (footer or admin).

### Round 2026-09-10 (cron)
- [x] Blog post 11 (پایه رومیزی موبایل) + copy-link button in article modal — live 2026-09-11 round
- [x] Tag chips + JSON-LD keywords — live
- Next: post 11 + rotating UI/SEO round
