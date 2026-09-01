# گزارش خوشه طراحی + سئو — هدر دسته‌بندی‌محور کاتالوگ + متای داینامیک + CollectionPage JSON-LD — 2026-09-04b (راند ۳۰)

## انتخاب (چرخش بخش‌ها)
- بخش‌های قبلی (RelatedProducts/ItemList، FAQPage، BlogPosting، BreadcrumbList، checkout stepper) تکرار نشد.
- انتخاب جدید: **صفحه /products** — هدر آگاه به دسته‌بندی (UI/UX) + متای داینامیک `<head>` (title/description/og) + JSON-LD نوع `CollectionPage` (سئو/AEO).

## پیاده‌سازی
- `src/lib/catalogSeo.ts` (جدید):
  - `applyCatalogSeo()` / `restoreCatalogSeo()` — به‌روزرسانی `document.title`، `meta[name=description]`، `og:title`، `og:description` بر اساس دسته انتخابی؛ تزریق اسکریپت `CollectionPage` با `ItemList.numberOfItems` فقط از داده واقعی API (X-Total-Count)؛ escape `<>`&؛ پاک‌سازی در unmount و بازگشت به مقادیر ثابت index.html.
  - canonical URL با پارامتر دسته (`/products?category=...`) فقط برای حالت فیلترشده.
- `src/pages/Products.tsx`:
  - هدر صفحه در حالت دسته‌بندی فیلترشده: H1 = «خرید {دسته}» + بج «دسته‌بندی انتخاب‌شده» + شمارش واقعی محصولات با اعداد فارسی (`toPersianDigits`).
  - حالت «همه» بدون تغییر (هدر پیش‌فرض).
  - افکت فقط پس از پایان loading (متا همیشه از داده settled واقعی، نه حالت‌های گذرا).
- توکن‌های تم دوگانه حفظ شد (`text-zinc-900 dark:text-[#f7f8f8]` و مشابه)؛ هیچ داده ساختگی — شمارش از `X-Total-Count` هدر API واقعی.

## گیت کیفیت
- `npm run verify`: ✅ همه گیت‌ها (tsc سخت‌گیر + سوییته‌های Vitest + build) پاس.
- ممیزی آرتیفکت: `jsxDEV=0`، `/Users/`=0 در `dist/assets/index-wyT3KYhf.js`؛ ثابت «دسته‌بندی انتخاب‌شده» و «CollectionPage» در `dist/assets/Products-sZ1Rcj61.js` موجود.

## دیپلوی و بررسی زنده (https://janebiarena.ir)
- commit `c0c4a7b` روی origin؛ قفل دیپلوی آزاد؛ `./deploy.sh` موفق.
- health زنده: `{"status":"ok","database":"ok","latencyMs":2}`.
- باندل زنده `assets/index-wyT3KYhf.js` == باندل محلی dist؛ jsxDEV=0 و `/Users/`=0 روی باندل زنده.
- chunk زنده `assets/Products-sZ1Rcj61.js`: «دسته‌بندی انتخاب‌شده» grep=1، «CollectionPage» grep=1.

## گزارش
- TASKS.md به‌روزرسانی شد.
