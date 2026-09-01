// TEAM-QA sweep: hero images + testimonials + console errors, Chromium & WebKit
const { chromium, webkit } = require('playwright');
const fs = require('fs');

const BASE = 'https://janebiarena.ir';
const results = [];

async function sweep(engineName, engine) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`[${page.url()}] ${m.text().slice(0, 200)}`); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror ${page.url()}] ${String(e).slice(0, 200)}`));
  let reviewApiCount = null;
  page.on('response', async r => {
    if (r.url().includes('/api/reviews/latest')) {
      try { const j = await r.json(); reviewApiCount = (j.data || j || []).length; } catch {}
    }
  });

  const info = { engine: engineName, consoleErrors: [], findings: {} };
  const log = (k, v) => { info.findings[k] = v; console.log(`${engineName} ${k}: ${typeof v === 'object' ? JSON.stringify(v).slice(0, 300) : v}`); };

  // Home
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  // Testimonials section
  const section = page.locator('section:has-text("نظرات"), div:has-text("آخرین نظرات")').first();
  const reviews = page.locator('[data-testid], article, .review').filter({ hasText: 'محمد حسینی' }).count();
  await page.waitForTimeout(1500);
  const bodyText = await page.evaluate(() => document.body.innerText);
  log('testimonials section visible', {
    hasUserName: bodyText.includes('محمد حسینی'),
    hasSecond: bodyText.includes('سارا احمدی'),
    hasPersianDate: /روز پیش|هفته پیش/.test(bodyText),
    reviewApiCount,
    fabricatedThird: bodyText.includes('rev-103') || bodyText.includes('علی رضایی'),
  });
  // screenshot for evidence
  await page.screenshot({ path: `.hermes/reports/home-${engineName}.png`, fullPage: false });

  // Hero images
  await page.waitForTimeout(1000);
  const heroImgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).filter(i => /products\/(hld|cas|cbl)-/.test(i.src)).map(i => ({ src: i.src, visible: !!(i.offsetParent || i.getClientRects().length) }));
  });
  log('hero imgs', heroImgs);

  // /products
  await page.goto(BASE + '/products', { waitUntil: 'networkidle', timeout: 60000 });
  log('products title', (await page.title()).slice(0, 60));

  // product detail
  const href = await page.evaluate(() => { const a = document.querySelector('a[href^="/products/"]'); return a && a.getAttribute('href'); });
  if (href) {
    await page.goto(BASE + href, { waitUntil: 'networkidle', timeout: 60000 });
    log('product detail loaded', await page.title().then(t => t.slice(0, 60)));
  } else log('product detail loaded', 'NO LINK FOUND');

  // /cart
  await page.goto(BASE + '/cart', { waitUntil: 'networkidle', timeout: 60000 });
  log('cart loaded', await page.title().then(t => t.slice(0, 60)));

  // give lazy stuff a moment
  await page.waitForTimeout(1000);
  info.consoleErrors = consoleErrors;
  log('console errors', consoleErrors);
  results.push(info);
  await browser.close();
}

(async () => {
  await sweep('chromium', chromium);
  await sweep('webkit', webkit);
  fs.writeFileSync('.hermes/reports/qa-sweep-results.json', JSON.stringify(results, null, 2));
})();
