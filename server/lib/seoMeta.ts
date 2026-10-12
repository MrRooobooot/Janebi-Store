import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { blogPosts, products } from "../db/schema.js";
import {
  CATALOG_HUB_DESCRIPTION,
  CATALOG_HUB_TITLE,
  catalogCanonical,
  catalogDescription,
  catalogTitle,
  type CatalogFilters,
} from "../../src/lib/catalogCopy.js";
import { queryCatalogue } from "../routes/products.js";
import { productSeo, productSocialImage, SHARE_IMAGE } from "../../src/lib/productSeo.js";
import {
  blogPostSeo,
  INDEX_ROBOTS,
  matchRoute,
  NOINDEX_ROBOTS,
  NOT_FOUND_SEO,
  type PageSeo,
} from "../../src/lib/routeSeo.js";

/**
 * Server-side per-route SEO metadata for the raw HTML shell (crawlers that do
 * not run JS). Wording comes from the shared modules, so the server and the
 * client cannot disagree:
 *   - static / admin / 404 pages  -> src/lib/routeSeo.ts
 *   - /products (catalogue)       -> src/lib/catalogCopy.ts
 *   - /product/:id, /products/:id -> src/lib/productSeo.ts
 *   - /blog/:slug                 -> src/lib/routeSeo.ts (blogPostSeo), DB row
 * Metadata comes only from real DB rows or those definitions.
 */

export interface RouteMeta {
  title: string;
  description: string;
  ogType: "website" | "product" | "article";
  /** Absolute canonical. Absent for pages that have none (404). */
  ogUrl?: string;
  robots?: string;
  ogImage?: string;
  /** The real LCP image for this route — preloaded so it is discoverable in the initial HTML. */
  preloadImage?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toRouteMeta(seo: PageSeo): RouteMeta {
  return {
    title: seo.title,
    description: seo.description,
    ogType: seo.ogType ?? "website",
    ogUrl: seo.canonical,
    robots: seo.robots,
  };
}

/** The unfiltered /products hub. Byte-identical to what the client writes after hydration. */
const PRODUCTS_HUB_META: RouteMeta = {
  title: CATALOG_HUB_TITLE,
  description: CATALOG_HUB_DESCRIPTION,
  ogType: "website",
  ogUrl: catalogCanonical(),
  robots: INDEX_ROBOTS,
};

/**
 * A database read for a route's head failed. This is not the same as "no such
 * row": a missing or unpublished article is a 404, a failed read is a temporary
 * error (see unavailableFor). `detail` is kept for the server log only.
 */
export class SeoLookupUnavailable extends Error {
  readonly detail: unknown;
  constructor(detail: unknown) {
    super("SEO lookup unavailable");
    this.name = "SeoLookupUnavailable";
    this.detail = detail;
  }
}

/**
 * A published article's head. Null when the slug is unknown or unpublished (the
 * caller answers 404). A failed read throws SeoLookupUnavailable, never null.
 */
async function articleMeta(slug: string): Promise<RouteMeta | null> {
  const post = await db.query.blogPosts
    .findFirst({ where: eq(blogPosts.id, slug) })
    .catch((detail: unknown) => {
      throw new SeoLookupUnavailable(detail);
    });
  if (!post || !post.published) return null;
  return toRouteMeta(blogPostSeo(post));
}

/**
 * Route metadata for everything except the catalogue listing (see routeMetaForRequest).
 * Static and admin routes come from the registry. A product whose lookup fails keeps
 * the generic shell (no article 404 is implied). An article lookup failure throws.
 */
async function routeMetaFor(pathname: string): Promise<RouteMeta | null> {
  const match = matchRoute(pathname);
  if (match.kind === "static" || match.kind === "admin") return toRouteMeta(match.seo);

  if (match.kind === "product") {
    try {
      const product = await db.query.products.findFirst({
        where: eq(products.id, Number(match.id)),
      });
      if (!product) return null;
      const seo = productSeo({
        id: product.id,
        title: product.title,
        description: product.description,
        image: product.image,
      });
      return { title: seo.title, description: seo.description, ogType: "product", ogUrl: seo.canonical, robots: INDEX_ROBOTS };
    } catch {
      return null; // DB unavailable → keep generic shell metadata (pre-existing fallback)
    }
  }

  if (match.kind === "blogPost") return match.slug ? articleMeta(match.slug) : null;

  // catalog: routeMetaForRequest. notFound: the caller answers 404.
  return null;
}

export interface UnavailableResponse {
  status: 503;
  headers: Record<string, string>;
  body: string;
}

const UNAVAILABLE_BODY =
  '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">' +
  "<title>سرویس موقتاً در دسترس نیست | جانبی آرنا</title></head>" +
  "<body><p>این صفحه موقتاً در دسترس نیست. لطفاً چند دقیقه‌ی دیگر دوباره تلاش کنید.</p></body></html>";

/**
 * The answer when a page's head cannot be read, or null when the route keeps its
 * fallback. An article whose lookup fails gets 503 with Retry-After and no-store: it is
 * not a 404 (which would drop the page from the index) and not the generic shell.
 * Headers and body carry no error text, SQL, path or stack.
 */
export function unavailableFor(err: unknown, pathname: string): UnavailableResponse | null {
  const isArticle = matchRoute(pathname).kind === "blogPost";
  if (!isArticle && !(err instanceof SeoLookupUnavailable)) return null;
  return {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "60",
      "Cache-Control": "no-store",
    },
    body: UNAVAILABLE_BODY,
  };
}

