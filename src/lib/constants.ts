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
 * Page size of the catalogue listing. The client asks the API for this many
 * products and the server-side raw-HTML prerender renders the same page, so a
 * crawler without JS sees exactly the items a user sees (no hardcoded count).
 */
export const DEFAULT_CATALOG_PAGE_SIZE = 20;

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
  phone: '09389070955', // support line; an empty value hides every phone line
  email: 'info@janebiarena.ir',
  supportHours: 'همه روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
  address: 'مشهد، شهرک غرب',
  freeShippingThreshold: '2000000',
  announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10',
  // Homepage sections — admin/bale-bot editable (2026-09-09). Every homepage
  // block reads these via /api/settings; defaults = current live copy.
  announcementBarEnabled: 'true', // 'false' hides the top announcement bar (bot toggle st:bar_tog)
  dealsTitle: 'کالاهای تخفیف‌دار',
  dealsSubtitle: 'تخفیف روی کالاهای موجود فروشگاه',
  b2bTitle: 'فروش عمده، کارتنی و همکاران سراسر ایران',
  b2bDesc: 'قیمت همکاری ویژه برای مغازه‌داران و خریداران عمده هولدر و کابل',
  b2bLink: '/contact?type=wholesale',
  b2bButtonText: 'استعلام لیست قیمت عمده',
  vipBadge: 'باشگاه مشتریان جانبی آرنا',
  vipTitle: 'کد تخفیف ۱۰٪ هدیه اول عضویت!',
  vipSubtitle: 'با عضویت، کد تخفیف ۱۰٪ برای اولین خرید را می‌گیرید.',
  vipCouponCode: 'WELCOME10', // shown after successful newsletter signup (real code must exist in coupons table)
  valueProp1Title: 'فروش تک و عمده همکاران',
  valueProp1Desc: 'قیمت رقابتی بازار و ارسال کارتنی برای فروشگاه‌ها',
  valueProp2Title: 'ارسال فوری پیشتاز',
  valueProp2Desc: 'تحویل سریع در بسته‌بندی ضدضربه به سراسر کشور',
  valueProp3Title: 'تضمین سلامت فیزیکی',
  valueProp3Desc: 'مهلت تست ۷ روزه و امکان تعویض در صورت مغایرت',
  valueProp4Title: 'مشاوره خرید هولدر و کابل',
  valueProp4Desc: 'راهنمایی انتخاب مدل متناسب با خودرو و مدل گوشی',
};

/**
 * Canonical Design System theme parameters synchronized between server and client.
 * Server sends these in /api/settings so client or admin panels can dynamically inspect theme state.
 */
export const STORE_THEME_TOKENS = {
  primaryCta: '#e11d48',
  canvasLight: '#f1f5f9',
  canvasDark: '#090d16',
  surfaceCardLight: '#ffffff',
  surfaceCardDark: '#0e1629',
  fontFamily: 'Vazirmatn',
  designSystem: 'DDS-Titanium-v1',
} as const;

