const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const reqs = [];
  page.on('response', r => { if (r.status() >= 400) reqs.push(r.status() + ' ' + r.url()); });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 150)));
  await page.goto('https://janebiarena.ir', { waitUntil: 'networkidle', timeout: 60000 });
  // wait through slider rotations to catch all 3 slides
  await page.waitForTimeout(14000);
  const slides = await page.evaluate(() => {
    const titles = ['هولدرهای مگنتی خودرو', 'قاب‌های مگ‌سیف', 'کابل‌های کنفی'];
    return titles.map(t => {
      const img = Array.from(document.querySelectorAll('img')).find(i => (i.alt || '').includes(t.split(' ')[0]) && (i.alt || '').includes(t.split(' ')[1] || ''));
      const all = Array.from(document.querySelectorAll('img[alt]')).filter(i => (i.alt || '').includes(t.split(' ').slice(0, 2).join(' '))).map(i => (i.getAttribute('src') || '').split('?')[0]);
      return { t, alts: all.slice(0, 3) };
    });
  });
  console.log('SLIDES', JSON.stringify(slides));
  // product detail: navigate via a product card link
  await page.goto('https://janebiarena.ir/products', { waitUntil: 'networkidle', timeout: 60000 });
  const link = await page.evaluate(() => { const a = document.querySelector('a[href*="/product"]'); return a ? a.getAttribute('href') : null; });
  console.log('PRODUCT LINK', link);
  const pdErrors = [];
  page.on('pageerror', e => pdErrors.push(String(e).slice(0, 150)));
  await page.goto('https://janebiarena.ir' + (link || '/products/1'), { waitUntil: 'networkidle', timeout: 60000 });
  console.log('PD TITLE', (await page.title()).slice(0, 60));
  await page.goto('https://janebiarena.ir/cart', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('CART TITLE', (await page.title()).slice(0, 60));
  console.log('4xx/5xx RESOURCES', JSON.stringify(reqs.slice(0, 10)));
  console.log('CONSOLE ERRORS', JSON.stringify(errors.slice(0, 10)));
  await browser.close();
})();
