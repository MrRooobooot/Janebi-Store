/**
 * Client <head> SEO: the one writer for title, description, robots, canonical,
 * Open Graph, Twitter cards and route JSON-LD.
 *
 * Who calls what:
 *  - RouteHead (src/components/RouteHead.tsx) applies the static routes from
 *    routeSeo.ts, and resets the head when the route changes;
 *  - page owners (Products, ProductDetail, Blog) apply their own data while
 *    mounted, after their data has loaded;
 *  - React runs every unmount cleanup before the next route's mount effects, so
 *    the previous route's metadata cannot survive a navigation.
 *
 * tests/unit/head-seo.test.ts checks that HOME_SEO equals index.html.
 */
import { SHARE_IMAGE } from './productSeo';
import { HOME_SEO, INDEX_ROBOTS, type PageSeo } from './routeSeo';

export { HOME_SEO };
export type { PageSeo };

/**
 * JSON-LD blocks that belong to a route's head and have no component owner to
 * clear them: the server prerender (present before hydration) and the page-level
 * blocks written by this module's owners. They are removed whenever a page
 * applies or resets its head.
 *
 * Deliberately NOT listed:
 *  - the shell's Organization/WebSite block (no id);
 *  - `breadcrumb-jsonld-prerender` and `breadcrumb-jsonld`: DynamicBreadcrumbs owns
 *    them. It drops the server crumb on every page except an article, where the
 *    server crumb is the accurate one;
 *  - `faq-page-jsonld`, `related-products-jsonld`, `blog-posting-jsonld` and
 *    `blog-list-jsonld` (their components remove their own block on unmount;
 *    listing them here would clear live blocks that an effect just added).
 */
export const ROUTE_JSON_LD_IDS = [
  'catalog-jsonld',
  'catalog-jsonld-prerender',
  'product-schema-jsonld',
  'product-jsonld-prerender',
  'blog-posting-jsonld-prerender',
] as const;

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string): void {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeCanonical(): void {
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

/** Escape '<', '>' and '&' so a title containing '</script' cannot end the block early. */
export function escapeJsonLd(text: string): string {
  return text.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** Drop every route-owned JSON-LD block (see ROUTE_JSON_LD_IDS). */
export function removeRouteJsonLd(): void {
  if (typeof document === 'undefined') return;
  for (const id of ROUTE_JSON_LD_IDS) document.getElementById(id)?.remove();
}

/**
 * Write the whole route head. Previous route JSON-LD is removed first. A page with
 * no canonical (404) has its canonical and og:url removed rather than inherited.
 */
export function applyPageSeo(seo: PageSeo): void {
  if (typeof document === 'undefined') return;
  removeRouteJsonLd();
  const image = seo.image ?? SHARE_IMAGE;
  const ogTitle = seo.ogTitle ?? seo.title;
  const ogDescription = seo.ogDescription ?? seo.description;
  document.title = seo.title;
  setMeta('name', 'description', seo.description);
  setMeta('name', 'robots', seo.robots ?? INDEX_ROBOTS);
  if (seo.canonical) {
    setCanonical(seo.canonical);
    setMeta('property', 'og:url', seo.canonical);
  } else {
    removeCanonical();
    removeMeta('property', 'og:url');
  }
  setMeta('property', 'og:title', ogTitle);
  setMeta('property', 'og:description', ogDescription);
  setMeta('property', 'og:type', seo.ogType ?? 'website');
  setMeta('property', 'og:image', image);
  setMeta('name', 'twitter:title', seo.twitterTitle ?? ogTitle);
  setMeta('name', 'twitter:description', seo.twitterDescription ?? ogDescription);
  setMeta('name', 'twitter:image', image);
}

/** Append one route JSON-LD block; an existing block with the same id is replaced. */
export function setRouteJsonLd(id: string, payload: unknown): void {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.remove();
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = escapeJsonLd(JSON.stringify(payload));
  document.head.appendChild(script);
}

/** Hand the head back to the homepage defaults (the route changed). */
export function resetHeadSeo(): void {
  applyPageSeo(HOME_SEO);
}
