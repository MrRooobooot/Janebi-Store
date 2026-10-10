/**
 * Raw-HTML snapshot of a catalogue listing for crawlers that do not run JS.
 *
 * Why: `/products` (and its brand/category filters) shipped only the empty SPA
 * shell — 6KB of nothing for Googlebot. This renders the SAME listing the live
 * API returns for the same URL (one query builder: `queryCatalogue`) inside the
 * `#root` element, so the crawler reads the real catalogue and React replaces it
 * on hydration.
 *
 * Invariants:
 * - Count and items come from the live DB through the shared query builder, at
 *   the shared DEFAULT_CATALOG_PAGE_SIZE the client itself asks for. No literal
 *   product count anywhere.
 * - Wording (title / h1 / description / canonical) comes from src/lib/catalogCopy.ts,
 *   the same module the client uses → raw HTML and DOM cannot disagree.
 * - The JSON-LD block is emitted under `catalog-jsonld-prerender`; the client
 *   removes it when it writes its own, so the document never carries two.
 */
import { DEFAULT_CATALOG_PAGE_SIZE } from '../../src/lib/constants.js';
import {
  CATALOG_HUB_DESCRIPTION,
  CATALOG_HUB_TITLE,
  catalogCanonical,
  catalogDescription,
  catalogH1,
  catalogTitle,
} from '../../src/lib/catalogCopy.js';
import { queryCatalogue } from '../routes/products.js';
import { escapeHtml } from './seoMeta.js';
import { toPersianDigits } from '../../src/lib/utils.js';

export interface SnapshotItem {
  id: number;
  title: string;
  price: number;
  stockQuantity: number;
}

/** Minimal catalogue routes that get a prerendered listing (pathname only). */
export const CATALOG_SNAPSHOT_PATHS = ['/products'] as const;

/**
 * Split the request's own query into the filter shape both the API route and
 * `catalogCopy` understand. The URL spelling is the client's (singular `brand`),
 * the API accepts both — pass what the URL has, add nothing.
 */
function filtersFromQuery(query: URLSearchParams) {
  const category = query.get('category');
  const brandParam = query.get('brands') || query.get('brand');
  const brands = brandParam
    ? brandParam
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean)
    : [];
  return { category: category && category !== 'همه' ? category : null, brands };
}

function escapedJsonLd(payload: unknown): string {
  // `</script>` inside a JSON string would end the block early.
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

/** Pure: the visible list a crawler reads inside #root. */
export function renderCatalogSnapshotHtml(items: SnapshotItem[], h1: string, total: number): string {
  const rows = items
    .map(
      (item) =>
        `<li><a href="/products/${item.id}">${escapeHtml(item.title)}</a> — ${toPersianDigits(
          Number(item.price).toLocaleString('en-US')
        )} تومان${item.stockQuantity > 0 ? '' : ' (ناموجود)'}</li>`
    )
    .join('');
  return (
    `<div id="catalog-prerender" data-prerendered="1">` +
    `<h1>${escapeHtml(h1)}</h1>` +
    `<p>${toPersianDigits(total)} محصول</p>` +
    `<ul>${rows}</ul>` +
    `</div>`
  );
}

/** Pure: CollectionPage + ItemList carrying the real item URLs for this listing. */
export function catalogSnapshotJsonLd(
  items: SnapshotItem[],
  listing: { title: string; description: string; canonical: string; total: number }
): string {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: listing.title,
    description: listing.description,
    url: listing.canonical,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: listing.total,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: `https://janebiarena.ir/products/${item.id}`,
      })),
    },
  };
  return `<script id="catalog-jsonld-prerender" type="application/ld+json">${escapedJsonLd(payload)}</script>`;
}

export interface CatalogSnapshot {
  /** Visible HTML to place inside #root. */
  contentHtml: string;
  /** JSON-LD block to place in <head>. */
  jsonLd: string;
  title: string;
  description: string;
  canonical: string;
  total: number;
}

/** Null when this pathname is not a prerendered catalogue listing. */
export async function catalogSnapshotFor(
  pathname: string,
  query: URLSearchParams
): Promise<CatalogSnapshot | null> {
  if (!CATALOG_SNAPSHOT_PATHS.includes(pathname as (typeof CATALOG_SNAPSHOT_PATHS)[number])) {
    return null;
  }

  const filters = filtersFromQuery(query);
  const { items, total } = await queryCatalogue({
    category: query.get('category') ?? undefined,
    brands: query.get('brands') ?? undefined,
    brand: query.get('brand') ?? undefined,
    search: query.get('search') ?? undefined,
    minPrice: query.get('minPrice') ?? undefined,
    maxPrice: query.get('maxPrice') ?? undefined,
    inStock: query.get('inStock') ?? undefined,
    hasDiscount: query.get('hasDiscount') ?? undefined,
    sort: query.get('sort') ?? undefined,
    page: query.get('page') ?? undefined,
    // Same page size the client requests — the snapshot count equals the count
    // a user sees, by construction.
    limit: DEFAULT_CATALOG_PAGE_SIZE,
  });

  const shaped = items.map((item) => ({
    id: item.id,
    title: item.title,
    price: item.price,
    stockQuantity: item.stockQuantity,
  })) as SnapshotItem[];

  const title = catalogTitle(filters) || CATALOG_HUB_TITLE;
  const description = catalogDescription(filters, total) || CATALOG_HUB_DESCRIPTION;
  const canonical = catalogCanonical(filters);

  return {
    contentHtml: renderCatalogSnapshotHtml(shaped, catalogH1(filters), total),
    jsonLd: catalogSnapshotJsonLd(shaped, { title, description, canonical, total }),
    title,
    description,
    canonical,
    total,
  };
}

/** Replace the empty SPA mount with the prerendered listing. */
export function injectCatalogSnapshot(html: string, snapshot: CatalogSnapshot): string {
  return html
    .replace('<div id="root"></div>', `<div id="root">${snapshot.contentHtml}</div>`)
    .replace('</head>', `${snapshot.jsonLd}</head>`);
}
