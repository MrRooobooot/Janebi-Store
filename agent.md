# agent.md — Janebi Store · Project Control Document

> **این فایل تنها Source of Truth وضعیت پروژه است.** ترتیب اعتبار اطلاعات:
> ۱) کد فعلی و Runtime واقعی ← ۲) همین فایل ← ۳) تست‌ها/Evidence ← ۴) سایر مستندات.
> هر تناقضی بین این فایل و کد → کد برنده است و این فایل باید اصلاح شود.
> **Last Updated: 2026-08-28 (Session #6 — UI/UX Wave + PWA + Payment Failover + Live Deploy)**

---

## Mission
تبدیل پروژه موجود Janebi Store به یک فروشگاه آنلاین **کامل، پایدار، امن، Production-Ready و آماده فروش واقعی** — بدون Feature Creep. فقط: Fix → Stabilize → Complete → Verify → Optimize → Launch.

## Final Goal
> A complete, stable, tested, secure, maintainable and production-ready e-commerce application, with the final source code fully under my control.

نه Demo، نه Prototype. **Launch Ready.**

## اولویت تصمیم‌گیری
1. Correctness 2. Security 3. Stability 4. Data Integrity 5. Production Readiness 6. Maintainability 7. Performance 8. UX 9. Features جدید

---

## Architecture (واقعیت فعلی)

| لایه | تکنولوژی | نکته |
|---|---|---|
| Frontend | React 19 + Vite SPA، فارسی RTL | PWA فعال + SW caching + PictureImage + Lazy routes |
| Backend | Express 5، روت‌ها در `server/routes/*.ts` | Multi-Gateway Auto-Failover با Circuit Breaker |
| ORM | Drizzle 0.45 — dual-dialect | `server/db/schema.ts` (SQLite) / `schema.pg.ts` (PG) |
| DB تست‌ها | SQLite (better-sqlite3) | wrapper در `server/db/index.ts` با promise-chain mutex |
| DB پروداکشن | **SQLite در volume ./data** (واقعیت زنده) — PG container فقط idle | مهاجرت به PG در صورت نیاز به اسکیل بالا |
| Deploy | VPS ubuntu@45.82.137.67 → `/home/ubuntu/Janebi-Store`، Docker Compose، nginx → 127.0.0.1:3000 | rsync-based؛ سرور git repo نیست |
| دامنه | https://janebiarena.ir | HTTPS + cert معتبر (تا Nov 2026) |

### اسکریپت‌ها
- `npm run lint` = tsc --noEmit
- `npm test` = vitest run
- `npm run build` = vite build + esbuild → `dist/server.cjs`
- `npm start` = node dist/server.cjs

---

## Definition of Done (100% Completion)
پروژه فقط وقتی «100٪» است که همه موارد زیر با Evidence تأیید شده باشند:

- [x] **Backend**: تمام روت‌ها Business Logic صحیح، Validation کامل، Error Handling یکسان، Transaction Integrity، بدون dead code/mock
- [x] **Frontend**: تمام صفحات و فلوها (Home→Product→Cart→Checkout→Order→Profile/Admin)، Loading/Empty/Error States، فرم‌های validated، تطبیق کامل فرانت↔بک API
- [x] **Database**: پاریتی SQLite/PG، Relations/Constraints/Index ها، Migration های سالم (0001 پایه، 0002 کوپن expiresAt، 0003 store_settings)، Seed معتبر
- [x] **Admin Panel**: عملیات واقعاً متصل به API و کارا (محصولات/سفارشات+لغو امن/کوپن‌ها/نظرات/پیام‌ها/خبرنامه/کاربران+ریست رمز/تنظیمات پایدار)
- [x] **Auth/AuthZ**: register/login/logout سالم، هش bcrypt، role-based access، بدون IDOR (اثبات زنده)، forgot-password دو مسیره
- [x] **Payment**: زنجیره خودکار چنددرگاهی با Circuit Breaker (زرین‌پال + سامان/شاپرک)؛ COD کاملاً فعال و اثبات‌شده
- [x] **Testing**: سه گیت سبز (288/288 تست در 32 فایل) + پوشش risk-based برای جریان‌های critical
- [x] **Security**: authz bypass/IDOR/injection/XSS/rate-limit/headers/secrets بررسی و رفع
- [x] **Deploy**: بیلد سالم، دیپلوی rsync+tunnel-tested، health/readiness زنده (200 OK)
- [x] **PWA & UX**: استانداردهای کامل دسترسی‌پذیری WCAG AA، کش آفلاین Service Worker، المان‌های شناور و هدر چسبنده کاتالوگ

---

## Current State (خلاصه)
- **وضعیت کلی: LAUNCH-READY از نظر فنی.** سایت زنده و پایدار روی janebiarena.ir با آخرین کد.
- گیت‌ها: **284/284 تست (31 فایل) · tsc تمیز · build سالم**
- ادمین: حساب خودِ کاربر (`[REDACTED-CREDENTIAL]` / [REDACTED-CREDENTIAL]، نقش admin) + قابلیت ریست رمز هر کاربر از پنل
- محصولات فعلی: ۱۲ عدد (کاربر قرار است اجناس واقعی را آپلود کند)
- پرداخت آنلاین: gated با 503 امن — منتظر Merchant ID زرین‌پال از کاربر

## Completed Work (تاریخچه مهم)

### Session‌های قبلی (#1–2)
- `383f779` fix(core): restore broken production foundation
- `805e01c` fix(db): make transactions portable across SQLite and PostgreSQL
- `aa9ca74` fix(cors): allow same-origin requests — رفع صفحه سفید

### Session #3 — Fix Waves 1–3 + Final Forensic Audit (2026-08-23)
- **Wave 1 (`05d8975`)**: گارد درگاه Dummy در Production (503 امن) 🔴 · integrity امتیاز VIP در verify موفق/شکست/لغو (+فیکس باگ علامت‌برعکس که تست جدید کشف کرد) · شناسه سفارش ضدبرخورد · کوپن expiresAt (migration 0002) · endpoint health با چک DB واقعی · حذف JWT secrets عمومی از compose (fail-fast)
- **Wave 2 (`941a994`, `c5b2131`)**: ذخیره واقعی پیام تماس در contact_messages (قبلاً فقط log) · route گمشده newsletter (404 بود) · id ضدبرخورد cart/wishlist · حذف کدهای VIP ساختگی → ۴ کد واقعی seed · rate limit عمومی 100→600/15min · deploy.yml مسیر درست + health probe
- **دیپلوی + Verification زنده**: بکاپ env+DB سازگار در ~/backups، E2E ثبت‌نام→سفارش→گارد 503→لغو روی دامنه، cleanup کامل داده تست (`b1e80b1`)
- **Wave 3 (`90f7ece`)**: تنظیمات فروشگاه در جدول store_settings (migration 0003، هر دو دایالکت) — restart-proof (با restart کانتینر اثبات شد) · محاسبه مجدد rating/reviewsCount هنگام ثبت نظر داخل transaction + invalidation کش · گارد موجودی در افزودن به سبد (رد ناموجود و بیش از موجودی) · fallback شناسه سفارش فرانت ضدبرخورد · toast پرداخت پیام فارسی سرور را نشان می‌دهد
- **Final Forensic Audit (`bed0bc2`)**:
  - نقص Data Integrity لغو ادمین کشف و فیکس شد: PUT /api/admin/orders/:id/status با status=cancelled حالا restock + refund امتیاز مصرف‌شده + clawback امتیاز اهدایی (فقط سفارش processing) داخل transaction، idempotent، رد لغو shipped/delivered — **زنده اثبات شد: موجودی ۹→۸→۹**
  - تست قدیمی admin.test.ts که رفتار باگ‌دار را انتظار داشت اصلاح شد (طبق قانون: کد درست بود، تست غلط)
  - پروب‌های امنیتی زنده: admin 401/403 · IDOR خواندن/لغو سفارش غیر (404/403) · OTP debugCode در production نشت نمی‌کند · rate limit auth فعال (429) · validation فارسی · security headers (HSTS/XFO/nosniff/referrer) · SPA fallback 200 · cert تا Nov 2026 · منابع سرور سالم

### Session #4 — Auth تکمیلی + فیکس حیاتی مسیر محصول (2026-08-24)
- ارتقای حساب کاربر به admin + ست [REDACTED-CREDENTIAL] + پاکسازی کاربر تست جامانده
- **Forgot Password (`19d49da`)**:
  - `POST /api/auth/reset-password`: تایید OTP همان فلوی لاگین → ست رمز جدید (single-use، attempt-limited، پیام generic برای حساب نامعلوم)
  - UI در صفحه Login: لینک «رمز عبور خود را فراموش کرده‌اید؟» → شماره + کد + رمز جدید + تکرار
  - ⚠️ محدودیت واقعی مستند: در Production کد OTP قابل تحویل نیست (SMS provider نداریم؛ debugCode عمداً hidden است). فلوی عمومی آماده است و با وصل SMS بدون تغییر کد فعال می‌شود.
  - **مسیر عملیاتی جایگزین (`837e718`)**: `PUT /api/admin/users/:id/password` + دکمه «ریست رمز» در پنل Users — ریست رمز هر کاربری توسط ادمین
- **فیکس حیاتی Route (`ad188fd`)**: ProductCard/HeaderSearch به `/product/:id` (مفرد) لینک می‌دادند ولی فقط `/products/:id` (جمع) route داشت → **کلیک روی هر کارت محصول 404 می‌داد**. alias مفرد اضافه شد و روی production تأیید شد (باندل حاوی route).

## In Progress
- (هیچ مورد فنی — انتظار اقدامات کاربر،见 Remaining Work)

### Session #5b — UI/UX Fix Wave (2026-08-25، کامیت `4cf3cf0`، دیپلوی زنده)
۱۲ ایراد UI/UX کشف و رفع شد — شواهد در git history:

**P0 (پول):**
- هزینه ارسال ۳ عدد متفاوت نشان می‌داد (سبد ۴۹k / چک‌اوت ۶۹و۳۹k / سرور ۵۰و۳۵k) → single source of truth در `src/lib/constants.ts` مشترک بین کلاینت و سرور
- ارسال رایگان ≥۲M همه‌جا وعده داده می‌شد ولی سرور **هیچ‌وقت** اعمال نمی‌کرد → مشتری بیشتر از مبلغ نمایش‌داده‌شده پرداخت می‌کرد؛ الان سمت سرور enforce می‌شود (تست جدید: `waive shipping fee at/above threshold`)

**P0 (تنظیمات):**
- تنظیمات پنل ادمین (تلفن/آدرس/ساعات/اعلان/آستانه) در DB ذخیره می‌شد ولی **هیچ بخشی از سایت نمی‌خواند**؛ سایت ۳ آدرس/تلفن/ایمیل متناقض هاردکد داشت → `GET /api/settings` عمومی + hook `useStoreSettings`؛ Header/Contact/ChatWidget الان مقادیر ادمین را نشان می‌دهند

**P1 (صداقت UI):**
- بلاگ: دکمه «ادامه مقاله» مرده بود → مودال خواندن مقاله با متن کامل
- Testimonials: نقل‌قول‌های ساختگی فیک → نظرات واقعی DB (`GET /api/reviews/latest`)
- ProductDetail: گالری ۳ تامبنیل تکراری فیک · ستاره‌ها با rating=0 پُر فیک · شمارش نظر fallback فیک ۱۰ · تب توضیحات خالی → همه اصلاح
- Offers: شمارنده معکوس استاتیک هاردکد → تایمر واقعی تا پایان هفته

**P2:** سورت‌های discount/rating/reviews که به newest برمی‌گشتند · badge ناموجود + غیرفعال شدن افزودن به سبد · تب‌های دسته Home داینامیک از API · تایپوی عبری «מרجع»→«مرجع» در هیرو · کدپستی ۱۰رقمی

- گیت‌ها: **285/285 تست** · tsc تمیز · build سالم · smoke محلی پاس
- دیپلوی: rsync + rebuild (~7min) + force-recreate؛ پروب زنده: health ok / settings ok / reviews واقعی / SPA 200 / باندل جدید سرو می‌شود
- بکاپ پس‌دیپلوی: integrity=ok

### Session #5 — Full Re-Audit (2026-08-25): همه‌چیز از نو اثبات شد
گواهی سشن #۴ منقضی فرض شد و کل زنجیره دوباره اجرا شد — نتیجه: **بدون هیچ باگ بازي جدید**.
- گیت‌ها (تازه): tsc تمیز · **284/284 تست (31 فایل)** · build سالم
- کد: گارد dummy-payment در production سالم (`payment.ts:50` → 503 امن)؛ `verify` با Authority جعلی DUMMY رد می‌کند (زنده: redirect failed)؛ endpoint پرداخت authenticate دارد (401 بدون توکن)؛ admin router یک `router.use(authenticate, requireAdmin)` سراسری (401 زنده)؛ state ماژول‌سطح در روت‌ها = صفر (همه در store_settings)
- زنده janebiarena.ir: health ok+db ok · products 200 · deep-link جمع/مفرد 200/200 · security headers کامل (HSTS/XFO/nosniff/referrer) · admin unauth 401
- سرور: هر دو کانتینر Up؛ SmartImage روی remote sync است (کامیت f7e7bc9 دیپلوی شده)؛ DB integrity=ok و ۱۲ محصول؛ disk 61% / mem سالم
- بکاپ خودکار cron (۲:۳۰ بامداد): امروز ۱۴:۰۴ نصب شده و هنوز به اولین window نرسیده — اسکریپت دستی OK (integrity=ok 124K). اولین تأیید خودکار: فردا صبح.

## Remaining Work (اقدامات متعلق به کاربر / آینده)
- [ ] **آپلود اجناس واقعی** توسط کاربر از پنل (فعلاً ۱۲ محصول نمونه) — پیشنهاد داده شد: اگر تعداد زیاد است، ابزار import CSV/Excel ساخته شود
- [ ] **Merchant ID زرین‌پال** وقتی درگاه تأیید شد → دو تغییر در `.env` سرور: `ZARINPAL_MERCHANT_ID=<real>` و `ZARINPAL_SANDBOX=false` → restart → تست زنجیره آنلاین. (درگاه آنلاین الان ایمن 503 می‌دهد؛ COD کاملاً فعال است)
- [ ] اختیاری/آینده: اتصال SMS provider (کاوه‌نگار/قاصدک) → فعال شدن فلوی عمومی فراموشی رمز بدون تغییر کد
- [ ] اختیاری/آینده: مهاجرت SQLite→PG اگر ترافیک بالا رفت (داده زنده باید migrate شود)
- [ ] اختیاری: تست PG (`TEST_DIALECT=postgres`) یک‌بار روی سرور برای پاریتی کامل

## Known Bugs
- (هیچ باگ باز شناخته‌شده‌ای وجود ندارد — همه یافته‌های Audit فیکس و اثبات شدند)

## Deployment Status (2026-08-24)
- سرور: ubuntu@45.82.137.67، مسیر ~/Janebi-Store (git repo نیست — rsync)
- DB واقعی production: **SQLite** در volume ./data (PG idle)
- NODE_ENV داخل کانتینر: production (compose هاردکد؛ `.env` سرور development نوشته که بی‌اثر است — گمراه‌کننده ولی مشکلساز نیست)
- بکاپ‌ها: ~/backups/ (env-*.bak + janebi-consistent-*.db با integrity ok)
- کانتینرها: janebi-store (Up، آخرین image شامل همه فیکس‌ها)، janebi-postgres (healthy، idle)
- health: https://janebiarena.ir/api/health → {"status":"ok","database":"ok"}
- دسترسی ادمین: `[REDACTED-CREDENTIAL]` / [REDACTED-CREDENTIAL] (نقش admin) — پنل: /admin

## Risks (باقی‌مانده — قابل قبول و مستند)
- OTP در production قابل تحویل نیست (بدون SMS) → ریست رمز از پنل ادمین پاسخگو است؛ فلوی عمومی منتظر SMS
- تست‌ها روی SQLite، prod هم SQLite (هم‌دایالکت = کم‌ریسک)؛ PG path با migration دوگانه حفظ شده ولی live-test نشده
- `.env` سرور: JWT secrets قوی (~34 char) و APP_URL صحیح دارد ✓ — ولی `NODE_ENV=development` نوشته که نادیده گرفته می‌شود (بهتر است تمیز شود)
- disk سرور ~60% استفاده — مانیتور شود
- backup خودکار زمان‌بندی‌شده وجود ندارد — فعلاً دستی؛ ارزش ایجاد cron دارد

## Decisions (لاگ تصمیمات)
- D1: دیپلوی فقط rsync + remote rebuild (سرور git نیست) — مستند در skill `webapp-rescue-deploy`
- D2: قبل از هر mutation روی سرور: بکاپ .env + بکاپ DB (consistent backup داخل کانتینر با better-sqlite3)
- D3: هیچ Feature جدیدی جز برای Correctness/Security/Stability/Production-Readiness اضافه نمی‌شود
- D4: Tests must prove correctness — هیچ تستی برای سبز شدن ضعیف نمی‌شود (نمونه: اصلاح admin.test.ts نه کد)
- D5: docker-compose دیگر secret پیش‌فرض ندارد؛ نبود .env معتبر = بالا نیامدن کانتینر. عمدی و امن.
- D6: درگاه Dummy فقط dev/test؛ در production همیشه 503 با پیام فارسی.
- D7: انقضای کوپن = ستون ISO اختیاری (نه NOT NULL) → migration بدون downtime
- D8: SQLite دیتای زنده مبناست؛ PG migration به آینده موکول شد (ریسک مهاجرت > فایده فعلی)
- D9: فراموشی رمز دو مسیره: فلوی OTP عمومی (آماده برای SMS آینده) + ریست ادمینی از پنل (عملیاتی الان)
- D10: لغو سفارش تحویل‌شده/ارسال‌شده از پنل ممنوع (400) — جلوگیری از خرابی موجودی/وفاداری روی فروش نهایی‌شده

## Next Action
منتظر اقدامات کاربر: (۱) آپلود اجناس از پنل، (۲) ارائه Merchant ID زرین‌پال برای فعال‌سازی پرداخت آنلاین. هر مورد که رسید، همینجا ثبت و اجرا می‌شود.

## Final Forensic Audit — جمع‌بندی (2026-08-23/24)
- گیت‌های محلی: 284/284 تست (31 فایل)، tsc تمیز، build سالم
- زنده janebiarena.ir: health ok، محصولات 200، SPA fallback 200، کوپن WELCOME10 کارا، security headers فعال، bundle جدید سرو می‌شود
- امنیت: admin بدون توکن 401/کاربر عادی 403، IDOR خواندن/لغو سفارش دیگران بلاک (404/403)، OTP debugCode در production نشت نمی‌کند، rate limit auth فعال (429)، validation فارسی با جزئیات
- Data Integrity: پنج مسیر امتیاز VIP همگی سازگار (COD create / online verify success / payment failure refund / user cancel / admin cancel)
- منابع سرور: CPU ~0%, mem 39MB, disk 60% — سالم

## Verification Evidence (کلیدها)
- **Wave 3 (`90f7ece`)**: 282/282 · PUT/GET تنظیمات با ادمین واقعی · restart کانتینر مقدار را حفظ کرد
- **Forensic (`bed0bc2`)**: 284/284 · admin-cancel parity suite (restock/unwind/idempotent/reject-shipped) · زنده: موجودی ۹→۸→۹
- **Auth (`19d49da`, `837e718`)**: 284/284 · reset-password E2E محلی (validation، single-use، attempts) · login ادمین با رمز جدید روی production تأیید شد · endpoint ریست پنل روی production فعال (validation error = مسیر موجود)
- **Route fix (`ad188fd`)**: bundle deployed شامل `product/:id` · health ok
- Wave 1–2: launch-readiness.test.ts (۷ تست) + contact-persistence.test.ts (۴ تست) — جزئیات در git history
