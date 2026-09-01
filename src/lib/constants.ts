// Single source of truth for store-wide commerce constants.
// Imported by BOTH server and client — never duplicate these numbers elsewhere.

/** Orders at/above this subtotal ship free (server enforces; client displays). */
export const FREE_SHIPPING_THRESHOLD = 2_000_000; // Toman

/** Shipping fees in Toman. Server is authoritative — client must mirror exactly. */
export const SHIPPING_FEES = {
  express: 50_000, // پست پیشتاز
  standard: 35_000, // پست سفارشی
} as const;

export const MAX_CART_QUANTITY = 99;

/**
 * Contact messages with status 'read' older than this many days are archived
 * automatically by the contact-archive reaper (server/routes/contact.ts).
 * Admins can archive/unarchive manually via
 * PUT /api/admin/contact-messages/:id/status.
 */
export const ARCHIVE_AFTER_DAYS = 90;

/**
 * Canonical store settings defaults — SINGLE SOURCE OF TRUTH.
 * Imported by server/routes/settings.ts, server/routes/admin.ts (admin edit
 * allow-list) and src/hooks/useStoreSettings.ts (client fallback).
 * Values are the string form persisted in the `store_settings` key/value table;
 * `freeShippingThreshold` is parsed to a number at the API boundary.
 * Never duplicate these literals elsewhere.
 */
export const STORE_SETTINGS_DEFAULTS: Record<string, string> = {
  storeName: 'جانبی آرنا',
  phone: '۰۲۱-۸۸۸۸۹۹۹۹',
  email: 'info@janebi-arena.ir',
  supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
  address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
  freeShippingThreshold: '2000000',
  announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10',
  heroSlide1Title: 'هولدرهای مگنتی خودرو و پایه‌های رومیزی ضدلغزش',
  heroSlide1Subtitle: 'هولدرهای آهنربایی قدرتمند N52 سازگار با مگ‌سیف آیفون و انواع گوشی‌ها، مناسب رانندگی شهری و اسنپ بدون لغزش و تکان',
  heroSlide1Link: '/products?category=هولدر و پایه',
  heroSlide1Badge: 'فروش تکی و عمده کارتنی',
  heroSlide2Title: 'قاب‌های مگ‌سیف و گلس‌های سوپردی فول‌چسب',
  heroSlide2Subtitle: 'تنوع بیش از ۵۰۰ مدل کاور سیلیکونی پاک‌کنی، قاب‌های ضدضربه و گلس‌های نشکن برای انواع مدل‌های آیفون، سامسونگ و شیائومی',
  heroSlide2Link: '/products?category=قاب و کاور',
  heroSlide2Badge: 'تخفیف ویژه سفارش‌های پک و تعدادی',
  heroSlide3Title: 'کابل‌های کنفی تقویت‌شده و محافظ‌های فنری کابل',
  heroSlide3Subtitle: 'کابل‌های تایپ‌سی، لایتنینگ و محافظ‌های سیلیکونی سر کابل برای جلوگیری از پارگی و افزایش چندبرابری طول عمر شارژر',
  heroSlide3Link: '/products?category=کابل',
  heroSlide3Badge: 'تضمین سلامت فیزیکی ۱۰۰٪',
};