/**
 * Live item count for a filtered listing, from the shared query builder — the
 * same number `X-Total-Count` reports and the page prints. Never a literal.
 */
async function catalogItemCount(filters: CatalogFilters): Promise<number> {
  const { total } = await queryCatalogue({
    category: filters.category ?? undefined,
    brands: filters.brands?.length ? filters.brands.join(",") : undefined,
    limit: 1,
  });
  return total;
}

/** Meta for a catalogue listing, byte-identical to what the client writes into
 *  <head> after hydration (same module + same live count).
 *
 *  The filtered URL is its own canonical. A stale/unknown filter value falls back to
 *  the hub, not to the shell's homepage canonical.
 */
async function routeMetaForListing(filters: CatalogFilters): Promise<RouteMeta | null> {
  const brands = filters.brands ?? [];
  const category = filters.category ?? null;
  if (!category && brands.length === 0) return PRODUCTS_HUB_META;
  try {
    // A filter value with no live product behind it is not a listing: fall back
    // to the hub instead of minting a thin/canonical-orphan page.
    const exists = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.isActive, 1),
          category ? eq(products.category, category) : inArray(products.brand, brands)
        )
      )
      .limit(1);
    if (!exists[0]) return PRODUCTS_HUB_META;
    const total = await catalogItemCount(filters);
    return {
      title: catalogTitle(filters),
      description: catalogDescription(filters, total),
      ogType: "website",
      ogUrl: catalogCanonical(filters),
      robots: INDEX_ROBOTS,
    };
  } catch {
    return null;
  }
}

/** Resolve metadata for a request; query string included for catalogue listings. */
export async function routeMetaForRequest(pathname: string, query: URLSearchParams): Promise<RouteMeta | null> {
  if (pathname === "/products" || pathname === "/products/") {
    const category = query.get("category");
    const brandParam = query.get("brands") || query.get("brand");
    const brands = brandParam
      ? brandParam
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean)
      : [];
    const meta = await routeMetaForListing({
      category: category && category !== "همه" ? category : null,
      brands,
    });
    // Internal search results are never landing pages.
    if (meta && query.get("search")?.trim()) return { ...meta, robots: NOINDEX_ROBOTS };
    return meta;
  }
  return routeMetaFor(pathname);
}

