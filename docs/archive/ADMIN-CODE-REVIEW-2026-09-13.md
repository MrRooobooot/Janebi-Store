# بازبینی کد پنل ادمین — ۱۴۰۵/۰۶/۲۲ (2026-09-13)

روش: بازبینی استاتیک `server/routes/admin.ts` (1024 خط، ۲۸ endpoint) + ۱۱ صفحهٔ `src/pages/admin/*` (4638 خط) + **اثبات تجربی روی sandbox `:3978`** (snapshot پرود با `better-sqlite3 .backup()`)، سپس فیکس + گیت + دیپلوی.

ابزار اثبات: `scripts/probes/proof-admin-bugs.sh`

---

## ۱) باگ‌های اثبات‌شده — فیکس و روی پرود (commit `b4ed0f8`)

### B1 — `DELETE /api/admin/reviews/:id` امتیاز محصول را بازمحاسبه نمی‌کرد (بحرانی)
- **اثبات:** دو نظر ۵★ و ۱★ تأیید شد → `rating=3.0 / reviewsCount=2`؛ سپس حذف نظر ۱★ → **همان 3.0 / 2 ماند** (درست: `5.0 / 1`).
- **اثر:** ویترین (PDP + JSON-LD `aggregateRating`) امتیاز نظری را نشان می‌داد که دیگر وجود ندارد = داده ساختگی → نقض قاعدهٔ zero-fabricated-data.
- **ریشه:** مسیر `PUT /reviews/:id/approved` بازمحاسبه + invalidate کش را داشت؛ مسیر `DELETE` نداشت.
- **فیکس:** بازمحاسبهٔ aggregate از نظرات تأییدشدهٔ باقی‌مانده + invalidate `reviews:<id>`/`product:<id>`/`product`/`reviews:latest` + `logAudit('review.delete')`.
- **بازآزمون:** حذف ۱★ → `5.0 / 1` ✅

### B2 — `DELETE /api/admin/products/:id` روی محصولِ سفارش‌شده کرش می‌کرد (بالا)
- **اثبات:** `DELETE` روی محصولی که در `order_items` است → **HTTP 500 `{"message":"FOREIGN KEY constraint failed"}`** (متن خطای SQL خام روی صورت ادمین) و محصول حذف نمی‌شد.
- **ریشه:** `order_items.product_id` یک FK `NOT NULL` بدون cascade است (`foreign_keys=1` روی پرود) و مسیر حذف، `order_items` را پاک نمی‌کرد (سابقهٔ سفارش باید بماند).
- **فیکس:** گارد پیش از تراکنش → `409` با پیام فارسی و کد `PRODUCT_IN_ORDERS` («برای خارج کردن از فروش، موجودی را صفر کنید») + حذف نشت `error.message` در `catch`.
- **بازآزمون:** `409` + پیام فارسی، محصول دست‌نخورده ✅ (کلاینت `data.error` را در توست نشان می‌دهد)

### B3 — `POST /api/admin/orders/bulk-delete` سفارش را بدون بازگردانی موجودی/امتیاز حذف می‌کرد (بالا)
- **اثبات:** سفارش `processing` با آیتم qty=2 → `bulk-delete` پاسخ `{"deleted":1}`، و **موجودی ۵۰ ماند** (درست: 52). `vipPointsUsed=3` هم برنگشت.
- **ریشه:** مسیر حذف فقط `order_items` + `orders` را پاک می‌کرد؛ `restockItemsAndRefundPoints` (مسیر cancel تکی) صدا زده نمی‌شد.
- **فیکس:** در همان تراکنش، برای سفارش‌های `pending_payment|processing` → restock + بازگشت امتیاز خرج‌شده + پس‌گرفتن امتیاز کسب‌شدهٔ COD با clamp (`vipPoints >= earned`)، سپس حذف؛ `logAudit('order.bulk_delete')`.
- **بازآزمون:** `50 → 52` ✅ و **برابری با مسیر cancel تکی** (هر دو ۵۲).

### B4 — پوشش Audit Log ناقص (متوسط)
- ۱۹ مسیر تغییردهنده در برابر ۱۲ `logAudit` → این‌ها لاگ نمی‌شدند: `users/:id/points`، `orders/:id/tracking`، `orders/bulk-delete`، `messages/read-all`، `messages/bulk-delete`، `newsletter/:email`، `reviews/:id` (moderate/delete).
- **فیکس:** ۸ فراخوان افزوده شد (`user.points.update`, `order.tracking.update`, `order.bulk_delete`, `message.read_all`, `message.bulk_delete`, `newsletter.delete`, `review.moderate`, `review.delete`).

**تست رگرسیون:** ۳ invariant جدید در `tests/api/admin-hardening.test.ts` (بازمحاسبهٔ امتیاز، گارد ۴۰۹، برابری restock). گیت: `npm run verify` → **409 passed / 5 skipped**؛ دیپلوی `b4ed0f8` + اثبات آرتیفکت سرو‌شده (`PRODUCT_IN_ORDERS`, `order.bulk_delete`, `review.delete` در `/app/dist/server.cjs`).

---

