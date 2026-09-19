#!/usr/bin/env node
const { chromium } = require('playwright');
const PAGES = ['/', '/products', '/product/13', '/product/5596', '/blog', '/cart', '/offers', '/checkout', '/login', '/admin'];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const errs = [], bad = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
    page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).slice(0, 160)));
    page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace('https://janebiarena.ir', '')); });
    let status = 0;
    try {
      const resp = await page.goto('https://janebiarena.ir' + p, { waitUntil: 'networkidle', timeout: 45000 });
      status = resp ? resp.status() : 0;
      await page.waitForTimeout(1500);
    } catch (e) { errs.push('NAV: ' + String(e).slice(0, 120)); }
    const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 90);
    console.log(`\n== ${p} [${status}]`);
    console.log('   text:', body || '(empty)');
    if (errs.length) console.log('   CONSOLE:', [...new Set(errs)].slice(0, 5).join(' | '));
    if (bad.length) console.log('   HTTP>=400:', [...new Set(bad)].slice(0, 6).join(' | '));
    await page.close();
  }
  await b.close();
})();
