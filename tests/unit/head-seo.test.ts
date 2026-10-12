import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  HOME_SEO,
  ROUTE_JSON_LD_IDS,
  applyPageSeo,
  resetHeadSeo,
  setRouteJsonLd,
} from '../../src/lib/headSeo';
import { applyCatalogSeo } from '../../src/lib/catalogSeo';
import { productSeo } from '../../src/lib/productSeo';
import { CATALOG_HUB_DESCRIPTION, CATALOG_HUB_TITLE } from '../../src/lib/catalogCopy';
import {
  addShellTag,
  createFakeDocument,
  installFakeDocument,
  type FakeDocument,
} from './fake-document';

// Regression guard for the client head writer: what a page leaves behind after a
// navigation must match what the server shell ships for the homepage, and each
// route's own metadata must not survive into the next one.
const INDEX_HTML = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf-8');

/** Every <meta>/<link> in index.html's <head>, as attribute maps. */
function shellTags(): Array<{ tag: 'meta' | 'link'; attrs: Record<string, string> }> {
  const out: Array<{ tag: 'meta' | 'link'; attrs: Record<string, string> }> = [];
  for (const m of INDEX_HTML.matchAll(/<(meta|link)\s+([^>]*?)\/?>/g)) {
    const attrs: Record<string, string> = {};
    for (const a of m[2].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    out.push({ tag: m[1] as 'meta' | 'link', attrs });
  }
  return out;
}

/** The server shell's head: index.html's tags, its <title> and its own JSON-LD block. */
function shellDocument(): FakeDocument {
  const doc = createFakeDocument();
  doc.title = INDEX_HTML.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  for (const { tag, attrs } of shellTags()) addShellTag(doc, tag, attrs);
  const ld = addShellTag(doc, 'script', { type: 'application/ld+json' });
  ld.textContent = '{"@context":"https://schema.org","@graph":[{"@type":"Organization"}]}';
  return doc;
}

const content = (doc: FakeDocument, selector: string) => doc.head.querySelector(selector)?.getAttribute('content');
const canonicalOf = (doc: FakeDocument) => doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
/** Route-owned JSON-LD ids present in <head> (the shell's id-less block is reported as '(shell)'). */
function routeLdIds(doc: FakeDocument): string[] {
  return doc.headElements
    .filter((el) => el.tag === 'script' && el.attrs.type === 'application/ld+json')
    .map((el) => el.attrs.id || '(shell)');
}

let doc: FakeDocument;
let uninstall: () => void;

beforeEach(() => {
  doc = shellDocument();
  uninstall = installFakeDocument(doc);
});

afterEach(() => {
  uninstall();
});

describe('HOME_SEO mirrors the server shell (index.html)', () => {
  it('title, description, canonical and every social tag equal index.html', () => {
    expect(doc.title).toBe(HOME_SEO.title);
    expect(content(doc, 'meta[name="description"]')).toBe(HOME_SEO.description);
    expect(canonicalOf(doc)).toBe(HOME_SEO.canonical);
    expect(content(doc, 'meta[property="og:title"]')).toBe(HOME_SEO.ogTitle);
    expect(content(doc, 'meta[property="og:description"]')).toBe(HOME_SEO.ogDescription);
    expect(content(doc, 'meta[property="og:type"]')).toBe(HOME_SEO.ogType);
    expect(content(doc, 'meta[property="og:image"]')).toBe(HOME_SEO.image);
    expect(content(doc, 'meta[name="twitter:title"]')).toBe(HOME_SEO.twitterTitle);
    expect(content(doc, 'meta[name="twitter:description"]')).toBe(HOME_SEO.twitterDescription);
    expect(content(doc, 'meta[name="twitter:image"]')).toBe(HOME_SEO.image);
  });
});

describe('resetHeadSeo', () => {
  it('returns the head to the homepage values and keeps the shell JSON-LD', () => {
    applyCatalogSeo({ category: 'کابل و سیم', brands: [], itemCount: 2 });
    resetHeadSeo();
    expect(doc.title).toBe(HOME_SEO.title);
    expect(canonicalOf(doc)).toBe(HOME_SEO.canonical);
    expect(content(doc, 'meta[property="og:title"]')).toBe(HOME_SEO.ogTitle);
    expect(routeLdIds(doc)).toEqual(['(shell)']);
  });
});

describe('navigation hand-offs leave no previous route behind', () => {
  it('catalogue listing -> product page -> homepage', () => {
    // Products mounts: listing metadata
    applyCatalogSeo({ category: 'کابل و سیم', brands: [], itemCount: 2 });
    // Products unmounts (the user clicks a product): reset
    resetHeadSeo();
    // ProductDetail loads: its own metadata and Product JSON-LD
    const seo = productSeo({ id: 880001, title: 'کابل تست یک', description: 'توضیح', image: '/images/products/x.jpg' });
    applyPageSeo({ ...seo, ogType: 'product' });
    setRouteJsonLd('product-schema-jsonld', { '@type': 'Product', name: 'کابل تست یک' });
    expect(doc.title).toBe('کابل تست یک | جانبی آرنا');
    expect(canonicalOf(doc)).toBe('https://janebiarena.ir/products/880001');
    expect(content(doc, 'meta[property="og:type"]')).toBe('product');
    expect(routeLdIds(doc)).toEqual(['(shell)', 'product-schema-jsonld']);

    // ProductDetail unmounts (the user clicks the logo): reset
    resetHeadSeo();
    expect(doc.title).toBe(HOME_SEO.title);
    expect(canonicalOf(doc)).toBe(HOME_SEO.canonical);
    expect(content(doc, 'meta[property="og:type"]')).toBe('website');
    expect(content(doc, 'meta[property="og:url"]')).toBe(HOME_SEO.canonical);
    expect(routeLdIds(doc)).toEqual(['(shell)']);
  });

  it('product page -> catalogue hub uses the hub wording, not the product', () => {
    const seo = productSeo({ id: 880003, title: 'هولدر تست', description: null, image: null });
    applyPageSeo({ ...seo, ogType: 'product' });
    setRouteJsonLd('product-schema-jsonld', { '@type': 'Product', name: 'هولدر تست' });
    resetHeadSeo();
    applyCatalogSeo({ itemCount: 3, category: null, brands: [] });
    expect(doc.title).toBe(CATALOG_HUB_TITLE);
    expect(content(doc, 'meta[name="description"]')).toBe(CATALOG_HUB_DESCRIPTION);
    expect(canonicalOf(doc)).toBe('https://janebiarena.ir/products');
    expect(content(doc, 'meta[property="og:type"]')).toBe('website');
    expect(routeLdIds(doc)).toEqual(['(shell)', 'catalog-jsonld']);
  });

  it('a server-injected product JSON-LD is removed when another listing applies', () => {
    // Direct load of /products/:id leaves the server's product block in <head>.
    setRouteJsonLd('product-jsonld-prerender', { '@type': 'Product', name: 'SSR product' });
    applyCatalogSeo({ itemCount: 3, category: null, brands: [] });
    expect(routeLdIds(doc)).toEqual(['(shell)', 'catalog-jsonld']);
  });

  it('setRouteJsonLd replaces a block with the same id rather than adding a second one', () => {
    setRouteJsonLd('product-schema-jsonld', { '@type': 'Product', name: 'first' });
    setRouteJsonLd('product-schema-jsonld', { '@type': 'Product', name: 'second' });
    const blocks = doc.headElements.filter((el) => el.attrs.id === 'product-schema-jsonld');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].textContent).toContain('second');
  });

  it('JSON-LD text cannot close its own script tag', () => {
    setRouteJsonLd('product-schema-jsonld', { '@type': 'Product', name: '</script><b>x' });
    const block = doc.getElementById('product-schema-jsonld');
    expect(block?.textContent).not.toContain('</script>');
    expect(block?.textContent).toContain('\\u003c/script\\u003e');
  });

  it('breadcrumb blocks are owned by DynamicBreadcrumbs, not cleared by page heads', () => {
    expect(ROUTE_JSON_LD_IDS).not.toContain('breadcrumb-jsonld');
    expect(ROUTE_JSON_LD_IDS).not.toContain('breadcrumb-jsonld-prerender');
  });

  it('component-owned blocks survive a reset (the FAQ on the homepage must not be cleared)', () => {
    // FAQ appends its block; Home's mount reset runs after it (children's effects first).
    setRouteJsonLd('faq-page-jsonld', { '@type': 'FAQPage' });
    setRouteJsonLd('related-products-jsonld', { '@type': 'ItemList' });
    resetHeadSeo();
    expect(routeLdIds(doc)).toEqual(['(shell)', 'faq-page-jsonld', 'related-products-jsonld']);
  });
});
