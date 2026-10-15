import { APPROVED_CATEGORIES, isApprovedCategory } from './approvedCategories';
import { toEnglishDigits, toPersianDigits } from './utils';
import type { Product } from '../types';

// Pure rules for the admin product form: money math, validation, payload shape.
// The modal (components/admin/ProductFormModal.tsx) only renders and wires these.

/** Gross-margin floor (%): the admin table flags rows below it, the form warns. */
export const MIN_MARGIN_PCT = 10;
export const MAX_GALLERY = 8;
export const MAX_FEATURES = 20;
export const MAX_FEATURE_LENGTH = 120;
export const MAX_TITLE_LENGTH = 150;
export const MAX_BRAND_LENGTH = 60;
export const MAX_BARCODE_LENGTH = 24;

/** Vector stand-ins used when no real photo exists yet. SVG is not shown on the homepage. */
export const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  'هولدر و نگهدارنده': '/products/hld-13.svg',
  'قاب و کاور موبایل': '/products/cas-4.svg',
  'گلس و محافظ صفحه': '/products/gls-3.svg',
  'کابل و سیم': '/products/cbl-1.svg',
  'شارژر و آداپتور': '/products/chg-2.svg',
  'هندزفری و ایرباد': '/products/ear-6.svg',
  'پاوربانک': '/products/pb-7.svg',
};

export const PRESET_PHOTOS = [
  { id: 'hld-13', category: 'هولدر و نگهدارنده', label: 'هولدر مگنتی مگ‌سیف MagPro', url: '/products/hld-13.svg' },
  { id: 'cpr-14', category: 'کابل و سیم', label: 'محافظ کابل سیلیکونی فنری', url: '/products/cpr-14.svg' },
  { id: 'ear-6', category: 'هندزفری و ایرباد', label: 'هندزفری TWS بلوتوثی Pro', url: '/products/ear-6.svg' },
  { id: 'ear-10', category: 'هندزفری و ایرباد', label: 'هندزفری In-Ear ارگونومیک', url: '/products/ear-10.svg' },
  { id: 'chg-2', category: 'شارژر و آداپتور', label: 'شارژر فست GaN 20W', url: '/products/chg-2.svg' },
  { id: 'chg-5', category: 'شارژر و آداپتور', label: 'شارژر سوپرفست 25W', url: '/products/chg-5.svg' },
  { id: 'chg-9', category: 'شارژر و آداپتور', label: 'پد شارژر وایرلس مگ‌سیف', url: '/products/chg-9.svg' },
  { id: 'cbl-1', category: 'کابل و سیم', label: 'کابل فست Type-C به Type-C', url: '/products/cbl-1.svg' },
  { id: 'cbl-11', category: 'کابل و سیم', label: 'کابل فست لایتنینگ MFi', url: '/products/cbl-11.svg' },
  { id: 'cas-4', category: 'قاب و کاور موبایل', label: 'کاور سیلیکونی مگ‌سیف', url: '/products/cas-4.svg' },
  { id: 'cas-8', category: 'قاب و کاور موبایل', label: 'قاب آرمور ضدضربه CamShield', url: '/products/cas-8.svg' },
  { id: 'gls-3', category: 'گلس و محافظ صفحه', label: 'گلس شیشه‌ای فول چسب 9H', url: '/products/gls-3.svg' },
  { id: 'gls-12', category: 'گلس و محافظ صفحه', label: 'گلس سرامیکی انعطاف‌پذیر', url: '/products/gls-12.svg' },
  { id: 'pb-7', category: 'پاوربانک', label: 'پاوربانک 65W با نمایشگر دیجیتال', url: '/products/pb-7.svg' },
];

export const WARRANTY_SUGGESTIONS = ['۷ روز مهلت تست', '۱۸ ماهه ایستا', 'بدون گارانتی'];

const REAL_PHOTO = /\.(webp|png|jpe?g)(\?|$)/i;

export interface ProductFormValues {
  title: string;
  category: string;
  brand: string;
  image: string;
  images: string[];
  price: string;
  originalPrice: string;
  discount: string;
  stockQuantity: string;
  warranty: string;
  features: string[];
  description: string;
  costPrice: string;
  barcode: string;
  isActive: boolean;
}

export type ProductFormField = keyof ProductFormValues;
export type ProductFormErrors = Partial<Record<ProductFormField | 'form', string>>;

export const emptyProductForm = (): ProductFormValues => ({
  title: '',
  category: '',
  brand: '',
  image: '',
  images: [],
  price: '',
  originalPrice: '',
  discount: '0',
  stockQuantity: '',
  warranty: '',
  features: [],
  description: '',
  costPrice: '',
  barcode: '',
  isActive: true,
});

/** Digits only, Persian or Latin, as a string. */
export function digitsOnly(value: string): string {
  return toEnglishDigits(value).replace(/[^0-9]/g, '');
}

/** Whole number from user input, or null when the field is empty. */
export function toInt(value: string): number | null {
  const digits = digitsOnly(value);
  return digits ? parseInt(digits, 10) : null;
}

