# agent.md — Janebi Store · Project Control Document

> **این فایل تنها Source of Truth وضعیت پروژه است.** ترتیب اعتبار اطلاعات:
> ۱) کد فعلی و Runtime واقعی ← ۲) همین فایل ← ۳) تست‌ها/Evidence ← ۴) سایر مستندات.
> هر تناقضی بین این فایل و کد → کد برنده است و این فایل باید اصلاح شود.
> **Last Updated: 2026-08-23 (Session #3 — Fix Waves 1+2 completed & pushed)**

---

## Mission
تبدیل پروژه موجود Janebi Store به یک فروشگاه آنلاین **کامل، پایدار، امن، Production-Ready و Launch-Ready** — بدون Feature Creep. فقط: Fix → Stabilize → Complete → Verify → Optimize → Launch.

## Final Goal
> A complete, stable, tested, secure, maintainable and production-ready e-commerce application, with the final source code fully under my control.

نه Demo، نه Prototype. **Launch Ready.**

## اولویت تصمیم‌گیری
1. Correctness 2. Security 3. Stability 4. Data Integrity 5. Production Readiness 6. Maintainability 7. Performance 8. UX 9. Features جدید

---

## Architecture (واقعیت فعلی)

| لایه | تکنولوژی | نکته |
|---|---|---|
| Frontend | React 19 + Vite SPA، فارسی RTL | code-splitting + lazy routes فعال |
| Backend | Express 5، روت‌ها در `server/routes/*.ts` | envelope خطای یکسان با requestId |
| ORM | Drizzle 0.45 — dual-dialect | `server/db/schema.ts` (SQLite) / `schema.pg.ts` (PG) |
| DB تست‌ها | SQLite (better-sqlite3) | wrapper در `server/db/index.ts` با promise-chain mutex |
| DB پروداکشن | PostgreSQL (docker-compose) | container `janebi-postgres` |
| Deploy | VPS ubuntu@45.82.137.67 → `/home/ubuntu/Janebi-Store`، Docker Compose، nginx → 127.0.0.1:3000 | rsync-based؛ سرور git repo نیست |
| دامنه | https://janebiarena.ir | HTTPS فعال |

### اسکریپت‌ها
- `npm run lint` = tsc --noEmit
- `npm test` = vitest run
- `npm run build` = vite build + esbuild → `dist/server.cjs`
- `npm start` = node dist/server.cjs

---

## Definition of Done (100% Completion)
پروژه فقط وقتی «100٪» است که همه موارد زیر با Evidence تأیید شده باشند:

- [ ] **Backend**: تمام روت‌ها Business Logic صحیح، Validation کامل، Error Handling یکسان، Transaction Integrity، بدون dead code/mock
- [ ] **Frontend**: تمام صفحات و فلوها (Home→Product→Cart→Checkout→Order→Profile/Admin)، Loading/Empty/Error States، فرم‌های validated، تطبیق کامل فرانت↔بک API
- [ ] **Database**: پاریتی کامل SQLite/PG، Relations/Constraints/Index ها، Migration های سالم، Seed معتبر
- [ ] **Admin Panel**: عملیات واقعاً متصل به API و کارا
- [ ] **Auth/AuthZ**: register/login/logout/refresh سالم، هش پسورد، role-based access، بدون IDOR
- [ ] **Payment**: کل زنجیره Checkout→Initiate→Callback→Verify→State Update→Failure Handling اثبات‌شده
- [ ] **Testing**: سه گیت سبز + پوشش risk-based برای جریان‌های critical + تست روی PG واقعی (نه فقط SQLite)
- [ ] **Security**: authz bypass/IDOR/injection/XSS/CSRF/rate-limit/headers/secrets بررسی و رفع
- [ ] **Deploy**: بیلد سالم، اسموک production محلی پاس، دیپلوی هم‌راستا با واقعیت سرور، health/readiness
- [ ] **Final Forensic Audit**: بدون Blocker/Critical باز

## Current State (خلاصه)
- **سشن قبلی (#2)**: ۲۶۵/۲۶۵ تست سبز، lint/build سالم، دیپلوی موفق، سایت زنده بالا (باگ CORS صفحه سفید رفع شد — کامیت `aa9ca74`)، E2E سفارش/لغو روی دامنه واقعی پاس.
- **سشن فعلی (#3)**: Audit مستقیم (بدون ساب‌اجنت) انجام شد → Fix Wave 1 کامل شد. گیت‌ها: **272/272 تست، lint تمیز، build سالم**.

## Completed Work (تاریخچه مهم)
- `383f779` fix(core): restore broken production foundation
- `805e01c` fix(db): make transactions portable across SQLite and PostgreSQL (sync-API crash روی PG، sql`` خام، mutex سریالایز SQLite)
- `3f726d0` docs(env): document POSTGRES_PASSWORD and CORS_ORIGIN in .env.example
- `aa9ca74` fix(cors): allow same-origin requests — site JS assets returned 500 (APP_URL اشتباه + Origin خودِ سایت reject می‌شد)
- حذف روت‌های مرده OTP، مونت requestId middleware، اسکوپ catch-all به /api
- **Fix Wave 1 (commit `05d8975`)**:
  - 🔴 payment.ts: گارد Production برای درگاه Dummy — در NODE_ENV=production اگر merchant واقعی تنظیم نباشد، `/api/payment/request` با 503 رد می‌شود (قبلاً سفارش بدون پول واقعی «پرداخت‌شده» می‌شد)
  - 🟠 payment.ts: اعطای vipPointsEarned در مسیر verify موفق زرین‌پال واقعی (قبلاً فقط مسیر Dummy امتیاز می‌داد)
  - 🟠 payment.ts: بازگشت vipPointsUsed + صفر کردن آن هنگام شکست پرداخت (restockOrder)
  - 🟠 orders.ts: لغو سفارش حالا امتیاز مصرف‌شده را برمی‌گرداند (+used) و امتیاز اهدایی سفارش processing را پس می‌گیرد (−earned؛ فقط وقتی واقعاً credite شده)
  - 🐛 باگ علامت‌برعکس در refund: تست جدید `launch-readiness.test.ts` کشف کرد refund به‌جای + منفی بود → فیکس شد
  - 🟡 orders.ts: شناسه سفارش مقاوم به برخورد `ORD-<base36 ts>-<rand>` (قبلاً ۶ رقم تصادفی با خطر برخورد PK)
  - 🟡 کوپن: ستون `expiresAt` (هر دو دایالکت) + migration های `0002_coupon_expires_at.sql` + enforcement در validate و order-create
  - 🟢 app.ts: endpoint `GET /api/health` با چک واقعی DB (pool.query برای PG / prepare برای SQLite)
  - 🔴 docker-compose.yml: حذف JWT secrets و DATABASE_URL و POSTGRES_PASSWORD و APP_URL پیش‌فرض → `${VAR:?...}` fail-fast؛ literal `***` داخل DATABASE_URL پیش‌فرض هم حذف شد
- **Fix Wave 2 (کامیت `941a994` و `c5b2131` — push شده)**:
  - 🟠 contact.ts: فرم تماس حالا در جدول contact_messages ذخیره می‌شود (قبلاً فقط console.log — پیام‌ها هرگز به Admin Messages نمی‌رسیدند)
  - 🟠 contact.ts: route گمشده `POST /api/contact/newsletter` اضافه شد (فرانت footer به آن fetch می‌زد و 404 می‌گرفت)
  - 🟡 cart/wishlist: پسوند random به id ها (جلوگیری از PK collision در همان میلی‌ثانیه)
  - 🟡 VipClubTab: کدهای ساختگی VIP-GOLD50/JANEBI-FREE حذف و ۴ کد واقعی seed شده جایگزین شدند
  - 🟡 rate limit عمومی 100→600 req/15min (سقف قبلی یک session عادی خرید را قفل می‌کرد؛ auth limiter سخت‌تر دست‌نخورده)
  - 🟢 deploy.yml: مسیر غلط /var/www → ~/Janebi-Store + health check بعد از دیپلوی

## In Progress
- (هیچ — Wave 2 تمام شد)

## Remaining Work
- [x] Commit + push فیکس‌های Wave 1 و Wave 2 (تا `c5b2131`)
- [x] دیپلوی Production (rsync + remote rebuild) — 2026-08-23
- [x] Verification زنده: health لوکال+پابلیک ok، products 200، کوپن WELCOME10 کارا، E2E ثبت‌نام→سفارش→گارد پرداخت 503→لغو 200، پاکسازی داده تست
- [ ] **قبل از Launch واقعی**: ZARINPAL_MERCHANT_ID واقعی + ZARINPAL_SANDBOX=false در .env سرور (الان merchant=dummy → درگاه آنلاین 503 می‌دهد؛ COD سالم است)
- [ ] تصمیم admin settings persistence (در RAM است — restart به پیش‌فرض برمی‌گردد)
- [ ] Final Forensic Audit

## Known Bugs
- (همه موارد Wave 1+2 فیکس شدند)

## Deployment Status (2026-08-23)
- سرور: ubuntu@45.82.137.67، مسیر ~/Janebi-Store (git repo نیست — rsync)
- DB واقعی production: **SQLite** در volume ./data (PG فقط idle بالا است — مهاجرت به PG به آینده موکول شد چون دیتای زنده همانجاست)
- NODE_ENV داخل کانتینر: production (از compose هاردکد؛ .env سرور development نوشته که نادیده گرفته می‌شود — گمراه‌کننده ولی بی‌اثر)
- بکاپ‌ها: ~/backups/ (env + janebi-consistent-20260823.db با integrity ok)
- کانتینرها: janebi-store (Up, new image)، janebi-postgres (healthy)
- health: https://janebiarena.ir/api/health → {"status":"ok","database":"ok"}

## Risks
- تست‌ها روی SQLite، پروداکشن PG → پاریتی با migration دوگانه حفظ شد؛ تست PG اختیاری (`TEST_DIALECT=postgres`) باید یک‌بار روی سرور اجرا شود
- admin settings فقط در RAM است → بعد از restart کانتینر به پیش‌فرض برمی‌گردد (باید در DB persist شود یا صراحتاً accept شود)
- `.env` روی VPS باید JWT secrets قوی و APP_URL=https://janebiarena.ir داشته باشد وگرنه کانتینر با compose جدید بالا نمی‌آید (عمدی fail-fast است — قبل از دیپلوی بررسی شود)
- ZARINPAL_SANDBOX=true یعنی حتی با merchant واقعی، مسیر dummy فعال می‌شود (در production بلاک می‌شود ولی ترافیک واقعی پرداخت نمی‌گیرد) → قبل از Launch واقعی false شود

## Decisions (لاگ تصمیمات)
- D1: دیپلوی فقط rsync + remote rebuild (سرور git نیست) — مستند در skill `webapp-rescue-deploy`
- D2: قبل از هر mutation روی سرور: بکاپ .env + بکاپ DB (sqlite3.backup / pg_dump)
- D3: هیچ Feature جدیدی جز برای Correctness/Security/Stability/Production-Readiness اضافه نمی‌شود
- D4: Tests must prove correctness — هیچ تستی برای سبز شدن ضعیف نمی‌شود
- D5 (Wave 1): docker-compose دیگر secret پیش‌فرض ندارد؛ نبود .env معتبر = بالا نیامدن کانتینر. عمدی و امن.
- D6 (Wave 1): درگاه پرداخت Dummy فقط برای dev/test؛ در production همیشه 503 با پیام فارسی.
- D7 (Wave 1): انقضای کوپن به‌صورت ستون متنی ISO اختیاری اضافه شد (نه NOT NULL) تا migration بدون downtime روی دیتای موجود امن باشد.

## Next Action
Commit فیکس‌های Wave 1 → ادامه Audit (auth/users/cart routes + فرانت Checkout/Cart + admin persistence) → Wave 2 fixes → دیپلوی و Verification زنده.

> **به‌روزرسانی نهایی:** Final Forensic Audit کامل شد. نقص Data Integrity لغو ادمین (`bed0bc2`) فیکس، دیپلوی و **زنده روی production اثبات شد** (موجودی ۹→۸→۹ پس از سفارش+لغو ادمین). همه گیت‌ها: **284/284 تست + lint + build**. cleanup کامل. تنها مورد باز برای Launch واقعی: merchant زرین‌پال (نیازمند حساب کاربر).

## Final Forensic Audit — جمع‌بندی (2026-08-23)
- گیت‌های محلی: 284/284 تست (31 فایل)، tsc تمیز، build سالم
- زنده janebiarena.ir: health ok، محصولات 200، SPA fallback 200، کوپن واقعی کارا، security headers فعال
- امنیت: admin بدون توکن 401/کاربر عادی 403، IDOR خواندن/لغو سفارش دیگران بلاک (404/403)، OTP debugCode در production نشت نمی‌کند، rate limit auth فعال (429 بعد از چند تلاش)، validation فارسی با جزئیات
- Data Integrity: چهار مسیر امتیاز VIP (COD create / online verify success / payment failure refund / user cancel) همگی سازگار؛ مسیر پنجم (admin cancel) کشف و فیکس شد — حالا restock + unwind امتیاز + idempotent + رد لغو shipped/delivered
- تست قدیمی admin.test.ts که رفتار باگ‌دار (لغو کالای تحویل‌شده) را انتظار داشت اصلاح شد — نه تضعیف کد
- منابع سرور: CPU ~0%, mem 39MB, disk 60% — سالم

## Verification Evidence (Fix Waves 1+2)
- **Wave 3 (commit `90f7ece`)**: 282/282 تست، lint/build سبز. دیپلوی + زنده‌وری: جدول store_settings ساخته شد، PUT/GET تنظیمات با کاربر admin واقعی پاس شد، **restart کانتینر تنظیمات را حفظ کرد** (persistence اثبات). cleanup کامل.
- `npm test` → **Test Files 29 passed (29), Tests 276 passed (276)** (۷ تست launch-readiness + ۴ تست contact-persistence جدید)
- `npm run lint` → tsc --noEmit تمیز
- `npm run build` → vite + esbuild موفق
- تست `launch-readiness.test.ts`: کوپن منقضی (validate + order)، فرمت شناسه سفارش جدید، refund/clawback امتیاز در لغو، health endpoint، refund امتیاز در شکست پرداخت آنلاین
- تست `contact-persistence.test.ts`: ذخیره پیام تماس (status=unread)، رد فیلد ناقص، idempotent بودن خبرنامه، رد ایمیل نامعتبر
