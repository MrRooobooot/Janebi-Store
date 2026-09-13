# UI/UX AUDIT LOG — single source of truth (append-only; one row per verified finding)

Legend: status = open | fixed | wontfix. Evidence = DOM probe / pixel probe / screenshot / HTTP.
Pixel probe (`scripts/probes/probe-pixel.mjs`) is the ONLY contrast authority —
`getComputedStyle` on oklab colors mis-parses (2.87 artifacts, disproven 0912).

| date | page | viewport | theme | finding | evidence | root cause | fix | status |
|------|------|----------|-------|---------|----------|------------|-----|--------|
| 0911 | header nav | 1280 | light+dark | suspected low-contrast nav links | pixel probe 7.59:1 | — | none needed | wontfix |
| 0912 | contact/login inputs | 1280 | light | placeholder ~2.6:1 (vision+pixel) | pixel probe rgb(71,85,105)→srgb oklab mis-read | browser-default placeholder color; no project rule | `--color-text-*` floor in index.css | fixed |
| 0912 | cart page | 1280 | light | disabled step buttons 2.8:1 flagged by vision | DOM: `text-zinc-400` = intentional disabled affordance (WCAG exempts disabled) | — | none | wontfix |
| 0912 | PDP tabs | 1280 | dark | suspected tab/contrast breaks | DOM+pixel: active tab switches, text 8:1+ | — | none needed | wontfix |
| 0912 | PDP specs | 1280 | dark | spec table one line only | API: specs data absent in DB row | data poverty, not UI | backfill 138/138 via PUT /api/admin/products (features tx-replace), zero-fabrication (verbatim title tokens); prod re-scan: 122/138 with features, specs tab rows verified live | fixed |
| 0913 | store cleanliness (user directive «فروشگاه تمیز») | — | — | digikala provenance in copy: «منبع استعلام…digikala (dkp-…)» desc lines, DK- skus, dk- image filenames on 125 products | /api/products scan | seed imported vendor-identifying metadata | stripped descriptions (0 provenance rows), sku→JB-<id>, images renamed p-<id> on VPS host+dist (dk- → 404, p- → 200); API re-scan 0/0/0 | fixed |
| 0912 | all products | all | all | 124 product images hotlinked to digikala CDN (fragile, WAF 408) | `/api/products` scan + 408 in console | seed imported remote URLs | phase-2 migration: 124 self-hosted `/images/products/dk-*.jpg` + 124 `.avif` variants (-82% bytes), compose mount added, APPLIED 124/124, 0 broken imgs on prod | fixed |
| 0912 | reviews | all | all | 0 reviews in DB across 138 products | `/api/products/*/reviews` = [] | no real reviews imported | honest empty-state kept (no fake data) + review-request path shipped 0913: per-item «ثبت نظر» CTA on delivered orders → /products/:id?writeReview=1 opens reviews tab + form (prod probe: tab active, param cleared, honest empty copy) | fixed |

## Coverage ledger (stateful guest rotation A) — DONE
- products grid, PDP + tabs: swept light+dark 1280+390 — PASS (vision + DOM)
- cart with real items: swept — PASS (disabled-step flag = wontfix)
- checkout gate, wishlist, compare, search, statics (about/contact): swept light+dark — no new defects
- external-host noise (enamad 403/408, digikala 408 pre-fix): classified NOT app bugs

## Rotation B — admin panel (isolated snapshot DB, :3978) — this round
| 0912 | /admin/audit-logs | 1280 | both | meta cell raw JSON truncated (267>224px) | DOM probe sw>cw | `truncate` on JSON blob | `<details>` expand → pretty-printed pre; re-probe trunc:0, expand verified | fixed |
| 0912 | SKU/dash/loader/labels (Products, Blog, Newsletter, Reviews, Settings, Coupons) | 1280 | light | text-gray-400 ≈2.8:1 on white | DOM computed oklch .707 | un-flipped subtle text | flipped to gray-600 dark:gray-400 (18 sites) | fixed |
| 0912 | admin empty-state icon (Products) | 1280 | both | "weak contrast icon" vision flag | decorative ≥48px, WCAG exempt | — | none | wontfix |
| 0912 | /admin/blog/new 404 | — | — | vision/probe flag | Blog uses inline form; no `/new` link exists in code | probe artifact | removed from probe list | wontfix |
| 0912 | dashboard bottom-clip / missing pagination (vision) | 1280 | — | "سطر آخر بریده" | screenshot viewport edge; Products loads ALL by design (code comment L124) | — | none | wontfix |
| 0912 | dashboard metric grid asymmetry (vision: row2 2-of-4 cols) | 1280 | dark | flagged | 6 metric cards / 4-col grid = data-count artifact, not CSS break | — | none | wontfix |

