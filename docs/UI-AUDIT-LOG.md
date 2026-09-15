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

## Rotation R1×R2 cross-check — admin API (0913, post-review)
| 0913 | `GET /api/admin/users` (non-owner admin) | — | — | ردیف مالک بعد از `LIMIT/OFFSET` فیلتر می‌شد ولی `X-Total-Count` کل جدول را می‌شمرد → ۱۸ در برابر ۱۷ ردیف قابل‌شمارش؛ هم نشت وجود حساب مخفی، هم هر صفحه یک ردیف کوتاه | تست رگرسیون جدید `RED` روی کد قبلی: `expected 18 to be 17` | پنهان‌سازی مالک در JS و بعد از اسلایس، و count بدون `where` | فیلتر به SQL منتقل شد (`ne(users.id, ownerId)` مشترک بین query و count) | fixed |

Gate: `npm run verify` PASS (412+ تست، شامل تست جدید)، parity `dist/server.cjs` md5 `c55e346…` محلی == داخل کانتینر، prod `BUILD_INFO=d0cc462`، `e2e-prod-0913.mjs` **8/8 PASS**، prod DB `integrity_check=ok` و `3 کاربر / 138 کالا`.
Purge پس از آخرین گیت (قاعدهٔ جدید): ۳۴ کاربر + ۹ کالا + ۳ نظر → `data/janebi.db` = ۳ کاربر / ۱۴ کالا / ۰ تصویر تستی.

## Homepage first-screen rework (0913, user request: «اندازهبندی و آیتمهای نگاه اول»)
| 0913 | home fold, 390+1280, both themes | 390/1280 | both | هیچ محصول/قیمتی در نگاه اول نبود: اولین کارت y=1282 (موبایل) / y=1230 (دسکتاپ)؛ عنوان کارت ۱۲px و قیمت ۱۲px (کوچکتر از متن محیطی)؛ CTA هیرو ۴۰px و ۳۹ هدف زیر ۴۴px | DOM probe زنده قبل/بعد + design-audit هر دو موتور | چیدمان بنرمحور: هیرو ۴۰۶/۴۴۹px + نوار عمده + ۴ کارت مزیت (تکستونی) قبل از ردیف محصول؛ مقیاس تایپ بدون قاعده | ردیف «پیشنهادات شگفتانگیز» بلافاصله بعد از هیرو؛ مزیتها ۲×۲ موبایل؛ هیرو فشرده (۲۶px H1، p-4، تایل دسکتاپ ۲۵۶)؛ تایپ: h2 ۲۰/۲۴، عنوان کارت ۱۳/۱۵، قیمت ۱۳/۱۵، بج ۱۱؛ لمس: CTA ۴۸، فلشها/نقطهها/آیکون هدر ۴۴ | fixed |

اثبات زنده روی prod (`BUILD_INFO=e773786`): موبایل — تیتر بخش ۱۱۲۹→**۵۳۵**، اولین کارت ۱۲۸۲→**۶۸۸** (داخل فولد ۸۴۴)، هیرو ۴۰۶→۳۷۴، CTA ۴۰→۴۸، اهداف <۴۴px ۳۹→۳۰؛ دسکتاپ — تیتر ۹۶۸→**۶۵۵**، اولین کارت ۱۲۳۰→**۷۴۶** (فولد ۸۰۰)، هیرو ۴۴۹→۴۰۳، قیمت ۱۲→۱۵. گیت: `npm run verify` PASS، design-audit **8/8 err:0**، `e2e-prod` **8/8**.
بستهٔ ۴ (مقیاس ریتم عمودی) عمداً ارسال نشد → ارتفاع کل تقریباً بیتغییر (۶۲۱۴→۶۱۴۹ موبایل، ۴۳۳۰→۴۳۰۰ دسکتاپ).

ریشهٔ residue (رفع ریشهای، تکمیلشده در راند بازبینی زیر): سوییت `admin-hardening` کالاهای ساختهشده را حذف میکند و `tests/global-teardown.ts` پس از کل اجرا کاربران/محصولات فیکسچر را پاک میکند — ریتوئال «purge بعد از gate» دیگر لازم نیست.

