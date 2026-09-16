// One-off prod sweep: after tightening CSP img-src (no http:) prove that real
// engines on the live site emit ZERO securitypolicyviolation events and load
// every image. Chromium + WebKit, text-only assertions (no screenshots).
import { chromium, webkit } from '@playwright/test';

const BASE = process.env.SWEEP_BASE || 'https://janebiarena.ir';
const ROUTES = ['/', '/products', '/cart', '/checkout', '/blog', '/login'];

const list = await fetch(`${BASE}/api/products?limit=3`).then((r) => r.json()).catch(() => null);
const items = Array.isArray(list) ? list : list?.products || list?.items || [];
const first = items[0];
if (first) ROUTES.push(`/product/${first.slug || first.id}`);

const init = () => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__csp.push(`${e.violatedDirective} :: ${e.blockedURI}`);
  });
};

const out = {};
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  const failedImg = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'image' && r.status() >= 400) failedImg.push(`${r.status()} ${r.url()}`);
  });
  await page.addInitScript(init);
  const per = {};
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => {
      per[route] = [`NAV FAIL ${e.message.split('\n')[0]}`];
    });
    await page.waitForTimeout(700);
    const v = await page.evaluate(
      () => ({
        csp: window.__csp || [],
        broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
        imgs: document.images.length,
      })
    );
    per[route] = per[route] || { csp: [...new Set(v.csp)], brokenImgs: v.broken.length, imgs: v.imgs };
  }
  out[name] = { routes: per, failedImageResponses: [...new Set(failedImg)] };
  await browser.close();
}
console.log(JSON.stringify(out, null, 1));
const bad = Object.values(out).some(
  (b) =>
    Object.values(b.routes).some((r) => Array.isArray(r) || r.csp?.length || r.brokenImgs) || b.failedImageResponses.length
);
console.log(bad ? 'SWEEP: VIOLATIONS FOUND' : 'SWEEP: CLEAN (0 CSP violations, 0 broken images)');