## Rotation D — admin mobile 390px (isolated DB, :3978) — this round
| 0912 | Orders chips row | 390 | both | visible scrollbar on filter chips (touch scroll works, CDP drag -305px) | DOM probe offsetWidth-clientWidth>0 pre-fix | `no-scrollbar` class undefined in TW4 config-less setup | `@utility no-scrollbar` defined in index.css (post: scrollbar 0) | fixed |
| 0912 | Products table | 390 | both | "کات لبه چپ/جدول نامناسب" vision flag | probe: in-container scroll 748>356, body hOver=0; table scrolls inside rounded card by design | desktop table + overflow-x container | none — intended pattern (card-view rewrite = wontfix until column count grows) | wontfix |
| 0912 | all pages | 390 | both | horizontal page overflow | probe hOver:0 all 11 pages | — | none | wontfix |
| 0912 | Products 138 sub-40px targets | 390 | both | "tiny targets" flag | they are the quick-stock pill (36px h × 49px w, pointer+input swap on tap); 44px rule = recommended not blocker | — | none | wontfix |
| 0912 | drawer | 390 | both | hamburger menu functionality | 18 links visible after tap, backdrop OK | — | none | wontfix (healthy) |

## Rotation E — admin panel re-layout (user request «پنل بچین») — incl. E2 unification
| 0912 | all 11 admin pages | 1280+390 | both | 3 drifted h1 variants (no-icon 2xl→3xl / text-primary-500 icon / text-xl Blog) | grep code scan | copy-paste drift over time | `PageHeader` component (icon-[var(--color-emphasis-text)] + truncate + subtitle); migrated 11/11; probe sweep clean; blog dark screenshot verified (no raw JSX, Persian digits) | fixed |
| 0912 | sidebar | 1280+390 | both | flat 11-item nav, verbose labels | vision+code | no workflow grouping | 3 sections: فروش و کالاها / مشتریان / محتوا و سیستم; shorter labels; 11 links + 3 headers, no nav overflow desktop+drawer | fixed |
| 0912 | dashboard stats | 1280 | both | 6 cards on 4-col grid = broken 2nd row | vision flag earlier reclassified: real defect now | grid lg:grid-cols-4 with 6 items | lg:grid-cols-3 (symmetric 2×3) | fixed |
| 0912 | dashboard VIP card | 1280 | both | stretched to 731px row height = dead whitespace | DOM: vipH 731→208 post-fix | grid default `stretch` | `self-start` | fixed |
| 0912 | mobile burger button | 390 | — | `items-center justify-center` w/o flex = no-op | code read | missing `flex` | added flex | fixed |
| 0912 | «مشاهده همه» misaligned / icon side | 1280 | — | vision flags | DOM probe: link x=57 (left edge = correct RTL justify-between); icon-right pattern consistent app-wide | — | none | wontfix |

## Rotation C — forms & micro-interactions (auth modal, coupon, qty stepper) — 0913
Probe: `scripts/probes/probe-rotation-c.mjs` + `shots-rotation-c.mjs` (live prod, DOM+pixel+vision, light/dark × 1280/390)
|| 0913 | AuthModal + Login/Register/Checkout | 1280+390 | both | native browser validation tooltip — English "Please fill out this field." (LTR) covered RTL label; app's Persian JS validators unreachable (`emptySubmitFeedback: NO FEEDBACK`) | prod probe + screenshot fix-m-light-auth-toast | `required` attrs without `noValidate` on form | `noValidate` added 4 forms; probe re-run: Persian toast shown all 4 combos | fixed |
|| 0913 | coupon apply | 1280+390 | both | zod English leak: banner showed "Invalid input: expected number, received null" | prod probe couponErrorText | zod v4 type-error msg must sit on z.number() itself; + client sent NaN cartTotal | `z.number("مبلغ سبد…معتبر باشد")` + `Number.isFinite(cartTotal)` guard; live curl: msg Persian | fixed |
|| 0913 | toast stack vs MobileBottomNav | 390 | both | toasts (`bottom-4 z-50`) rendered ON TOP of nav (`bottom-0 z-40`) — nav icons un-clickable during toast | prod screenshot c-m-*-cart-coupon-err + vision | fixed container with no mobile inset for nav | `bottom-20 lg:bottom-4 z-[60]`; geometry probe: overlapPx 0 @390, toastTop 718 < navTop 770 | fixed |
|| 0913 | coupon error dual surface | 390+1280 | both | same error shown as inline banner AND toast | useCartSummary: setCouponError + addToast | duplicate channels | inline dismissible banner = single surface (toast kept for success/rate-limit paths via catch); probe duplicateToast:false | fixed |
|| 0913 | qty stepper cart | 1280+390 | both | minus@1 disabled opacity .3; plus 44×44; hover fill rose | DOM probe | intentional affordance | none | wontfix |
|| 0913 | auth modal health | 1280+390 | both | focus-on-open=dialog, Escape closes, backdrop closes, body scroll restored, eye-toggle works, submit 378×48/304×48, input contrast 7.0–7.6 pixel, error banner 6.1–18.1 pixel | DOM+pixel probe | — | none needed | wontfix |
|| 0913 | inactive tab light 390 | 390 | light | tabInactiveContrast 4.58 | pixel probe | ≥4.5 AA floor met | none | wontfix |
|| 0913 | submitContrast d-m-light 4.73 | — | light | pixel 4.73 | rose CTA #e11d48 vs white text = 4.7:1 — AA pass for ≥18px bold (button is text-sm bold 48px, large-text exemption 3:1) | — | none | wontfix |

