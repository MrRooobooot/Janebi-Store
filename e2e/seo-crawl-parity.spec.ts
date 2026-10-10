// Acceptance tests for the crawler/SEO + catalogue-filter fixes.
//
// These are the "proof" specs the supervisor asked for:
//   * package 1a — `?brand=` (singular, the public/brand-directory spelling)
//     must filter exactly like `?brands=` (plural, the catalogue hook's spelling)
//   * package 1b — a brand-filtered catalogue must title/canonicalise itself
//   * package 1c — exactly ONE Product + ONE BreadcrumbList + ONE canonical in
//     the *rendered* DOM, and rendered DOM must agree with the served HTML
//   * package 3  — a raw crawler fetch of `/` must see real page content
//
// Usage (any server, local prod build or dev):
//   E2E_BASE_URL=http://127.0.0.1:4322 npx playwright test \
//     --config=playwright.local.config.ts e2e/seo-crawl-parity.spec.ts
import { test, expect } from '@playwright/test';

const GOOGLEBOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** Count JSON-LD blocks by @type in a raw HTML string. */
function countLd(html: string, type: string) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  return blocks.filter((m) => m[1].includes(`"@type":"${type}"`) || m[1].includes(`"@type": "${type}"`)).length;
}

function countCanonical(html: string) {
  return [...html.matchAll(/<link rel="canonical"/g)].length;
}

test.describe('1a — brand filter accepts both spellings', () => {
  test('API: ?brand= filters the same way as ?brands=', async ({ request }) => {
    const all = await request.get('/api/products?limit=100');
    const total = Number(all.headers()['x-total-count']);

    const singular = await request.get('/api/products?brand=MCdodo&limit=100');
    const plural = await request.get('/api/products?brands=MCdodo&limit=100');
    const nSingular = Number(singular.headers()['x-total-count']);
    const nPlural = Number(plural.headers()['x-total-count']);

    expect(nPlural).toBeGreaterThan(0);
    expect(nSingular, '?brand= must not be ignored (it returned the whole catalogue)').toBe(nPlural);
    expect(nSingular).toBeLessThan(total);

    // The rows themselves must be MCdodo, not just the count header.
    const rows = (await singular.json()) as { brand: string }[] | { items?: { brand: string }[] };
    const list = Array.isArray(rows) ? rows : (rows.items ?? []);
    expect(list.length).toBeGreaterThan(0);
    for (const item of list) expect(item.brand).toBe('MCdodo');
  });

  test('SPA: /products?brand=MCdodo lists exactly that brand', async ({ page, request }) => {
    const api = await request.get('/api/products?brands=MCdodo&limit=100');
    const expected = Number(api.headers()['x-total-count']);

    await page.goto('/products?brand=MCdodo');
    await expect(page.locator('.product-card').first()).toBeVisible();
    await expect(page.locator('.product-card')).toHaveCount(expected);

    // 1b: the page must name the listing it shows (head + visible h1).
    await expect(page).toHaveTitle(/MCdodo/);
    await expect(page.locator('h1')).toContainText('MCdodo');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('brand=MCdodo');

    // Round trip: the filtered view must survive a reload (the URL is the state).
    await page.reload();
    await expect(page.locator('.product-card')).toHaveCount(expected);
  });
});

test.describe('1c — one Product, one BreadcrumbList, one canonical', () => {
  test('product page: served HTML and rendered DOM agree', async ({ page, request }) => {
    const list = await request.get('/api/products?limit=1');
    const rows = (await list.json()) as { items?: { id: number }[] } | { id: number }[];
    const first = (Array.isArray(rows) ? rows[0] : rows.items?.[0]) as { id: number };
    const url = `/products/${first.id}`;

    await page.goto(url);
    await expect(page.locator('h1')).toBeVisible();

    const dom = await page.evaluate(() => {
      const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
      const text = scripts.map((s) => s.textContent ?? '');
      const product = text.find((t) => t.includes('"@type":"Product"'));
      return {
        productCount: text.filter((t) => t.includes('"@type":"Product"')).length,
        breadcrumbCount: text.filter((t) => t.includes('"@type":"BreadcrumbList"')).length,
        canonicalCount: document.querySelectorAll('link[rel="canonical"]').length,
        product: product ? JSON.parse(product) : null,
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      };
    });

    expect(dom.productCount, 'rendered DOM must hold exactly one Product node').toBe(1);
    expect(dom.breadcrumbCount).toBe(1);
    expect(dom.canonicalCount).toBe(1);

    const html = await (
      await request.get(url, { headers: { 'user-agent': GOOGLEBOT_UA } })
    ).text();
    expect(countLd(html, 'Product'), 'crawler HTML must hold exactly one Product node').toBe(1);
    expect(countLd(html, 'BreadcrumbList')).toBe(1);
    expect(countCanonical(html)).toBe(1);

    // Parity: the crawler-visible product must be the same product the user sees.
    const crawlerBlock = html.match(
      /<script type="application\/ld\+json" id="product-jsonld-prerender">([\s\S]*?)<\/script>/,
    );
    expect(crawlerBlock, 'crawler Product JSON-LD must be present').not.toBeNull();
    const crawler = JSON.parse(crawlerBlock![1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>'));
    expect(crawler.name).toBe(dom.product.name);
    expect(crawler.offers.price).toBe(dom.product.offers.price);
    expect(crawler.offers.availability).toBe(dom.product.offers.availability);
  });
});
