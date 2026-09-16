# REAL-INVENTORY-0916 — ورود موجودی واقعی انبار (بخش هولدر) + جایگزینی کاتالوگ تستی

**تاریخ:** ۱۴۰۵/۰۶/۲۵ (2026-09-16) · **محیط:** prod (janebiarena.ir، SQLite درون کانتینر) · **راهبرد:** DB-only (بدون build/deploy)

## ۱) ورودی کاربر
لیست واقعی انبار — ۳۷ کد کالای برند **ارلدام (Earldom)** از خانوادهٔ `ET-EH*`، قیمت‌ها به «هزار تومان» (۸۷۵ هزار ⇒ ۸۷۵٬۰۰۰ تومان). دستور: «بخش هولدر هرچی هست رو پاک کن» + بارگذاری لیست.

## ۲) کاری که انجام شد

| گام | جزئیات | شاهد |
|-----|--------|------|
| بکاپ پیش از تغییر | `janebi-before-holder-import-20260916-082004.db` روی VPS (`/home/ubuntu/backups/`) | `ls` + حجم 610304 B |
| حذف پلیس‌هولدرها | ۹ کالای دستهٔ «هولدر و نگهدارنده» شامل `JB-5498..JB-5505` و `HLD-MAG-01` (باسئوس MagPro) | `deleted: 9, failedDel: []`؛ بکاپ ردیف‌ها `holder-backup-prod-20260916.json` |
| درج ۳۷ کالا | `POST /api/admin/products` با JWT ادمین کوتاه‌عمر (۳۰m) روی `OWNER_USER_ID` | `inserted: 37, failedIns: []`, `categoryAfter: 37`, `totalProducts: 166` |
| تطبیق قیمت | هر ۳۷ SKU با قیمت لیست کاربر، صفر اختلاف | مقایسهٔ برنامه‌ای prod API: `missing []`, `extra []`, `price_mismatch []` |
| عنوان‌های واقعی | ۲۵ از ۳۷ مدل با تطبیق **دقیق کد مدل** در فهرست دیجی‌کالا (شاهد: `earldom-verified-meta.json`) → عنوان فارسی واقعی؛ ۱۲ مدل بدون تطبیق ⇒ «نگهدارنده ارلدام مدل X» | ۱۱ عنوان در راند ۲ روی prod به‌روزرسانی شد (PUT 200×11) |
| عکس واقعی | ۲۵ مدل: دانلود عکس همان مدل، نرمال‌سازی به webp ≤200KB (600–1200px) در `public/images/products/ear-<code>.webp`، self-host | `images=25 skipped=0`؛ QA هیوریستیک (گوشهٔ سفید استودیویی، نسبت سوژه، ≥۵۰۰px) → `flags: []` |
| سینک دارایی | کپی در `dist/images/products/` و `public/images/products/` روی VPS (nginx root = `dist`) | `ls | wc -l = 25` در هر دو مسیر |
| اتصال عکس به کالا | `PUT /api/admin/products/:id {image}` | `ok: 25/25` (status 200) |
| ایندکس‌گذاری | `node scripts/indexnow.mjs` | `sitemap: 213 URLs` → `indexnow -> 200 OK` |

## ۳) اثبات زندهٔ prod
- `GET /api/products?limit=1000` ⇒ **۱۶۶** رکورد (۱۳۸ − ۹ + ۳۷)، دستهٔ هولدر **۳۷**، `brand = ارلدام`، `stockQuantity = 2`, صفر باقی‌ماندهٔ `JB-54xx`/`HLD-MAG-01`.
- ۲۵ آدرس عکس: `curl` هر فایل ⇒ **۲۰۰ × ۲۵**.
- PDP نمونه (`/products/5596` = `ET-EH344`): HTTP 200، price 875000، تصویر `ear-*.webp`.
- sitemap: همهٔ ۳۷ URL محصول جدید با `lastmod 2026-09-16`.
- پروب مرورگر (`scripts/probes/holder-import-0916.mjs`) روی prod، **Chromium + WebKit**: صفحهٔ دستهٔ «هولدر و نگهدارنده» ⇒ ۱۵ کارت با عکس واقعی `ear-*.webp`، `placeholderImgs: 0`، `broken: []`؛ تنها خطای کنسول = `408` تایل نماد اعتماد (خارجی/شناخته‌شده).

## ۴) مفروضات و ریسک‌های باز (شفاف)
1. **تعداد موجودی = ۲** برای هر ۳۷ قلم: تنها شاهد، ستون «تعداد» در سند کاربر است که فقط انتهای لیست به‌صورت «۲» آمده (و در پیش‌نمایش سند برای ۴ ردیف اول هم ۲ بود). اگر نادرست است، با یک PUT اصلاح می‌شود.
2. **حذف `HLD-MAG-01` (باسئوس MagPro)** طبق دستور «هرچی هست رو پاک کن». بازیابی: `holder-backup-prod-20260916.json` (+ بکاپ دیتابیس) — بازگردانی یک‌دستوری.
3. **۱۲ مدل بدون عکس واقعی**: `EH63, EH96, EH127, EH132, EH148, EH184, EH186, EH190, EH235, EH269, EH291, EH344` — برای این‌ها هیچ فهرست عمومی با تطبیق دقیق مدل پیدا نشد؛ فعلاً `placeholder-product.svg`. جایگزین: عکس انبار یا کاتالوگ رسمی برند.
4. **مشخصات فنی/توضیح کوتاه**: فیلد `features` خالی است (سند «جدول مشخصات» کاربر فقط قیمت+تعداد داشت و سند Google Docs خصوصی است — export بدون لاگین ۴۰۱). هیچ ویژگی‌ای ساخته نشد.
5. تأیید بصری حرفه‌ای (vision) انجام **نشد**: سرویس تصویر ۵۰۳ داد؛ به‌جای آن QA هیوریستیک پیکسلی اجرا شد. (تکرار vision در فرصت بعد.)

## ۵) مسیر بازتولید
```bash
# ورودی‌ها: .hermes/imports/{earldom-holders,holder-plan,title-update-0916,image-update-0916}.json
scp .hermes/imports/import-holders.cjs ubuntu@janebiarena.ir:/tmp/
ssh ubuntu@janebiarena.ir 'docker cp /tmp/import-holders.cjs janebi-store:/app/ && docker exec -w /app janebi-store node import-holders.cjs --apply'
```
نکتهٔ عملیاتی: اسکریپت باید داخل `/app` باشد (وگرنه `better-sqlite3` resolve نمی‌شود) و کپی دارایی‌ها باید **هم** در `dist/` (ریشهٔ nginx) و **هم** `public/` انجام شود.
