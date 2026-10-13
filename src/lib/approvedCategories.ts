// The approved product categories. Mirrors docs/reference/CATEGORY-TREE.md, which is the
// locked source of truth. Do not add, rename or remove an entry without the owner's approval;
// tests/unit/approved-categories.test.ts fails if this list drifts from the doc.
export const APPROVED_CATEGORIES = [
  'قاب و کاور موبایل',
  'گلس و محافظ صفحه',
  'کابل و سیم',
  'شارژر و آداپتور',
  'هولدر و نگهدارنده',
  'هندزفری و ایرباد',
  'هدفون و هدست',
  'پاوربانک',
  'تبدیل و مبدل',
  'لوازم گیمینگ موبایل',
  'لوازم جانبی خودرو',
  'لوازم جانبی ساعت هوشمند',
  'محافظ و نگهدارنده',
  'دانگل و تجهیزات اتصال',
] as const;

export type ApprovedCategory = (typeof APPROVED_CATEGORIES)[number];

export const isApprovedCategory = (value: string): value is ApprovedCategory =>
  (APPROVED_CATEGORIES as readonly string[]).includes(value);