/** Percent off, rounded. 0 when there is no usable original price. */
export function computeDiscountPercent(original: number | null, price: number | null): number {
  if (!original || !price || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

/** Sale price for a typed percent. Null when there is no original price to apply it to. */
export function priceFromPercent(original: number | null, percent: number): number | null {
  if (!original) return null;
  return Math.round(original * (1 - percent / 100));
}

/** Gross margin in percent, or null when the cost is unknown. */
export function marginPercent(price: number | null, cost: number | null): number | null {
  if (!price || !cost || cost <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
}

export function isBelowMarginFloor(margin: number | null): boolean {
  return margin !== null && margin < MIN_MARGIN_PCT;
}

/** Only webp/png/jpg show on the homepage and in hero ads; SVG stand-ins do not. */
export function isRealPhoto(url: string | null | undefined): boolean {
  return REAL_PHOTO.test(url || '');
}

export function isPresetPhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  return PRESET_PHOTOS.some((p) => p.url === url) || Object.values(CATEGORY_DEFAULT_IMAGES).includes(url);
}

/** Preset stand-in for a category, or null when the category has none. */
export function presetForCategory(category: string): string | null {
  return CATEGORY_DEFAULT_IMAGES[category] ?? null;
}

/**
 * Validation for the create and edit forms. `savedCategory` lets an existing
 * product keep a legacy category it already has; new products must use the
 * approved list.
 */
export function validateProductForm(values: ProductFormValues, savedCategory?: string): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = 'عنوان کالا را وارد کنید';
  else if (title.length > MAX_TITLE_LENGTH) errors.title = `عنوان بیشتر از ${MAX_TITLE_LENGTH} حرف است`;

  const categoryOk = isApprovedCategory(values.category) || (!!savedCategory && values.category === savedCategory);
  if (!values.category || !categoryOk) errors.category = 'دسته‌بندی را از فهرست انتخاب کنید';

  const brand = values.brand.trim();
  if (!brand) errors.brand = 'برند کالا را وارد کنید';
  else if (brand.length > MAX_BRAND_LENGTH) errors.brand = `برند بیشتر از ${MAX_BRAND_LENGTH} حرف است`;

  const price = toInt(values.price);
  if (!price || price <= 0) errors.price = 'قیمت فروش را وارد کنید';

  const original = toInt(values.originalPrice);
  if (original !== null && price && original < price) {
    errors.originalPrice = 'قیمت قبل از تخفیف نباید کمتر از قیمت فروش باشد';
  }

  if (toInt(values.stockQuantity) === null) errors.stockQuantity = 'موجودی را وارد کنید (۰ یعنی ناموجود)';

  if (!values.image) errors.image = 'تصویر کالا را آپلود کنید یا یکی از تصاویر آماده را انتخاب کنید';

  if (values.barcode.trim().length > MAX_BARCODE_LENGTH) errors.barcode = `بارکد بیشتر از ${MAX_BARCODE_LENGTH} رقم است`;

  return errors;
}

/** Body for POST/PUT /api/admin/products. Derived numbers come from the same rules as the UI. */
export function buildProductPayload(values: ProductFormValues) {
  const price = toInt(values.price) ?? 0;
  const original = toInt(values.originalPrice);
  const cost = toInt(values.costPrice);
  return {
    title: values.title.trim(),
    category: values.category,
    price,
    originalPrice: original ?? price,
    discount: computeDiscountPercent(original, price),
    image: values.image,
    brand: values.brand.trim(),
    warranty: values.warranty.trim(),
    description: values.description.trim(),
    stockQuantity: toInt(values.stockQuantity) ?? 0,
    costPrice: cost,
    barcode: values.barcode.trim() || null,
    isActive: values.isActive ? 1 : 0,
    features: values.features.map((f) => f.trim()).filter(Boolean).slice(0, MAX_FEATURES),
    images: values.images.filter((u) => u && u !== values.image).slice(0, MAX_GALLERY),
  };
}

/** Adds one spec line. Ignores blanks, duplicates, and anything past the limit. */
export function addFeature(list: string[], raw: string): string[] {
  const text = raw.trim().slice(0, MAX_FEATURE_LENGTH);
  if (!text || list.length >= MAX_FEATURES || list.includes(text)) return list;
  return [...list, text];
}

/** Server validation issues come back as paths like ['body', 'brand']. */
export function fieldFromIssuePath(path: unknown): ProductFormField | null {
  if (!Array.isArray(path)) return null;
  const key = path[0] === 'body' ? path[1] : path[0];
  return typeof key === 'string' && key in emptyProductForm() ? (key as ProductFormField) : null;
}

/** Snapshot used to detect unsaved changes. */
export function snapshotOf(values: ProductFormValues): string {
  return JSON.stringify(values);
}

export const PRODUCT_CATEGORY_OPTIONS: readonly string[] = APPROVED_CATEGORIES;

/** Grouped digits for a money input, e.g. ۹۸۰,۰۰۰ (no currency suffix inside the field). */
export function formatAmount(value: number | null): string {
  if (value === null) return '';
  return toPersianDigits(value.toLocaleString('en-US'));
}

/** Form state for editing an existing product. */
export function valuesFromProduct(product: Product): ProductFormValues {
  return {
    title: product.title,
    category: product.category,
    brand: product.brand || '',
    image: product.image || '',
    images: (product.images ?? []).filter((u) => u !== product.image),
    price: product.price ? String(product.price) : '',
    // The API stores originalPrice = price when there is no discount; show it blank.
    originalPrice: product.originalPrice && product.originalPrice !== product.price ? String(product.originalPrice) : '',
    discount: String(product.discount || 0),
    // Stock 0 must stay 0; a falsy check here would turn it into a different number on save.
    stockQuantity: product.stockQuantity != null ? String(product.stockQuantity) : '',
    warranty: product.warranty || '',
    features: product.features ?? [],
    description: product.description || '',
    costPrice: product.costPrice != null ? String(product.costPrice) : '',
    barcode: product.barcode || '',
    isActive: product.isActive !== 0,
  };
}
