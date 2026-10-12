/**
 * Catalogue <head> SEO (catalog SEO cluster 2026-09-04b, head writer moved to
 * headSeo.ts in 2026-10).
 * - Writes title, description, canonical, Open Graph and Twitter for the listing
 *   on /products, from the same wording the server prerender uses (catalogCopy).
 * - Injects a schema.org CollectionPage + ItemList JSON-LD built ONLY from live
 *   API data (real category name, real product count).
 * - Leaving the catalogue is handled by the page's unmount (see Products.tsx),
 *   which calls resetHeadSeo().
 */
import { catalogCanonical, catalogDescription, catalogTitle, type CatalogFilters } from './catalogCopy';
import { applyPageSeo, setRouteJsonLd } from './headSeo';
import { INDEX_ROBOTS, NOINDEX_ROBOTS } from './routeSeo';

interface CatalogSeoInput extends CatalogFilters {
  /** Real product count from the live API response. Callers pass it only once the listing has settled. */
  itemCount: number;
  /** Internal search results are never landing pages (matches the server's robots rule). */
  noindex?: boolean;
}

export function applyCatalogSeo(input: CatalogSeoInput): void {
  if (typeof document === 'undefined') return;
  const title = catalogTitle(input);
  const description = catalogDescription(input, input.itemCount);
  const canonical = catalogCanonical(input);
  applyPageSeo({
    title,
    description,
    canonical,
    robots: input.noindex ? NOINDEX_ROBOTS : INDEX_ROBOTS,
    ogType: 'website',
  });

  // CollectionPage + ItemList strictly from live API data (count, category, real URLs).
  setRouteJsonLd('catalog-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonical,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.itemCount,
    },
  });
}
