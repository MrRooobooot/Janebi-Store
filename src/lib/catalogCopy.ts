/**
 * Single source for the catalogue's user-visible wording: <title>, meta
 * description, h1 and canonical.
 *
 * Imported by BOTH the React page (client meta) and the server-side raw-HTML
 * prerender, so a crawler that does not run JS and a rendered browser can never
 * be shown two different sentences for the same listing — and the canonical can
 * never drift between them. Pure module: no DOM, no DB.
 */
import { toPersianDigits } from './utils';

export interface CatalogFilters {
  /** Selected category name (null / 'همه' = unfiltered). */
  category?: string | null;
  /** Selected brands — empty array = no brand filter. */
  brands?: string[];
}

/** The unfiltered /products hub — byte-identical to index.html's static tags. */
export const CATALOG_HUB_TITLE =
  'جانبی آرنا | خرید آنلاین لوازم جانبی موبایل و تبلت با ضمانت اصالت';
export const CATALOG_HUB_DESCRIPTION =
  'فروشگاه تخصصی جانبی آرنا؛ خرید انواع قاب و کاور گوشی، گلس نشکن، شارژر اصل، کابل، پاوربانک و هولدر با تضمین کیفیت، بهترین قیمت و ارسال سریع به سراسر ایران.';
export const CATALOG_HUB_H1 = 'فروشگاه تجهیزات و لوازم جانبی اورجینال';

function selectedCategory(filters: CatalogFilters): string | null {
  const category = filters.category;
  return category && category !== 'همه' ? category : null;
}

export function catalogIsFiltered(filters: CatalogFilters = {}): boolean {
  return Boolean(selectedCategory(filters) || filters.brands?.length);
}

/** "کابل" / "برند الف و ب" / "کابل برند الف" — the wording <head> and <h1> share. */
export function catalogFilterSubject(filters: CatalogFilters = {}): string {
  const category = selectedCategory(filters);
  const brandLabel = (filters.brands ?? []).join(' و ');
  return [category, filters.brands?.length ? `برند ${brandLabel}` : null]
    .filter(Boolean)
    .join(' ');
}

export function catalogH1(filters: CatalogFilters = {}): string {
  return catalogIsFiltered(filters) ? `خرید ${catalogFilterSubject(filters)}` : CATALOG_HUB_H1;
}

export function catalogTitle(filters: CatalogFilters = {}): string {
  return catalogIsFiltered(filters)
    ? `خرید ${catalogFilterSubject(filters)} | جانبی آرنا`
    : CATALOG_HUB_TITLE;
}

/** `itemCount` must be the live API's real total for this listing — never a literal. */
export function catalogDescription(filters: CatalogFilters = {}, itemCount: number): string {
  if (!catalogIsFiltered(filters)) return CATALOG_HUB_DESCRIPTION;
  return `خرید ${catalogFilterSubject(filters)} اورجینال در جانبی آرنا — ${toPersianDigits(itemCount)} محصول موجود با ضمانت اصالت، گارانتی تعویض فیزیکی و ارسال سریع به سراسر ایران.`;
}

export function catalogCanonical(filters: CatalogFilters = {}): string {
  const category = selectedCategory(filters);
  const query = [
    category ? `category=${encodeURIComponent(category)}` : null,
    filters.brands?.length ? `brand=${encodeURIComponent(filters.brands.join(','))}` : null,
  ]
    .filter(Boolean)
    .join('&');
  return `https://janebiarena.ir/products${query ? `?${query}` : ''}`;
}
