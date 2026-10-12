import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyCatalogSeo } from '../../src/lib/catalogSeo';
import { CATALOG_HUB_DESCRIPTION, CATALOG_HUB_TITLE, catalogCanonical } from '../../src/lib/catalogCopy';
import { createFakeDocument, installFakeDocument, addShellTag, type FakeDocument } from './fake-document';

// The client listing writer must agree with the server prerender: same title,
// description and canonical in <title>, meta, Open Graph and Twitter.

const HOME_TITLE = 'جانبی آرنا | خرید آنلاین لوازم جانبی موبایل و تبلت با ضمانت اصالت';

let doc: FakeDocument;
let uninstall: () => void;

beforeEach(() => {
  doc = createFakeDocument();
  doc.title = HOME_TITLE;
  addShellTag(doc, 'meta', { name: 'description', content: 'homepage description' });
  addShellTag(doc, 'meta', { property: 'og:title', content: 'homepage og title' });
  addShellTag(doc, 'meta', { property: 'og:description', content: 'homepage og description' });
  addShellTag(doc, 'link', { rel: 'canonical', href: 'https://janebiarena.ir/' });
  uninstall = installFakeDocument(doc);
});

afterEach(() => {
  uninstall();
});

const content = (selector: string) => doc.head.querySelector(selector)?.getAttribute('content');

describe('applyCatalogSeo on the unfiltered hub', () => {
  it('writes the hub title and description to every title and social tag', () => {
    applyCatalogSeo({ itemCount: 45, category: null, brands: [] });
    expect(doc.title).toBe(CATALOG_HUB_TITLE);
    expect(content('meta[name="description"]')).toBe(CATALOG_HUB_DESCRIPTION);
    expect(content('meta[property="og:title"]')).toBe(CATALOG_HUB_TITLE);
    expect(content('meta[property="og:description"]')).toBe(CATALOG_HUB_DESCRIPTION);
    expect(content('meta[name="twitter:title"]')).toBe(CATALOG_HUB_TITLE);
    expect(content('meta[name="twitter:description"]')).toBe(CATALOG_HUB_DESCRIPTION);
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://janebiarena.ir/products');
  });

  it('adds one CollectionPage block whose name and count are the live values', () => {
    applyCatalogSeo({ itemCount: 45, category: null, brands: [] });
    const blocks = doc.headElements.filter((el) => el.attrs.id === 'catalog-jsonld');
    expect(blocks).toHaveLength(1);
    const ld = JSON.parse(blocks[0].textContent);
    expect(ld['@type']).toBe('CollectionPage');
    expect(ld.name).toBe(CATALOG_HUB_TITLE);
    expect(ld.url).toBe('https://janebiarena.ir/products');
    expect(ld.mainEntity.numberOfItems).toBe(45);
  });

  it('applying twice leaves exactly one CollectionPage block', () => {
    applyCatalogSeo({ itemCount: 45, category: null, brands: [] });
    applyCatalogSeo({ itemCount: 45, category: null, brands: [] });
    expect(doc.headElements.filter((el) => el.attrs.id === 'catalog-jsonld')).toHaveLength(1);
  });
});

describe('applyCatalogSeo on a filtered listing', () => {
  it('uses the filtered title and its own canonical in every tag', () => {
    applyCatalogSeo({ itemCount: 7, category: 'کابل و سیم', brands: [] });
    const title = 'خرید کابل و سیم | جانبی آرنا';
    expect(doc.title).toBe(title);
    expect(content('meta[property="og:title"]')).toBe(title);
    expect(content('meta[name="twitter:title"]')).toBe(title);
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      catalogCanonical({ category: 'کابل و سیم', brands: [] })
    );
    expect(content('meta[property="og:url"]')).toBe(catalogCanonical({ category: 'کابل و سیم', brands: [] }));
  });
});