## ۲) یافته‌های بازبینی — فیکس‌شده (تأیید زندهٔ prod)

### R1 — محافظت حساب مالک — ✅ فیکس شد
- منبع شناسه از env: `OWNER_USER_ID` (بدون literal در کد کلاینت)؛ در `server/env.ts`، `.env.example` و فهرست merge در `deploy.sh` سیم‌کشی شد.
- گاردها: `PUT /users/:id/{role,password,points}` روی حساب مالک → **403 + `OWNER_PROTECTED`**؛ `GET /users` → cloaking مالک برای ادمین‌های غیرمالک.
- **اثبات زندهٔ prod** (`scripts/probes/verify-owner-protection.sh`، توکن کوتاه‌عمر درون‌کانتینری): ادمین غیرمالک `usr-admin-ali` → لیست ۷ کاربره **بدون** مالک و سه mutation → هر سه `403`؛ مالک خودش را می‌بیند (۸ کاربر)؛ حالت مالک دست‌نخورده (`role=admin`, `vip_points=995`).
- دیپلوی محیط: `OWNER_USER_ID` در VPS `.env` + **بازسازی کانتینر** (env_file فقط در creation اعمال می‌شود) → `docker exec janebi-store printenv OWNER_USER_ID` = `usr-admin-aidin`.

### R2 — صفحه‌بندی لیست‌های ادمین — ✅ فیکس شد
- `GET /admin/{users,reviews,coupons,newsletter,contact-messages}` پارامترهای `?page=&limit=` را می‌پذیرند (سقف ۵۰۰) و همیشه `X-Total-Count` برمی‌گردانند؛ فیلتر `status` پیام‌ها به SQL منتقل شد.
- **تصمیم طراحی:** بدون پارامتر → لیست کامل و بدون تغییر. کاپ پیش‌فرض «truncation خاموش» بود و دو سوئیت موجود را شکست؛ پنل ادمین نباید بی‌صدا بریده شود.
- اثبات زندهٔ prod: `GET /api/admin/users?page=1&limit=1` → `200` با `X-Total-Count: 8`.

### R3 — (یافتهٔ جدید، **فیکس‌شده و روی prod تأییدشده**) ترتیب لیست کاربران زمانی نبود
- `users.joined_date` روی prod متن نمایشی فارسی است (`۱۴۰۵/۶/۷`, `۱ فروردین ۱۴۰۵`) و `ORDER BY joined_date DESC` آن را **لفظی** مرتب می‌کند نه زمانی؛ در DB توسعه ترکیب ISO/فارسی/`NULL` دیده شد (۱۹۲۷ ردیف).
- پیشنهاد: افزودن `users.created_at` (migration + backfill از epoch داخل `id` برای `usr-<ms>`)، سپس مرتب‌سازی بر همان؛ تا آن زمان مرزهای صفحه‌بندی این لیست نادقیق است.

## ۲-ب) یافته‌های باز (بدون تغییر)

### R1 — هیچ محافظتی برای ادمین ارشد وجود ندارد (امنیت/RBAC)
- هر ادمین می‌تواند رمز ادمین دیگر (از جمله حساب مالک) را ریست کند، نقشش را عوض کند یا امتیازش را دست‌کاری کند؛ تنها گارد موجود «تغییر نقش حساب خود» است.
- `GET /api/admin/users` همهٔ ادمین‌ها را (بدون رمز ✅) برمی‌گرداند؛ هیچ cloaking برای مالک نیست. احتمالاً همین اشتباه قبلاً هم باعث بروز مشکل شده است.
- **پیشنهاد:** شناسهٔ مالک از env (`OWNER_USER_ID`)؛ مسیرهای password/role/points برای مالک → `403`؛ حذف مالک از لیست برای ادمین‌های دیگر.

### R2 — لیست‌های بدون صفحه‌بندی
- `GET /admin/users`, `/reviews`, `/coupons`, `/newsletter`, `/contact-messages` کل جدول را برمی‌گردانند (`/orders` صفحه‌بندی اختیاری دارد). در حجم فعلی بی‌خطر، در رشد مشکل‌ساز.

---

## ۳) بررسی‌های سالم (شاهد)
- `requireAdmin` روی تمام روتر (`router.use(authenticate, requireAdmin)`) + گیت `mustChangePassword` با کد اختصاصی.
- `GET /users` رمز را حذف می‌کند؛ `PUT /users/:id/role` هش رمز را echo نمی‌کند؛ ریست رمز `bumpTokenVersion` (ابطال refresh) دارد.
- مسیر cancel تکی سفارش: restock + بازگشت استفاده‌شده + پس‌گرفت با clamp ✅؛ `DELETE /products` cascade برای features/cart/wishlist/reviews ✅.
- تمام ۲۸ endpoint ادمین `validate(zod)` دارند (به‌جز GET/DELETE ساده) و کلاینت خطا را از `data.error`/`message` فارسی نشان می‌دهد.
- سمت کلاینت: صفر `catch {}` خاموش، صفر `dangerouslySetInnerHTML`، ۸ صفحه `window.confirm` قبل از عملیات مخرب، فقط ۵ `as any` (Products.tsx).
