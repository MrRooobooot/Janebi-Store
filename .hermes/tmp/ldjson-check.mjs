// Validate JSON-LD blocks: index.html static + dynamically injected ones from the live prod DOM.
import { chromium, webkit } from '@playwright/test';

const BASE = 'https://janebiarena.ir';

async function checkLdOnPage(engine, path) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const results = await page.evaluate(() => {
    const out = [];
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { JSON.parse(s.textContent); out.push('VALID'); }
      catch (e) { out.push('INVALID: ' + e.message + ' :: ' + s.textContent.slice(0, 120)); }
    }
    return out;
  });
  console.log(`${engine.name()} ${path}: ${results.length ? results.join(' | ') : 'no ld+json'}`);
  await browser.close();
}

for (const p of ['/', '/products', '/login', '/cart', '/checkout', '/profile?tab=orders']) {
  await checkLdOnPage(chromium, p);
}
await checkLdOnPage(webkit, '/profile?tab=orders');
await checkLdOnPage(webkit, '/');