Gate: design-audit 8/8 PASS (WebKit+Chromium × light/dark × 390/1280), `npm run verify` PASS, deployed BUILD_INFO `9afc76d`, prod re-probe 4/4 combos Persian feedback.

## Rotation F — checkout / payment micro-flow (0913)

Probe: `scripts/probes/probe-rotation-f.mjs` — sandbox `:3978` (prod DB snapshot via better-sqlite3 `backup()`), Playwright 390px, toast capture through `[role="alert"]` polling (toasts live 3s — a post-hoc read loses them).

| تاریخ | سطح | ویوپورت | تم | یافته | شاهد | ریشه | فیکس | وضعیت |
|---|---|---|---|---|---|---|---|---|
| 0913 | checkout guest submit | 390 | light | نشت پیام خام انگلیسی سرور: توست `Unauthorized: No token provided` | probe S1 (toast capture) + prod re-probe | `addToast(data.message)` روی ۴۰۱ بدون هیچ شاخهٔ اختصاصی؛ سشن منقضی/میهمان = پیام خام API روی صورت کاربر | گارد `res.status === 401` → «برای ثبت سفارش ابتدا وارد حساب خود شوید» + `navigate('/login')` | fixed |
| 0913 | phone input blur | 390 | light | `9123456789` بعد از blur تبدیل نمی‌شد (باقی‌ماندهٔ چرخش C) | probe S2 DOM `inputValue` | input فقط `onChange` داشت؛ نرمال‌سازی صرفاً در submit و در انتخاب آدرس ذخیره‌شده | `onBlur` → `normalizeIranianMobile` | fixed |
| 0913 | `/api/payment/verify` ریدایرکت‌ها | — | — | پیام‌های انگلیسی خام در URL: `message=Invalid parameters|Order not found|Internal error` → روی صورت کاربر در callback | probe S6 + `curl -sI /api/payment/verify` | سه ریدایرکت سرور با متن انگلیسی | متن فارسی + `encodeURIComponent` | fixed |
| 0913 | CheckoutCallback copy | all | both | هر `message` دلخواه از query بدون فیلتر رندر می‌شد | probe S6 | `message || fallback` | رندر فقط اگر حاوی حروف فارسی باشد، وگرنه متن پیش‌فرض | fixed |
| 0913 | شناسه‌های machine (کد سفارش) | 390 | both | `ORD-...-71A7` با گلیف ارقام فارسی رندر می‌شد (`...-71A۷`) — شناسهٔ کپی‌شدنی خراب | vision روی `docs/shots/f-s7-toast-latin.png` + `docs/shots/f-s4-cod-history.png` | `body { font-feature-settings: "ss01" }` (Vazirmatn) ارقام ASCII را به گلیف فارسی می‌برد؛ `dir-ltr` هم در CSS تعریف نشده بود | utility `.latin-nums` (`ss01: off`) + تعریف گمشدهٔ `.dir-ltr`؛ اعمال روی توست‌ها، ردیف سفارش، داشبورد، callback | fixed |

سالم/بدون ایراد (شاهددار): استپر و submit ≥44px (`h=52`)، مسیر COD کامل (`POST /api/orders 201` → `/profile?tab=orders` + توست کد سفارش، صفر فراخوانی payment)، مسیر آنلاین → توست فارسی درگاه بدون نشت انگلیسی (`503` در sandbox = کلید درگاه محلی، نه باگ)، اعتبارسنجی فارسی تک‌سطحی (`لطفا تمامی اطلاعات ضروری گیرنده را تکمیل کنید`)، خالی‌بودن سبد = EmptyState صادق.

Gate: `npm run verify` PASS (406 تست)، `design-audit` **8/8 PASS** (WebKit+Chromium × light/dark × 390/1280، err:0)، probe sandbox **12/12**، prod re-probe: blur `09123456789` ✓، توست مهمان فارسی + ریدایرکت `/login` ✓، صفر نشت انگلیسی در callback ✓، `latin-nums` در CSS سرو‌شده ✓، ریدایرکت verify فارسی ✓.

نکتهٔ ابزاری (دام): `data/janebi.db` محلی و snapshot قدیمی `dk-*` دارند و audit را با `err:80` می‌شکنند؛ snapshot تازه با `better-sqlite3 .backup()` + `docker cp` + کپی `public/images/products/*.avif` (gitignore شده) لازم است.

## Next rotations (standing goal)
- G: تکراری‌سازی پروب چرخش F در cron طراحی (پایش خودکار checkout) یا چرخش بعدی per UI-AUDIT-LOG.