/** Replace generic shell <title>/<meta>/og/twitter tags with route-specific ones (escaped, UTF-8 safe). */
export function injectSeoMetadata(html: string, meta: RouteMeta): string {
  if (!html.includes("</head>")) return html;
  const esc = escapeHtml;
  let out = html;
  // One canonical tag, matching og:url exactly (single indexing signal). A page with
  // no canonical (404) gets neither: the shell's homepage canonical must not survive.
  out = out.replace(/<link[^>]*rel="canonical"[^>]*>\s*/gi, "");
  out = out.replace(/<meta\s+property="og:url"[^>]*>\s*/gi, "");
  if (meta.ogUrl) {
    out = out.replace("</head>", `<link rel="canonical" href="${esc(meta.ogUrl)}" />\n</head>`);
  }
  const setTag = (regex: RegExp, replacement: string) => {
    if (regex.test(out)) out = out.replace(regex, replacement);
    else out = out.replace("</head>", `${replacement}\n</head>`);
  };
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  setTag(
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(meta.description)}" />`
  );
  if (meta.robots) {
    setTag(/<meta\s+name="robots"[^>]*>/, `<meta name="robots" content="${esc(meta.robots)}" />`);
  }
  setTag(/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(meta.title)}" />`);
  setTag(
    /<meta\s+property="og:description"[^>]*>/,
    `<meta property="og:description" content="${esc(meta.description)}" />`
  );
  if (meta.ogUrl) {
    setTag(/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(meta.ogUrl)}" />`);
  }
  setTag(/<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${esc(meta.ogType)}" />`);
  if (meta.ogImage) {
    setTag(/<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(meta.ogImage)}" />`);
  }
  // Twitter cards read their own tags. The shell's are the homepage copy, so every
  // route must replace them, or a shared catalogue or product link previews as the homepage.
  setTag(/<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(meta.title)}" />`);
  setTag(
    /<meta\s+name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`
  );
  setTag(
    /<meta\s+name="twitter:image"[^>]*>/,
    `<meta name="twitter:image" content="${esc(meta.ogImage ?? SHARE_IMAGE)}" />`
  );
  // Lighthouse's LCP-discovery insight: a hero image that only appears after React
  // hydration is not discoverable in the initial document (mobile LCP paid ~0.4s
  // for it). Preloading it here — server-rendered routes only — fixes that.
  if (meta.preloadImage && !/<link[^>]+rel="preload"[^>]+as="image"/.test(out)) {
    out = out.replace("</head>", `  <link rel="preload" as="image" href="${esc(meta.preloadImage)}" fetchpriority="high" />\n</head>`);
  }
  return out;
}

/** The shell head for an unknown URL (the HTTP status is 404 and the caller sends it). */
export function injectNotFoundMetadata(html: string): string {
  return injectSeoMetadata(html, toRouteMeta(NOT_FOUND_SEO));
}

/** Fetch product og:image (absolute) when the product exists; null otherwise. */
export async function productOgImageFor(pathname: string): Promise<{ og: string; hero: string } | null> {
  const match = pathname.match(/^\/products?\/(\d+)\/?$/);
  if (!match) return null;
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, Number(match[1])),
    });
    if (!product?.image) return null;
    const img = String(product.image);
    // Social card: productSocialImage falls back to the raster share card for SVG
    // art, because social crawlers do not render SVG (shared with the client).
    const absolute = (v: string) => (v.startsWith("http") ? v : `https://janebiarena.ir${v}`);
    // The <picture> element prefers AVIF, so that is the request Lighthouse counts as
    // LCP: preloading the JPEG sibling would download twice and help nothing. The
    // social card, however, must stay a raster JPEG/PNG — crawlers do not render AVIF
    // or SVG (the legacy local vector art falls back to the site share card).
    const avifSibling = img.match(/^(\/images\/products\/.+)\.(jpe?g|png)$/i);
    const hero = absolute(avifSibling ? `${avifSibling[1]}.avif` : img);
    return { og: productSocialImage(img) ?? SHARE_IMAGE, hero };
  } catch {
    return null;
  }
}
