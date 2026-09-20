// Live regression probe for the SW stale-while-revalidate scope fix.
//
// public/sw.js used to run stale-while-revalidate on any path starting with
// /api/products — which also matched /api/products/:id/reviews. The refetch that
// runs right after a review POST therefore got the PRE-WRITE cached body, so a
// submitted review only appeared after a manual reload. Reviews must take the
// network-first branch instead: fresh on every read, cache only as an offline
// fallback (a cached copy under the network-first branch is expected and fine).
//
// Asserts, against a live page whose service worker is in control:
//   1. a PDP is controlled by a SW,
//   2. no pre-fix API cache version survives (stale bodies evicted),
//   3. the reviews read goes to the network and answers 200 with the right shape,
//   4. with the network cut, the SW still serves the offline fallback (no regression).
//
// Usage: node scripts/audit/sw-reviews-probe.mjs [baseUrl] [productId]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'https://janebiarena.ir';
const PID = process.argv[3] || '14';
const STALE_API_CACHE = 'janebi-api-v1.2.0';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
let networkReviewHits = 0;
page.on('request', (r) => r.url().includes('/reviews') && networkReviewHits++);

await page.goto(`${BASE}/products/${PID}`, { waitUntil: 'load' });
// The first document load is not controlled until the SW activates; reload until
// it takes charge of the page (clients.claim timing varies between runs).
await page.evaluate(() => navigator.serviceWorker?.ready).catch(() => {});
let controlled = false;
for (let i = 0; i < 3 && !controlled; i++) {
  await page.reload({ waitUntil: 'load' });
  controlled = await page
    .waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
}

const read = () =>
  page.evaluate(async (pid) => {
    const url = `/api/products/${pid}/reviews?page=1&limit=6`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      return { status: res.status, reviews: Array.isArray(body?.reviews) ? body.reviews.length : null };
    } catch (e) {
      return { status: 0, reviews: null, error: String(e) };
    }
  }, PID);

const cacheNames = await page.evaluate(() => caches.keys());
const before = await read();

await ctx.setOffline(true);
const offline = await read();
await ctx.setOffline(false);

const checks = {
  swControlled: controlled,
  staleApiCacheGone: !cacheNames.includes(STALE_API_CACHE),
  reviewsOnline200: before.status === 200 && before.reviews !== null,
  reviewsHitNetwork: networkReviewHits > 0,
  offlineFallbackServed: offline.status === 200,
};

console.log(JSON.stringify({ cacheNames, before, offline, networkReviewHits, checks }, null, 2));
const failed = Object.entries(checks)
  .filter(([, v]) => !v)
  .map(([k]) => k);
console.log(failed.length ? `SW PROBE FAIL: ${failed.join(', ')}` : 'SW PROBE PASS');
await browser.close();
process.exit(failed.length ? 1 : 0);
