// Route-level SEO coverage in a real browser: every public static route on a direct
// load, in-app navigation between owners, the catalogue count, blog articles, and 404s.
//
// Expected values come from the route registry (src/lib/routeSeo.ts), so the browser
// and the server render the same copy. Needs a running server with at least one active
// product and one published blog post:
//   E2E_BASE_URL=http://127.0.0.1:4322 npx playwright test \
//     --config=playwright.local.config.ts e2e/route-seo-coverage.spec.ts
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { matchRoute, NOT_FOUND_SEO, HOME_SEO, staticRoutePaths } from '../src/lib/routeSeo';
import { CATALOG_HUB_TITLE } from '../src/lib/catalogCopy';

// Installed Chrome: the bundled Playwright browser is not part of this repo's setup.
test.use({ channel: 'chrome' });

const SITE = 'https://janebiarena.ir';

interface Head {
  title: string;
  canonical: string | null;
  robots: string | null;
  ogUrl: string | null;
  ogTitle: string | null;
  twitterTitle: string | null;
  ldTypes: string[];
}

async function domHead(page: Page): Promise<Head> {
  return page.evaluate(() => {
    const meta = (s: string) => document.head.querySelector(s)?.getAttribute('content') ?? null;
    const ldTypes = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try {
        const j = JSON.parse(s.textContent || '');
        return (j['@type'] as string | undefined) ?? (j['@graph'] ? 'graph' : 'unknown');
      } catch {
        return 'invalid';
      }
    });
    return {
      title: document.title,
      canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      robots: meta('meta[name="robots"]'),
      ogUrl: meta('meta[property="og:url"]'),
      ogTitle: meta('meta[property="og:title"]'),
      twitterTitle: meta('meta[name="twitter:title"]'),
      ldTypes,
    };
  });
}

/** In-app navigation: pushState + popstate is what the router listens to. No reload. */
async function goSpa(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

async function products(request: APIRequestContext) {
  const res = await request.get('/api/products?limit=50');
  const list = (await res.json()) as Array<{ id: number; title: string; category: string }>;
  const total = Number(res.headers()['x-total-count'] ?? list.length);
  return { list, total };
}

/** Expected head for a static route, from the registry. */
function expectedStatic(path: string) {
  const m = matchRoute(path);
  if (m.kind !== 'static') throw new Error(`${path} is not a static route`);
  return m.seo;
}

test.describe('direct load: every static route carries its own head', () => {
  // Checkout callback redirects to '/' without query parameters, so it is covered by the
  // server unit tests instead. Admin needs a session, so it is covered there too.
  const routes = staticRoutePaths().filter((p) => p !== '/checkout/callback');

  for (const path of routes) {
    test(`${path}`, async ({ page }) => {
      const seo = expectedStatic(path);
      await page.goto(path);
      await expect.poll(() => domHead(page)).toMatchObject({ title: seo.title, canonical: seo.canonical });
      const head = await domHead(page);
      expect(head.robots).toBe(seo.robots);
      expect(head.ogUrl).toBe(seo.canonical);
      expect(head.ogTitle).toBe(seo.ogTitle ?? seo.title);
      expect(head.twitterTitle).toBe(seo.twitterTitle ?? seo.ogTitle ?? seo.title);
    });
  }

  test('the homepage keeps the shell head', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => domHead(page)).toMatchObject({ title: HOME_SEO.title, canonical: `${SITE}/` });
    const head = await domHead(page);
    expect(head.ogTitle).toBe(HOME_SEO.ogTitle);
    expect(head.twitterTitle).toBe(HOME_SEO.twitterTitle);
  });
});

