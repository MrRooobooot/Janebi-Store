// Route-level SEO in the live DOM: direct loads and in-app navigation.
//
// Crawlers read the server HTML (covered by tests/unit/catalog-seo*.test.ts);
// this spec checks what a rendered browser holds after the SPA moves between
// the homepage, the catalogue, a filtered listing and a product page. Metadata
// from the previous route must not survive a navigation.
//
// Needs a running server with at least one active product:
//   E2E_BASE_URL=http://127.0.0.1:4322 npx playwright test \
//     --config=playwright.local.config.ts e2e/route-seo.spec.ts
import { test, expect, type Page } from '@playwright/test';

// Installed Chrome: the bundled Playwright browser is not part of this repo's setup.
test.use({ channel: 'chrome' });

const HOME_TITLE = 'جانبی آرنا | خرید آنلاین لوازم جانبی موبایل و تبلت با ضمانت اصالت';
const HOME_OG_TITLE = 'جانبی آرنا | خرید آنلاین لوازم جانبی موبایل با ضمانت اصالت';
const HUB_TITLE = 'همه محصولات لوازم جانبی | جانبی آرنا';
const SITE = 'https://janebiarena.ir';

interface Head {
  title: string;
  description: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogType: string | null;
  ogUrl: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  ldTypes: string[];
}

/** What the rendered DOM holds right now (after hydration and any SPA navigation). */
async function domHead(page: Page): Promise<Head> {
  return page.evaluate(() => {
    const meta = (sel: string) => document.head.querySelector(sel)?.getAttribute('content') ?? null;
    const ldTypes = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try {
        const parsed = JSON.parse(s.textContent || '');
        return (parsed['@type'] as string | undefined) ?? (parsed['@graph'] ? 'graph' : 'unknown');
      } catch {
        return 'invalid';
      }
    });
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      ogType: meta('meta[property="og:type"]'),
      ogUrl: meta('meta[property="og:url"]'),
      twitterTitle: meta('meta[name="twitter:title"]'),
      twitterDescription: meta('meta[name="twitter:description"]'),
      ldTypes,
    };
  });
}

async function firstActiveProductId(request: import('@playwright/test').APIRequestContext) {
  const res = await request.get('/api/products?limit=5');
  const list = (await res.json()) as Array<{ id: number; title: string }>;
  expect(list.length, 'server needs at least one active product').toBeGreaterThan(0);
  return list[0];
}

test.describe('direct loads', () => {
  test('catalogue hub has its own title, description and one CollectionPage', async ({ page }) => {
    await page.goto('/products');
    await expect.poll(() => domHead(page)).toMatchObject({ title: HUB_TITLE, canonical: `${SITE}/products` });
    const head = await domHead(page);
    expect(head.description).not.toBe(null);
    expect(head.description).not.toBe(await homeDescription(page));
    expect(head.ldTypes.filter((t) => t === 'CollectionPage')).toHaveLength(1);
    expect(head.ldTypes).not.toContain('Product');
  });

  test('product page has its own title, canonical, og:type and one Product', async ({ page, request }) => {
    const product = await firstActiveProductId(request);
    await page.goto(`/products/${product.id}`);
    const expectedTitle = `${product.title} | جانبی آرنا`;
    await expect.poll(() => domHead(page)).toMatchObject({
      title: expectedTitle,
      canonical: `${SITE}/products/${product.id}`,
      ogType: 'product',
      ogUrl: `${SITE}/products/${product.id}`,
    });
    const head = await domHead(page);
    expect(head.ldTypes.filter((t) => t === 'Product')).toHaveLength(1);
    expect(head.ldTypes).not.toContain('CollectionPage');
  });

  test('homepage keeps its own head and the FAQ JSON-LD it renders', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => domHead(page)).toMatchObject({ title: HOME_TITLE, canonical: `${SITE}/`, ogType: 'website' });
    const head = await domHead(page);
    expect(head.ogTitle).toBe(HOME_OG_TITLE);
    expect(head.twitterTitle).toBe(HOME_OG_TITLE);
    expect(head.ldTypes.filter((t) => t === 'FAQPage')).toHaveLength(1);
  });

  test('og and twitter titles agree with <title> on the catalogue and product pages', async ({ page, request }) => {
    await page.goto('/products');
    await expect.poll(() => domHead(page)).toMatchObject({ title: HUB_TITLE });
    let head = await domHead(page);
    expect(head.ogTitle).toBe(HUB_TITLE);
    expect(head.twitterTitle).toBe(HUB_TITLE);
    expect(head.twitterDescription).toBe(head.description);

    const product = await firstActiveProductId(request);
    await page.goto(`/products/${product.id}`);
    await expect.poll(() => domHead(page)).toMatchObject({ title: `${product.title} | جانبی آرنا` });
    head = await domHead(page);
    expect(head.ogTitle).toBe(`${product.title} | جانبی آرنا`);
    expect(head.twitterTitle).toBe(`${product.title} | جانبی آرنا`);
  });
});