## Independent review round (0913) — findings accepted, fixed, re-verified
| 0913 | home fold, **price** row | 390 | both | review: کارت در فولد بود ولی **قیمت** نه (y=906 در ۸۴۴ و زیر فولد گوشی واقعی ~۶۶۰) → خروجی موردنظر کاربر محقق نشده بود | probe زنده: `priceTop 906 → 606`, `priceBottom 625 < 660` | متریک اشتباه (top کارت به‌جای قیمت) + هیرو/هدر بخش بلند | هیرو موبایل ۲۴۳px (H1 ۲۴، زیرعنوان/چیپ مخفی زیر sm)، هدر بخش تک‌ردیفه، کارت (p-2.5، تصویر h-16) | fixed |
| 0913 | `order:paid` دوبل | — | — | review: `markOrderPaid` نتیجهٔ flip را برنمی‌گرداند و emit بی‌قید بود → کالبک هم‌زمان/تکراری = دو پیامک/دو هشدار | read کد: `payment.ts:130` return بی‌مقدار + `:176,:197` emit بی‌قید | emit روی مسیر غیر‌گذار | `markOrderPaid(): boolean` + `if (flipped) emitOrderPaid(...)`؛ تست: verify هم‌زمان + replay → **exactly 1** emit | fixed |
| 0913 | `/api/admin/users` صفحه‌بندی | — | — | review: `ORDER BY coalesce(created_at,0) DESC` بدون tie-breaker؛ چند کاربر با یک timestamp روزمبنا → احتمال افت/تکرار ردیف بین صفحات | prod: دو کاربر `created_at=1788566400000` یکسان | نبود کلید ثانویه | `desc(users.id)` + تست پیمایش همهٔ صفحات با timestamp یکسان (بدون تکرار/افت) | fixed |
| 0913 | residue تست | — | — | review: «ریشهٔ residue بسته شد» نیمه‌درست بود — کاربران فیکسچر باقی می‌ماندند (۳→۱۷→۲۹) و ریتوئال purge دستی لازم بود | شمارش قبل/بعد سوئیت روی `data/janebi.db` | پاک‌سازی فقط در یک سوییت و فقط محصول | `tests/global-setup.ts` + `global-teardown.ts`: حذف کاربران/محصولات فیکسچر پس از کل اجرا؛ اثبات: `npm run verify` → `users=3 / products=14 / testimg=0` بدون purge دستی | fixed |

تأیید مجدد پس از فیکس (`BUILD_INFO=4e647d9`, parity `dist/server.cjs md5 874f6bb2…` محلی==کانتینر): `npm run verify` PASS (57 فایل/422 تست) · design-audit **8/8 err:0** · `e2e-prod` **8/8** · فولد prod: ۳۹۰×۶۶۰ قیمت ۶۰۶–۶۲۵ (کامل داخل فولد، ۲ کارت با قیمت)، ۳۹۰×۸۴۴ چهار کارت، ۳۶۰×۶۴۰ دو کارت؛ `docH` ۶۲۱۴→۵۶۷۶.
باقی‌مانده (پذیرفته): **دسکتاپ** ۱۲۸۰×۸۰۰ — کارت‌ها در فولد‌اند (۷۴۶) ولی قیمت y=۱۰۲۵ می‌ماند؛ رفع نیازمند خرد‌کردن هدر دسکتاپ (۱۴۷px) یا هیرو (۴۰۳px) است — بستهٔ جداگانه.

## Mobile design pass (0913, user: «موبایل اصلا قشنگ در نیومد») — design-first rework
| 0913 | mobile header | 390 | both | review+vision: ۶ کنترل ۴۴px + لوگو در ۳۹۰px = شلوغی و سرریز | ریشهٔ واقعی: `.min-touch-target` خودش `display:inline-flex` داشت و چون بعد از utilities تیلویند می‌آید، `hidden`/`lg:flex` را می‌شکست → کنترل‌های دسکتاپی (تم/مقایسه) روی موبایل می‌ماندند | utility فقط اندازه می‌دهد؛ display در محل مصرف | هدر موبایل: منو/لوگو/جستجو/ورود (۴ کنترل)، سبد در نوار پایین، تم و مقایسه در دراور، تم ریست | fixed |
| 0913 | hero موبایل | 390 | both | «تکست‌محور، بدون تصویر، جعبهٔ خاکستری دور آرت» | vision ۴.۵/۱۰ | حذف تصویر در موبایل (`hidden md:flex`) + جعبهٔ tile | آرت محصول کنار متن (۹۶px بدون جعبه)، H1 ۲۲px/۱.۳۵، زیرعنوان ۲ خط، دکمه‌های فلش فقط sm+ | fixed |
| 0913 | ردیف معاملات | 390 | both | عنوان `truncate` بریده، تایمر دوجعبه‌ای، تصویر کالا ۴۲px (تایل h-16) | DOM: img box 120×42 + vision «blank placeholders» | فشردگی افراطی راند قبل | تایل `aspect-[4/3]` با سطح `slate-100`/`white-8%`، پدینگ کارت ۱۲px، قیمت ۱۵px، بج با پدینگ واقعی، تایمر `dir=ltr` و بدون قاب دوتایی | fixed |
| 0913 | قیمت زیر نوار پایین | 390 | both | قیمت در y788 دقیقاً زیر نوار ۵۶px نوار پایین می‌افتاد (روی اسکرین‌شات «قیمت نیست») | اندازه‌گیری: `navTop=770` | نبود بودجهٔ فولد منهای نوار | پیام اعتماد هیرو فقط sm+، CTA ۴۴px، پدینگ‌های بخش/هدر کمتر، min-h عنوان ۴۰px → `priceBottom=752 < navTop=770` و **۲ کارت با قیمت بالای نوار** | fixed |

