# گزارش خوشه طراحی + سئو — محصولات مشابه (RelatedProducts) — 2026-09-04

## انتخاب
از سه گزینه پیشنهادی:
- (b) آرشیو پیام‌های تماس §3.12 — قبلاً اجرا و تأیید شده (commit adbcdc9، سشن s312) — رد شد.
- (a) کانتراست فیلتر/مرتب‌سازی محصولات — r4/5 آن در commit 6d50ba7/0bf6ba6 ارسال شده — رد شد.
- **(c) پیوندسازی داخلی + داده ساختاریافته: بخش «محصولات مشابه» در صفحه محصول + ItemList JSON-LD** — انتخاب شد (بالاترین دیده‌شدن: UI/UX + SEO توأمان، هم‌راستا با کارهای JSON-LD قبلی FAQPage/BlogPosting/BreadcrumbList).

## پیاده‌سازی
- `src/components/RelatedProducts.tsx` (جدید):
  - واکشی واقعی از `/api/products?category=<cat>&limit=8`، حذف محصول جاری، نمایش ۴ کارت با `ProductCard` موجود.
  - تزریق `ItemList` JSON-LD فقط از داده واقعی API (url/product name) — صفر داده ساختگی؛ در نبود محصول مشابه، هیچ چیز رندر نمی‌شود.
  - فارسی اصیل: «محصولات مشابه در دسته‌بندی …»، شمارنده با اعداد فارسی، آیکون Lucide `Layers`، escape `<>`& در JSON-LD (هم‌الگوی Product schema موجود).
  - پاک‌سازی اسکریپت JSON-LD هنگام unmount/تغییر محصول.
- `src/pages/ProductDetail.tsx`: import و رندر بخش بالای RecentlyViewed.

## گیت کیفیت
- `npm run verify`: ✅ همه گیت‌ها پاس (tsc سخت‌گیر + ۴۴ سوییته تست + build).
- ممیزی آرتیفکت: `jsxDEV=0`، `/Users/`=0، رشته «محصولات مشابه» در chunk محصول حاضر (`ProductDetail-9RtOT7Bb.js`).

## دیپلوی و بررسی زنده (https://janebiarena.ir)
- commit `bb792d9` روی origin؛ `./deploy.sh` موفق؛ health: `{"status":"ok","database":"ok"}`.
- باندل زنده `assets/index-DbkyNQN3.js` == باندل محلی dist.
- chunk زنده `ProductDetail-9RtOT7Bb.js` حاوی «محصولات مشابه» (grep=1).
- API زنده: ۱۴ محصول واقعی؛ بیشترین دسته «شارژر» با ۳ کالا → برای آن دسته‌ها بخش با ۲ کالای مشابه رندر می‌شود. برای محصول id=14 (تک‌کالای دسته خودش) بخش آگاهانه خالی می‌ماند — رفتار درست و بدون داده ساختگی.