test.describe('in-app navigation', () => {
  test('moving from the catalogue to a product and back leaves no stale metadata', async ({ page, request }) => {
    const product = await firstActiveProductId(request);

    await page.goto('/');
    await expect.poll(() => domHead(page)).toMatchObject({ title: HOME_TITLE, canonical: `${SITE}/` });
    const homeDesc = (await domHead(page)).description;

    // Home -> catalogue (client-side link in the header)
    await page.locator('a[href="/products"]').first().click();
    await expect(page).toHaveURL(/\/products$/);
    await expect.poll(() => domHead(page)).toMatchObject({ title: HUB_TITLE, canonical: `${SITE}/products` });

    // Catalogue -> product page (card links use the /product/:id alias)
    await page.locator(`a[href="/product/${product.id}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/product/${product.id}$`));
    await expect.poll(() => domHead(page)).toMatchObject({
      title: `${product.title} | جانبی آرنا`,
      canonical: `${SITE}/products/${product.id}`,
      ogType: 'product',
    });
    let head = await domHead(page);
    expect(head.ldTypes).not.toContain('CollectionPage');
    expect(head.ldTypes.filter((t) => t === 'Product')).toHaveLength(1);

    // Product page -> homepage: nothing from the product survives
    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL(`${new URL(page.url()).origin}/`);
    await expect.poll(() => domHead(page)).toMatchObject({ title: HOME_TITLE, canonical: `${SITE}/`, ogType: 'website' });
    head = await domHead(page);
    expect(head.ogTitle).toBe(HOME_OG_TITLE);
    expect(head.description).toBe(homeDesc);
    expect(head.ldTypes).not.toContain('Product');
    expect(head.ldTypes).not.toContain('CollectionPage');
    // the homepage's own FAQ block is back after the round trip
    expect(head.ldTypes.filter((t) => t === 'FAQPage')).toHaveLength(1);
  });

  test('product -> related product replaces the Product JSON-LD and canonical', async ({ page, request }) => {
    const list = (await (await request.get('/api/products?limit=50')).json()) as Array<{ id: number; category: string }>;
    // A pair of products in one category, so RelatedProducts links one to the other.
    const pair = list.flatMap((a) => list.filter((b) => b.id !== a.id && b.category === a.category).map((b) => [a, b] as const))[0];
    test.skip(!pair, 'needs two active products in one category to link between');
    const [first, sameCategory] = pair!;

    await page.goto(`/products/${first.id}`);
    await expect.poll(() => domHead(page)).toMatchObject({ canonical: `${SITE}/products/${first.id}` });

    // RelatedProducts card links use the /product/:id alias
    await page.locator(`a[href="/product/${sameCategory.id}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/product/${sameCategory.id}$`));
    await expect.poll(() => domHead(page)).toMatchObject({ canonical: `${SITE}/products/${sameCategory.id}` });
    const head = await domHead(page);
    expect(head.ldTypes.filter((t) => t === 'Product')).toHaveLength(1);
    // RelatedProducts' own ItemList may be present, but never twice
    expect(head.ldTypes.filter((t) => t === 'ItemList').length).toBeLessThanOrEqual(1);
  });

  test('a filtered catalogue listing does not leak into the homepage', async ({ page }) => {
    await page.goto('/products');
    const filtered = page.locator('a[href*="/products?category="]').first();
    await filtered.click();
    await expect(page).toHaveURL(/\/products\?category=/);
    await expect.poll(() => domHead(page)).toMatchObject({ canonical: expect.stringContaining(`${SITE}/products?category=`) });
    const filteredHead = await domHead(page);
    expect(filteredHead.title).toMatch(/^خرید .+ \| جانبی آرنا$/);
    expect(filteredHead.ldTypes.filter((t) => t === 'CollectionPage')).toHaveLength(1);

    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL(`${new URL(page.url()).origin}/`);
    await expect.poll(() => domHead(page)).toMatchObject({ title: HOME_TITLE, canonical: `${SITE}/` });
    const head = await domHead(page);
    expect(head.ldTypes).not.toContain('CollectionPage');
    expect(head.ogUrl).toBe(`${SITE}/`);
  });
});

/** Description of the homepage as the shell ships it (fetched fresh, not cached). */
async function homeDescription(page: Page): Promise<string | null> {
  const html = await (await page.request.get('/')).text();
  return html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? null;
}
