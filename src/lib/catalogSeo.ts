/**
 * Dynamic <head> SEO helpers (catalog SEO cluster 2026-09-04b).
 * - Updates document.title / meta description / og:title / og:description per
 *   selected category on /products (SPA meta is otherwise static).
 * - Injects a schema.org CollectionPage + ItemList JSON-LD built ONLY from
 *   real live API data (real category name, real product count, real URLs).
 * - Zero fabricated data: caller passes only values returned by the API.
 * - restore() returns the head to the static index.html defaults.
 */
import {
  CATALOG_HUB_DESCRIPTION,
  CATALOG_HUB_TITLE,
  catalogCanonical,
  catalogDescription,
  catalogTitle,
  type CatalogFilters,
} from './catalogCopy';

interface CatalogSeoInput extends CatalogFilters {
  /** Real product count from the live API response (Persian-digits applied by caller if displayed). */
  itemCount: number;
}

const JSONLD_ID = 'catalog-jsonld';
/** The server's no-JS prerender for this listing (removed once the live one exists). */
const PRERENDER_JSONLD_ID = 'catalog-jsonld-prerender';

function setMetaContent(selector: string, content: string): void {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute('content', content);
}

/** Point the single canonical link at the listing actually being shown. */
function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function escapeJsonLd(text: string): string {
  return text.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function applyCatalogSeo(input: CatalogSeoInput): void {
  if (typeof document === 'undefined') return;
  const title = catalogTitle(input);
  const description = catalogDescription(input, input.itemCount);
  const canonical = catalogCanonical(input);
  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setCanonical(canonical);

  // The server prerenders this listing for no-JS crawlers under
  // `catalog-jsonld-prerender`; the live block replaces it, so the document
  // never carries two competing CollectionPage blocks.
  document.getElementById(PRERENDER_JSONLD_ID)?.remove();
  document.getElementById(JSONLD_ID)?.remove();
  const script = document.createElement('script');
  script.id = JSONLD_ID;
  script.type = 'application/ld+json';
  // CollectionPage + ItemList strictly from live API data (count, category, real URLs).
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
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
  setCanonical(catalogCanonical());
  document.title = CATALOG_HUB_TITLE;
  setMetaContent('meta[name="description"]', CATALOG_HUB_DESCRIPTION);
}