تأیید زندهٔ نهایی (`BUILD_INFO=c4b851b`، هر دو تم، ۳۹۰×۸۴۴): هیرو ۲۷۷ · اولین قیمت ۷۶۶–۷۵۲ · هدر ۴ کنترل · تصاویر کالا لود‌شده (natural 512×512، box 118×83) · `npm run verify` PASS · `design-audit` 8/8 err:0 · `e2e-prod` 8/8.

## Card system unification + detail pass (0913, user: «کارتها هم عکس هم آیتم، هماهنگ»)
| 0913 | دو طراحی کارت در یک صفحه | 390/1280 | both | ردیف «شگفتانگیزها» کارت اختصاصی (تایل ۴:۳، بدون امتیاز/گارانتی/CTA) و ردیف «برگزیده» `ProductCard` — دو زبان بصری روی یک صفحه | vision + DOM: ارتفاع ۲۶۷ در برابر ۳۸۰، نبود CTA | کپی‌برداری موازی به‌جای یک کامپوننت | `ProductCard` با `variant="compact" | "full"`: هر دو ردیف یک کامپوننت (بج، تایل، عنوان، قیمت+CTA)؛ کامپکت = تایل ۴:۳ و پدینگ ۲.۵ برای بودجهٔ فولد | fixed |
| 0913 | باگ رگرسیون کامپکت | 390 | both | نسخهٔ اول کامپکت **عنوان کالا را حذف کرد** (fragment اشتباه دور عنوان هم باز شد) | vision: «Title element completely omitted» + DOM بدون `h3` در کارت معاملات | مرز `variant === 'full'` غلط | عنوان همیشه رندر می‌شود؛ فقط ردیف دسته/امتیاز و ردیف گارانتی مخصوص `full` هستند | fixed |
| 0913 | تایل‌های روشن | 390/1280 | light | تایل `slate-100` شبیه اسکلتون لودینگ بود («تصاویر خالی») | curl: `p-5590.avif 200 33627B` · `p-5590.jpg 200 191615B` + DOM `naturalWidth=512` → تصاویر سالم، کنتراست تایل کم بود | انتخاب سطح نامناسب | تایل لایت سفید با بردر `slate-200/70` | fixed |
| 0913 | نقطه‌های اسلایدر هیرو | 390 | both | روی کارت ۳۹۰px با CTA/لبه‌های متن تصادم داشتند | vision (دو راند) + probe | چیدمان absolute روی کارت باریک | نقطه‌ها فقط `sm+`؛ روی موبایل چرخش خودکار ۶ ثانیه + سوایپ (احترام به `prefers-reduced-motion`) | fixed |

تأیید زنده (`BUILD_INFO=0a2de3e`، ۳۹۰×۸۴۴): ۱۳ کارت · ارتفاع‌ها یکنواخت (۲۷۹ ردیف معاملات / ۳۷۳ ردیف برگزیده) · هیرو ۲۳۲ · عنوان در کارت‌ها حاضر · `priceBottom=763 < navTop=770` · نقطه‌ها روی موبایل مخفی/دسکتاپ فعال · تصاویر کارت لود‌شده · gate + design-audit 8/8.
پذیرفته (بدون تغییر): FAB چت روی موبایل بخشی از کارت را می‌پوشاند — الگوی استاندارد و ۴۴px؛ حذف کامل آن نیاز به تصمیم محصولی دارد.

