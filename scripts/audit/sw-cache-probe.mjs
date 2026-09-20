// Service-worker cache-scope probe: HTML/SPA routes must NEVER be cached cache-first.
//
// Why: public/sw.js branch 1 matched any path starting with /products/ or /brands/ and
// served it cache-first. `/products/<id>` (and /products/<id> PDP links) are SPA
// navigations, so the pre-deploy HTML was pinned in `janebi-static-*` and served
// forever — the "page stays old after deploy" class, invisible until the SW version
// was manually bumped.
//
// Usage: node scripts/audit/sw-cache-probe.mjs            (prod)
//        PROBE_BASE=http://localhost:3999 node scripts/audit/sw-cache-probe.mjs
import { chromium, webkit } from 'playwright';

const BASE = process.env.PROBE_BASE || 'https://janebiarena.ir';
const ROUTES = ['/', '/products', '/products/5632', '/product/5632', '/brands', '/blog'];
const SPA_ROUTE_RE = /^\/(products|product|brands|blog|cart|checkout|wishlist|profile|offers|compare|about|contact|faq|terms|privacy|new-products|login|register)\b/;

async function run(engine, launcher) {
  const browser = await launcher.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    return reg?.active ? `active | ${reg.active.scriptURL}` : 'none';
  }).catch(() => 'error');
  await page.waitForTimeout(1500);

  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }

  const entries = await page.evaluate(async () => {
    const out = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        const res = await cache.match(req);
        out.push({ cache: name, url: req.url, mode: req.mode, type: res?.headers.get('content-type') || '' });
      }
    }
    return out;
  }).catch(() => []);
  await browser.close();

  // A cached HTML response for a SPA route = the stale-page bug.
  const htmlRoutes = entries.filter((e) => {
    if (!/text\/html/i.test(e.type)) return false;
    const p = new URL(e.url).pathname;
    return SPA_ROUTE_RE.test(p) || p === '/';
  });
  return { engine, base: BASE, swState, cachedTotal: entries.length, caches: [...new Set(entries.map((e) => e.cache))], htmlRoutesCached: htmlRoutes, verdict: htmlRoutes.length === 0 ? 'PASS' : 'FAIL' };
}

const results = [];
for (const [name, launcher] of [['chromium', chromium], ['webkit', webkit]]) {
  try { results.push(await run(name, launcher)); } catch (e) { results.push({ engine: name, verdict: 'ERROR', error: String(e).slice(0, 200) }); }
}
const failed = results.filter((r) => r.verdict !== 'PASS');
console.log(JSON.stringify({ base: BASE, results, verdict: failed.length === 0 ? 'PASS' : 'FAIL' }, null, 1));
process.exit(failed.length === 0 ? 0 : 1);
