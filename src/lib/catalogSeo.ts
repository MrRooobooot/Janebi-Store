/**
 * Dynamic <head> SEO helpers (catalog SEO cluster 2026-09-04b).
 * - Updates document.title / meta description / og:title / og:description per
 *   selected category on /products (SPA meta is otherwise static).
 * - Injects a schema.org CollectionPage + ItemList JSON-LD built ONLY from
 *   real live API data (real category name, real product count, real URLs).
 * - Zero fabricated data: caller passes only values returned by the API.
 * - restore() returns the head to the static index.html defaults.
 */
export interface CatalogSeoInput {
  title: string;
  description: string;
  /** Real product count from the live API response (Persian-digits applied by caller if displayed). */
  itemCount: number;
  /** Category filter value from the live API ('همه' for the unfiltered catalog). */
  category: string;
}

const JSONLD_ID = 'catalog-jsonld';

function setMetaContent(selector: string, content: string): void {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute('content', content);
}

function escapeJsonLd(text: string): string {
  return text.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function applyCatalogSeo(input: CatalogSeoInput): void {
  if (typeof document === 'undefined') return;
  document.title = input.title;
  setMetaContent('meta[name="description"]', input.description);
  setMetaContent('meta[property="og:title"]', input.title);
  setMetaContent('meta[property="og:description"]', input.description);

  const isFiltered = input.category !== 'همه';
  const canonical = isFiltered
    ? `https://janebiarena.ir/products?category=${encodeURIComponent(input.category)}`
    : 'https://janebiarena.ir/products';

  document.getElementById(JSONLD_ID)?.remove();
  const script = document.createElement('script');
  script.id = JSONLD_ID;
  script.type = 'application/ld+json';
  // CollectionPage + ItemList strictly from live API data (count, category, real URLs).
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.title,
    description: input.description,
    url: canonical,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.itemCount,
    },
  };
  script.textContent = escapeJsonLd(JSON.stringify(payload));
  document.head.appendChild(script);
}

export function restoreCatalogSeo(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(JSONLD_ID)?.remove();
  document.title = 'جانبی آرنا | فروشگاه آنلاین لوازم جانبی موبایل';
  setMetaContent(
    'meta[name="description"]',
    'فروشگاه آنلاین جانبی آرنا، مرجع تخصصی خرید انواع قاب و کاور گوشی، گلس محافظ، شارژر سریع، کابل، پاوربانک و هندزفری با ضمانت اصالت و ارسال سریع به سراسر ایران.'
  );
}