## Compression audit (0913, user: «به‌خاطر فشرده‌سازی شاید به‌مریختگی داشته باشیم») — probe-driven
| 0913 | برچسب دسته‌بندی بریده | 390 | both | «قاب و کاور موبایل» ۶px و «گلس و محافظ صفحه» ۲۴px با ellipsis قطع می‌شد (کارت ۱۱۲px) | DOM: `scrollWidth 92 > clientWidth 86` | `truncate` روی کارت ۱۱۲px | `line-clamp-2 leading-tight` + ارتفاع کارت ۱۲۸→۱۴۰ | fixed |
| 0913 | دکمهٔ افزودن به سبد ۳۸×۴۰ | 390 | both | CTA اصلی کارت زیر ۴۴px در موبایل | DOM probe: w38 h40 | آیکون‌تنها با `px-3` | `h-11 w-11` (۴۴×۴۴) موبایل، عرض خودکار از `sm` | fixed |
| 0913 | تارگت‌های کوچک | 390/1280 | both | تب‌های دسته ۲۸px، لینک «همه» ۱۶px، آیکون‌های علاقه‌مندی/مقایسه ۲۸px، لوگو ۴۲px | DOM probe (لیست کامل) | فشرده‌سازی راندهای قبل | تب‌ها `min-h-[44px]`، «همه» `min-h-[44px]`، آیکون‌ها ۳۲px، لینک لوگو `min-h-[44px]` | fixed |
| 0913 | بررسی کلی مریختگی | 390/360/1280 | both | سؤال کاربر: فشرده‌سازی باعث به‌هم‌ریختگی شده؟ | probe کامل: `pageOverflowX=0` · ellipsis ۰ (۳۹۰) · کلیپ متن واقعی ۰ · ردیف‌ها هم‌تراز (titleTop/ctaTop یکسان، ارتفاع یکنواخت ۲۷۹ موبایل / ۳۷۰ دسکتاپ) | — | فقط موارد بالا اصلاح شد | verified |

پذیرفته (تصمیم محصولی، نه باگ): زیرعنوان هیرو روی موبایل `line-clamp-2` (۳ خط → بودجهٔ فولد) · FAB چت روی موبایل لبهٔ کارت را می‌پوشاند (الگوی استاندارد) · دکمه‌های ثانویهٔ علاقه‌مندی/مقایسه ۳۲px (بالاتر از حد WCAG 2.5.8 = ۲۴px).

## Second independent review (0913) — two HIGH gaps in my own tooling, both closed
| 0913 | `tests/global-teardown.ts` مشتری واقعی را پاک می‌کرد | — | — | الگوی `usr-%` دقیقاً همان شکل ثبت‌نام واقعی است (`usr-<epoch>`، `server/routes/auth.ts`) → یک اجرای vitest روی DB دارای مشتری، آن‌ها را حذف می‌کرد | بازبین (کد + شکل id) + تست ایمنی من | حذف بر اساس شکل id به‌جای زمان | حذف فقط وقتی epoch داخل id ≥ شروع اجرا (منهای ۱۰ دقیقه skew)؛ ادمین‌ها علاوه‌بر آن باید پیشوند فیکسچر داشته باشند؛ `FORCE_FIXTURE_PURGE=1` برای پاک‌سازی دستی | fixed (اثبات: مشتری ۲۰۲۳ و ادمین قدیمی جان به‌در بردند، فیکسچر تازه حذف شد) |
| 0913 | `design-audit` فقط `/products` را می‌دید | — | — | سه راند کار صفحهٔ اول با probe دستی تأیید شده بود؛ گیت رسمی آن را پوشش نمی‌داد | بازبین | محدود بودن اسکریپت به یک مسیر | ماتریس کامل روی `['/products','/']` (۱۶ ترکیب: WebKit+Chromium × light/dark × 390/1280) + صرف‌نظر از نویز مهمان `401/429` روی `/api/auth/*` (خود rate-limit با بار مکرر audit فعال می‌شد و سیگنال‌های واقعی را می‌پوشاند) | fixed — **16/16 PASS err:0** |
| 0913 | جزئیات باقی‌مانده | 360/1280 | both | برچسب دسته در ۳۶۰ (۲px)، نقطه‌های اسلایدر `18×24` و دکمهٔ جستجو `20×20` در دسکتاپ (کف WCAG 2.5.8 = ۲۴) | probe بازبین | ردیف دسته تک‌خط، آیکون‌ها بدون حداقل اندازه | ردیف دسته `flex-wrap` + `flex-1` برچسب · نقطه‌ها `24×24` در `sm+` + حذف کلاس‌های مردهٔ موبایل · سابمیت جستجو `44px` | fixed |

پذیرفته (تصمیم، نه باگ): تفاوت دو حالت کارت آگاهانه است — هر دو یک زبان دارند (بج، تایل، عنوان، قیمت+CTA) و `full` سه ردیف بیشتر (دسته/امتیاز، گارانتی) دارد؛ یکسان‌سازی کامل حدود ۴۴px ارتفاع اضافه می‌کند و قیمت را زیر نوار پایین می‌برد (اندازه‌گیری‌شده).