test.describe('in-app navigation: no head survives a route change', () => {
  test('a walk across owners leaves only the current route\'s head', async ({ page, request }) => {
    const { list } = await products(request);
    const product = list[0];
    const cat = list.find((p) => p.category)?.category ?? 'کابل و سیم';

    await page.goto('/products');
    await expect.poll(() => domHead(page)).toMatchObject({ title: CATALOG_HUB_TITLE });

    await goSpa(page, '/cart');
    await expect.poll(() => domHead(page)).toMatchObject({ title: expectedStatic('/cart').title, robots: 'noindex, nofollow' });

    await goSpa(page, '/about');
    await expect.poll(() => domHead(page)).toMatchObject({ title: expectedStatic('/about').title, canonical: `${SITE}/about` });

    await goSpa(page, `/products/${product.id}`);
    await expect.poll(() => domHead(page)).toMatchObject({ title: `${product.title} | جانبی آرنا`, canonical: `${SITE}/products/${product.id}` });
    let head = await domHead(page);
    expect(head.ldTypes).not.toContain('CollectionPage');

    await goSpa(page, `/products?category=${encodeURIComponent(cat)}`);
    await expect.poll(() => domHead(page)).toMatchObject({ title: `خرید ${cat} | جانبی آرنا`, canonical: expect.stringContaining('/products?category=') });
    head = await domHead(page);
    expect(head.ldTypes).not.toContain('Product');
    expect(head.ldTypes.filter((t) => t === 'CollectionPage')).toHaveLength(1);

    await goSpa(page, '/blog');
    await expect.poll(() => domHead(page)).toMatchObject({ title: expectedStatic('/blog').title, canonical: `${SITE}/blog` });
    head = await domHead(page);
    expect(head.ldTypes).not.toContain('CollectionPage');

    await goSpa(page, '/');
    await expect.poll(() => domHead(page)).toMatchObject({ title: HOME_SEO.title, canonical: `${SITE}/`, robots: 'index, follow' });
    head = await domHead(page);
    expect(head.ldTypes).not.toContain('Product');
    expect(head.ldTypes).not.toContain('CollectionPage');
    expect(head.ldTypes).not.toContain('BlogPosting');
  });
});

test.describe('catalogue count', () => {
  test('every published numberOfItems equals the live total, never a placeholder', async ({ page, request }) => {
    const { total } = await products(request);
    await page.addInitScript(() => {
      const w = window as unknown as { __counts: string[] };
      w.__counts = [];
      const record = () => {
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
          const m = (s.textContent || '').match(/"numberOfItems":\s*(\d+)/);
          if (m) w.__counts.push(m[1]);
        }
      };
      new MutationObserver(record).observe(document, { childList: true, subtree: true, characterData: true });
      record();
    });
    await page.goto('/products');
    await expect.poll(() => domHead(page)).toMatchObject({ title: CATALOG_HUB_TITLE });
    await page.waitForTimeout(1500);
    const counts = await page.evaluate(() => (window as unknown as { __counts: string[] }).__counts);
    expect(counts.length).toBeGreaterThan(0);
    for (const c of counts) expect(Number(c)).toBe(total);
  });
});

test.describe('blog article', () => {
  test('a direct load has exactly one BlogPosting and one BreadcrumbList with the post title', async ({ page, request }) => {
    const rows = (await (await request.get('/api/blog')).json()) as Array<{ id: string; title: string }>;
    test.skip(rows.length === 0, 'needs a published blog post');
    const post = rows[0];
    await page.goto(`/blog/${encodeURIComponent(post.id)}`);
    await expect.poll(() => domHead(page)).toMatchObject({ title: `${post.title} | مجله جانبی آرنا` });
    await expect.poll(async () => (await domHead(page)).ldTypes.filter((t) => t === 'BlogPosting').length).toBe(1);
    const head = await domHead(page);
    expect(head.ldTypes.filter((t) => t === 'BreadcrumbList')).toHaveLength(1);
    expect(head.canonical).toBe(`${SITE}/blog/${encodeURIComponent(post.id)}`);
  });
});

test.describe('unknown URLs', () => {
  test('answer 404 with the not-found head and no canonical', async ({ page, request }) => {
    const res = await request.get('/nonexistent-page-coverage-xyz');
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toContain(`<title>${NOT_FOUND_SEO.title}</title>`);
    expect(html).not.toContain('rel="canonical"');

    await page.goto('/nonexistent-page-coverage-xyz');
    await expect.poll(() => domHead(page)).toMatchObject({ title: NOT_FOUND_SEO.title, canonical: null, robots: 'noindex, nofollow' });
  });

  test('an unknown article URL is a 404, not a soft 404', async ({ request }) => {
    const res = await request.get('/blog/this-article-does-not-exist-coverage-xyz');
    expect(res.status()).toBe(404);
  });
});

test.describe('internal search results', () => {
  test('a catalogue search is noindex', async ({ page }) => {
    await page.goto('/products?search=coverage');
    await expect.poll(() => domHead(page)).toMatchObject({ robots: 'noindex, nofollow' });
  });
});
