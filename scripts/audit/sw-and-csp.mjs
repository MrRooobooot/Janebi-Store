// Service-worker regression probe: no "Response body is already used" clone errors and no
// CSP connect refusals after a SW install + a few navigations (fresh profile per engine).
import { chromium, webkit } from 'playwright';

const BASE = 'https://janebiarena.ir';
const ROUTES = ['/', '/products', '/product/5632'];

async function run(name, launcher) {
  const browser = await launcher.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0, 180)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 180)));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  // wait for the SW to install+activate, then reload so the page is controlled by it
  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.ready;
    return `${reg.active ? 'active' : 'none'} | script=${(reg.active || {}).scriptURL || ''}`;
  });
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1200);
  }
  const caches_ = await page.evaluate(() => (window.caches ? caches.keys() : Promise.resolve([])));
  await browser.close();

  const clone = errors.filter((e) => /clone|already used/i.test(e));
  const csp = errors.filter((e) => /Content Security Policy|Refused to connect|violates/i.test(e));
  return {
    engine: name,
    swState,
    caches: caches_,
    totalErrors: errors.length,
    cloneErrors: clone,
    cspErrors: csp,
    otherErrors: errors.filter((e) => !clone.includes(e) && !csp.includes(e)).slice(0, 6),
  };
}

const [c, w] = await Promise.all([run('chromium', chromium), run('webkit', webkit)]);
const verdict = (r) => (r.cloneErrors.length === 0 && r.cspErrors.length === 0 ? 'PASS' : 'FAIL');
console.log(JSON.stringify({ chromium: { ...c, verdict: verdict(c) }, webkit: { ...w, verdict: verdict(w) } }, null, 1));