## Order-receipt SMS activated + deploy env-merge bug (0914)
| 0914 | پیامک فاکتور خرید هرگز ارسال نمی‌شد | — | — | `SMS_ORDER_TEMPLATE_ID` و `SMS_LINE_NUMBER` روی VPS خالی بودند؛ `sendOrderReceiptSms` بی‌صدا رد می‌کرد (سفارش را خراب نمی‌کرد) | خواندن کد + `printenv` کانتینر | قالب 937005 ساخته شد (`#ORDERCODE#`/`#AMOUNT#`) ولی نام پارامترهای کد `OrderCode`/`Amount` بود | نام پارامترها به حروف پنل تغییر کرد + کلید در `.env` لوکال (merge خودکار) + بازسازی کانتینر | fixed — ارسال واقعی با قالب ۹۳۷۰۰۵: `{"status":1,"message":"موفق"}` |
| 0914 | merge کلیدهای `SMS_*` در دیپلوی، فقط کلید اول را ست می‌کرد | — | — | `ssh` داخل حلقهٔ `while read`، stdin حلقه را می‌خورد → بعد از اولین ایتریشن حلقه تمام می‌شد (ریشهٔ گم‌شدن `SMS_ORDER_TEMPLATE_ID` و قبلاً `SAMAN_TERMINAL_ID`) | بازتولید گام‌به‌گام روی VPS: فقط `skip (exists): SMS_API_KEY` چاپ شد | `ssh -n` + تغذیهٔ حلقه با process substitution | fixed — دیپلوی بعدی هر ۵ کلید را گزارش کرد |
| 0914 | تغییر `.env` با `docker restart` اعمال نمی‌شد | — | — | `env_file` هنگام **create** خوانده می‌شود؛ restart مقدار قدیمی را نگه می‌دارد | `docker exec printenv` قبل/بعد | کانتینر با کلید در `.env` هم بدون کلید بود | هنگام افزودن کلید جدید، `docker compose up -d app` قبل از `docker cp`/restart | fixed — `printenv` مقدار را دارد، health ok |
| 0914 | بازیابی رمز عبور با OTP: دو تلهٔ کلاینت | 390 | both | (۱) دکمهٔ دوبارهٔ «دریافت کد» → سرور ۴۲۹ می‌داد ولی فرم همان‌جا قفل می‌ماند و کاربر باید پیامک تازه (هزینه) می‌گرفت؛ (۲) رفرش صفحه، کد معتبرِ دریافتی را بی‌اثر می‌کرد | سناریوی واقعی کاربر (کد دریافتی + `ابتدا کد تایید را دریافت کنید`) | `otpSent` فقط با پاسخ ۲۰۰ ست می‌شد و در حافظهٔ کامپوننت می‌ماند | ۴۲۹ = «کد زنده داری» → فرم باز + شمارش از پنجرهٔ باقی‌مانده؛ ذخیرهٔ پنجرهٔ ارسال در `sessionStorage` | fixed — ورود با رمز تغییر‌یافته روی prod موفق (تأیید کاربر) |

