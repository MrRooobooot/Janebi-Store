// TEAM-QA regression sweep 2026-09-02: 5 pages, dual engine, DOM size + console errors + broken imgs
const { chromium, webkit } = require('playwright');

const BASE = 'https://janebiarena.ir';
const PAGES = ['/', '/products', '/login', '/cart', '/blog'];
const results = [];

function isIgnorableError(url, text) {
  if (/favicon/i.test(url) || /favicon/i.test(text)) return true;
  if (/google-analytics|googletagmanager|gtag\/js|analytics\.js/i.test(url) || /google-analytics|googletagmanager/i.test(text)) return true;
  if (/\/api\/profile|\/api\/auth\/me|\/api\/cart|\/api\/wishlist|\/api\/orders/.test(url) && /40[13]/.test(text)) return true;
  return false;
}

async function sweep(engineName, engine) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push({ url: page.url(), text: m.text().slice(0, 300) }); });
  page.on('pageerror', e => consoleErrors.push({ url: page.url(), text: 'pageerror: ' + String(e).slice(0, 300) }));
  page.on('response', r => { if (r.status() >= 400) consoleErrors.push({ url: r.url(), text: 'HTTP ' + r.status() }); });

  for (const p of PAGES) {
    consoleErrors.length = 0;
    let ok = true, textLen = 0, imgs = 0, broken = [];
    try {
      await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1500);
      textLen = await page.evaluate(() => document.body.innerText.length);
      if (p === '/products') {
        const r = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src, w: i.naturalWidth })));
        imgs = r.length;
        broken = r.filter(i => i.w === 0).map(i => i.src);
      }
    } catch (e) {
      ok = false;
      consoleErrors.push({ url: BASE + p, text: 'NAV FAIL: ' + String(e).slice(0, 200) });
    }
    const realErrors = consoleErrors.filter(e => !isIgnorableError(e.url, e.text));
    const pass = ok && textLen > 200 && realErrors.length === 0 && (p !== '/products' || imgs === 0 || broken.length === 0);
    results.push({ engine: engineName, page: p, pass, textLen, imgCount: imgs, brokenImgs: broken, realErrors });
    console.log(`${engineName} ${p}: ${pass ? 'PASS' : 'FAIL'} textLen=${textLen} imgs=${imgs} broken=${JSON.stringify(broken)} errors=${JSON.stringify(realErrors)}`);
  }
  await browser.close();
}

(async () => {
  await sweep('chromium', chromium);
  await sweep('webkit', webkit);
  require('fs').writeFileSync(__dirname + '/qa-regression-2026-09-02-results.json', JSON.stringify(results, null, 2));
})();