## SEO / Core Web Vitals round (0914) — Lighthouse on prod, fixes + before/after
روش: `npx lighthouse@12` روی prod (desktop `/` و mobile `/product/5588`, `/products`) — قبل/بعد با شرایط یکسان.
| 0914 | کنتراست AA: توکن‌های پرکاربرد متن | desktop+mobile | both | `--color-emphasis-text` (#e11d48 روی روشن = 4.28–4.48) و `--color-text-subtle-light` (#64748b روی #f3f7fa = 4.41) و `--color-cta` (همان #e11d48 به‌عنوان **متن**) هر سه زیر AA بودند | Lighthouse `color-contrast` با مقدار دقیق fg/bg | سه توکن پرکاربرد + برچسب‌های سبز `emerald-600` (#009966 = 3.21–3.36) + نوارد نشان لوگو `text-[#e11d48]` سخت‌کد + نشان accent روی پس‌زمینهٔ accent (1.6) | توکن‌ها → `#be123c`/`#475569`، `emerald-700/800`، لوگو → توکن، نشان‌ها → پرکردن توپر + متن سفید (۶.۴:۱) | fixed — **۰ گرهٔ کنتراست در هر سه صفحه** |
| 0914 | LCP در موبایل کشف‌ناپذیر بود | 390 | both | `requestDiscoverable=false` تصویر هیرو بعد از hydration ساخته می‌شد؛ preload اول اشتباه روی JPEG بود در حالی که `<picture>` **AVIF** می‌گیرد (دانلود دوباره) | `lcp-discovery-insight` + `curl` head | نبود preload در HTML اولیه | `productOgImageFor` → `{og, hero}`: `og` رستر (کرالرها SVG/AVIF نمی‌خوانند) و `hero` خواهر AVIF + `<link rel=preload as=image fetchpriority=high>` سرور-ساید | fixed — `lcp-discovery` از fail خارج شد؛ social card هم رستر ماند |
| 0914 | `bf-cache` غیرفعال | — | — | هدر HTML از nginx: `no-store` → bfcache هرگز فعال نمی‌شود | `curl -D` (دو هدر Cache-Control) + grep کانفیگ | `location /` در `/etc/nginx/sites-available/janebi-store:143` | `no-cache, must-revalidate` (بکاپ + `nginx -t` + reload) | fixed — `bf-cache` PASS |
| 0914 | a11y: نام‌نداشتن کنترل‌ها، ترتیب هدینگ، alt تکراری، ابعاد تصویر | — | — | دکمهٔ آیکونی نوار خرید موبایل بدون نام · h3 بدون h2 در PDP و لیستینگ · alt کارت = عنوان مجاور · تصاویر بدون width/height · placeholder نماد ایمیل با `animate-pulse` (شبه‌شفاف → 2.3) | Lighthouse (each audit) | — | `aria-label` (سبد/مرتب‌سازی)، h2 (PDP + `sr-only` گرید)، `alt=""`، پیش‌فرض 512×512 در `PictureImage`، حذف pulse | fixed |
| 0914 | نماد اعتماد enamad روی مسیر بحرانی | mobile | both | ۳۰۰ms پیش‌اتصال + خطای کنسول 408 (سرور بیرونی کند) روی LCP | `uses-rel-preconnect` + `errors-in-console` + `inspector-issues` (کوکی third-party) | — | `loading="lazy"` (بیرون فولد) + fallback لوکال موجود | mitigated (خطا/کوکی مربوط به دامنهٔ بیرونی است، نه باگ ما) |
| 0914 | **IndexNow فعال شد** | — | — | بنگ/یاندکس بدون حساب کاربری فوری مطلع می‌شوند؛ گوگل IndexNow را نمی‌خواند | — | — | `scripts/indexnow.mjs` + `public/c276fa18a698331a170b989421aab2f6.txt` + پینگ در آخر `deploy.sh` | verified — `indexnow -> 200 OK` (۱۹۲ URL) |
| 0914 | `lastmod` سایتمپ برای همه دروغ بود | — | — | هر ۱۳۸ URL محصول + همهٔ دسته‌بندی‌ها در هر درخواست `lastmod = امروز` می‌گرفتند (DB هیچ `created_at/updated_at` برای محصول ندارد) → گوگل `lastmod` غیردقیق را کل سایتمپ دور می‌ریزد | `curl sitemap.xml` + `pragma table_info(products)` | کد `sitemap.ts` مقادیر `today` را روی dynamic می‌نوشت | حذف `lastmod` از محصول/دسته (changefreq/priority باقی)، پایهٔ استاتیک و بلاگ دست‌نخورده | fixed — ۱۹۲ URL / **۳۴ lastmod** (بود ۱۹۲)، سفارش محصول بدون lastmod |
| 0914 | دو هاست یکسان (`www` و apex) | — | — | `www.janebiarena.ir` با ۲۰۰ سرو می‌شد (canonical درست بود ولی سیگنال صریح نبود) | `curl -I www` (۲۰۰) | `server_name` بلوک ۴۴۳ شامل www بود | گواهی SAN شامل www ✓ → بلوک ۴۴۳ جدا با `return 301 https://janebiarena.ir$request_uri` + ریدایرکت http:80 مستقیم به apex | fixed — `www → 301 apex` (هم http هم https)، apex/PDP ۲۰۰ |
| 0914 | **نتیجهٔ نهایی (prod)** | — | — | — | Lighthouse: desktop `/` = **100/100/100/100** (بود 99/94/100/100) · mobile PDP = **94/100/100/100** (بود 93/87/93/100) · mobile `/products` = 93/94/96/100 · CLS 0–0.002 · SEO 100 در همه | — | — | verified |

## Real-account E2E on prod (0913, aidin) — COD order + receipt-SMS gap
| 0914 | **پرداخت آنلاین واقعی با پول واقعی** (حساب aidin، درگاه زرین‌پال) | 1280 | light | — | سفارش `ORD-MU12NSRC-QQVT`: ۲×۶۵٬۰۰۰ + ۵۰٬۰۰۰ پیشتاز = **۱۸۰٬۰۰۰**؛ `status=processing` + «در حال پردازش (پرداخت موفق)»؛ `authority=A000000000000000000000000000zr75nm15`؛ **`refId=92062116101`**؛ موجودی کالا ۱۵۰→**۱۴۸** (اتمیک، دقیقاً به تعداد سفارش)؛ `vip_points_earned=1`؛ verify → `302 /checkout/callback?status=success` | لاگ کانتینر + ردیف DB | — | — | verified |
| 0914 | درگاهِ انتخابی: زرین‌پال (primary) | — | — | تردید: referer برگشت `sep.shaparak.ir` (صفحه بانک سامان) | لاگ `[Payment Router] Attempting payment request with zarinpal for order ORD-MU12NSRC-QQVT` — زرین‌پال درخواست را داد و صفحهٔ بانک سامان صفحهٔ پرداخت را نشان داد (مسیر عادی PSP→بانک) | — | — | wontfix (رفتار درست) |
| 0914 | برچسب روش پرداخت در DB سخت‌کد `زرین‌پال` بود (`server/routes/orders.ts:217`) | — | — | اگر circuit breaker زرین‌پال را باز می‌کرد و **سامان** پرداخت را انجام می‌داد، برچسب ذخیره‌شده اشتباه می‌شد (روی `ORD-MU12NSRC-QQVT` هم برگشت از `sep.shaparak.ir` بود) | خواندن کد | `paymentMethod === "online" ? "پرداخت آنلاین زرین‌پال"` در زمان ساخت سفارش، پیش از انتخاب درگاه | ساخت با برچسب بی‌طرف «پرداخت آنلاین»؛ `markOrderPaid()` برچسب را از provider تأییدکننده (`verifyResult.provider`) در همان تراکنش نهایی می‌کند؛ تست API آن را قفل می‌کند | **fixed + deployed `7b07c2f`** |
| 0914 | حذف خرید تستی از prod (`ORD-MU12NSRC-QQVT`) | — | — | سفارش پرداخت‌شدهٔ تستی نباید در آمار/تاریخ بماند | — | — | بکاپ `data/janebi-pre-testorder-purge.db` → تراکنش: موجودی ۱۴۸→**۱۵۰** (۲ عدد)، کسر ۱ امتیاز کسب‌شده (۹۹۶→۹۹۵)، حذف order_items و سفارش | verified — orders ۳→۲، orphan items ۰، `integrity_check ok`؛ e2e-prod ۸/۸ |


| 0913 | `/checkout` hard-load as a guest | 1280 | light | suspicion: صفحهٔ سفید (بدون گیت ورود) | DOM پس از hydration: EmptyState «سبد خرید شما خالی است! … مشاهده محصولات» | خواندن میان‌هیدریشن، نه باگ رندر | — | wontfix |
| 0913 | ثبت سفارش واقعی COD با حساب aidin | 1280 | light | — | `ORD-MU06VMVR-8MB7`: ۴×۶۵٬۰۰۰ + ۵۰٬۰۰۰ = ۳۱۰٬۰۰۰، `status=processing`، `paymentMethod=پرداخت در محل`، موجودی ۱۵۰→۱۴۶؛ سپس لغو از حساب → `cancelled` و موجودی ۱۵۰ (UI + DB) | — | — | fixed (verified) |
| 0913 | پیامک رسید سفارش به خریدار | — | — | **هیچ پیامکی برای مشتری ارسال نمی‌شد** — کل سیم‌کشی SMS فقط در مسیر OTP بود | prod: `docker logs` فاقد هر رکورد SMS + grep: `sendSms` تنها در `server/routes/auth.ts` | نبود فیچر (نه باگ) | `server/services/sms.ts` + listener روی `order:paid` (template verify یا line bulk، اعداد فارسی، بی‌صدا در نبود کانفیگ) — ۵ تست، gate سبز، دیپلوی `0917fa7` | fixed (ارسال واقعی نیازمند `SMS_ORDER_TEMPLATE_ID` یا `SMS_LINE_NUMBER`) |

نکتهٔ ابزار: پروفایل واقعی مرورگر روی این مک کار نمی‌کند (مرورگر پیش‌فرض Chromium نیست) → `browser.use_real_profile=false` و سشن مالک با JWT کوتاه‌عمر (۱۰–۲۵ دقیقه، فقط روی VPS امضا) برای E2E استفاده شد؛ رمز عبور نه خوانده شد نه ذخیره.

## Next rotations (standing goal)
- همهٔ ردیف‌های open لاگ بسته شده‌اند (0913). چرخش بعدی: hand-audit دوره‌ای روی سطوح کشف‌نشده + تثبیت پروب‌های چرخش C/F به‌عنوان رگرسیون روزانه (در صورت خواست کاربر).
- باقی‌ماندهٔ متن‌باز: خرید واقعی E2E روی prod با حساب واقعی (نیازمند تأیید کاربر).

## VIP banner dark-mode CTA/input fix (0914, live b195bc4)
| مسیر | موتور/تم | یافته | ریشه | فیکس | اثبات |
|------|----------|-------|------|------|-------|
| / (بنر VIP) | هر دو | دارک: CTA «دریافت هدیه» `dark:bg-cta` کریمزن روی گرادیان کریمزن (1.34:1) + اینپوت سفید خالص (خیرگی، تضاد وارونه — اینپوت پرکنتراست‌تر از CTA) | بنر theme-fixed کریمزن است ولی کنترل‌ها theme-variant بودند | کنترل‌ها theme-invariant علیه کریمزن: CTA `zinc-950/90` + `border-white/40` + آیکون `yellow-300`؛ اینپوت `black/25` + متن سفید + placeholder `white/70` | پیکسل-پروب :3978 و prod: boundary 3.5–3.6:1 (WCAG 1.4.11)، متن 18.8:1، placeholder ~4.3:1؛ design-audit 8/8؛ verify 424 green؛ باندل سرو‌شده `index-BtUGUDHg.js` sha256==محلی |

## آیکن‌های تماتیک دسته‌بندی‌ها (0914, live 1c57be1)
| مسیر | یافته | فیکس | اثبات |
|------|-------|------|-------|
| / (دسته‌بندی‌های تخصصی) + HeaderSearch (دسته‌های پرطرفدار) | آیکن چند دسته با موضوع هم‌خوان نبود: خودرو→Sparkles، هولدر→Navigation (پین نقشه)، دانگل→Radio، مبدل→RefreshCw، هدفون→Headphones، شارژر→Zap خالی | lib مشترک `src/lib/categoryIcons.ts` (تک منبع حقیقت + ترتیب match خاص قبل عمومی): خودرو→Car، هولدر→MonitorSmartphone، دانگل→Usb، مبدل→ArrowRightLeft، هدفون/هدست→Headset، شارژر→PlugZap؛ حذف دو map موازی در Home/HeaderSearch | پروب prod: ۲۰ دسته همگی آیکن تماتیک (`cats-prod-check-0914.mjs`)؛ ۲۱ تست unit؛ verify 424+21 green؛ design-audit 8/8؛ دیپلوی + vendor-react سرو‌شده شامل آیکن‌های جدید |

## ادغام دسته‌های تکراری (0914, live — user-flagged «آیتم‌های تکراری»)
| مسیر | یافته | ریشه | فیکس | اثبات |
|------|-------|------|------|-------|
| / + /products (سایدبار فیلترها) | ۷ دسته تکراری/یتییم: شارژر(۳) قاب و کاور(۲) گلس(۲) هندزفری(۲) هولدر و پایه(۱) کابل(۱) محافظ کابل(۱) — هرکدام زیرمجموعه دقیق دسته مرکب مصوب | seed اولیه دو دسته هم‌مفهوم ساخته بود (تکی + مرکب) | ادغام در دسته مرکب مصوب (۱۲ کالا، zero rename/new-cat): `scripts/merge-dup-categories.cjs` idempotent — اجرا روی prod DB داخل کانتینر + لینوکس محلی | API prod: 20→13 دسته، شمارش‌ها جمع درست (قاب 10، گلس 10، کابل 10، شارژر 11، هندزفری 18، هولدر 9)؛ سایدبار + دایره‌های Home همگی ۱۳ تمیز؛ دسته‌های یتییم از UI حذف شدند |

## اصلاح بخش برند (0914, live 9a456de — user: «بخش برند اصلاح بشه»)
| مسیر | یافته | فیکس | اثبات |
|------|-------|------|-------|
| /brands + /products فیلتر برند | ۱) برند دوزبانه تکراری: Anker/انکر، Apple/اپل، Samsung/سامسونگ، Baseus/بیسوس، Xiaomi/شیائومی → ۲ ردیف فیلتر و ۲ کارت مجزا ۲) ۳۳ برند بدون کاور (تایل خاکستری متنی) و بدون بج شمارش ۳) تیتر «آلکاتل (آلکاتل)» دوبل | ادغام ۱۲ کالا به نام فارسی (canonical، seed faName) با `scripts/merge-dup-brands.cjs` idempotent؛ `/api/brands` حالا cover واقعی (MIN(product.image)) برای هر برند بدون meta برمی‌گرداند؛ تیتر پارانتز فقط وقتی faName≠name؛ onError کاور → fallback لوگوی برند | API prod: ۳۹→۳۴ برند، ۳۳/۳۳ با کاور، فیلتر سامسونگ=9 کالا؛ vision /brands لایو: «real hardware photo covers present across all visible cards، badge on every card، no duplicate parens»؛ verify EXIT=0 |
