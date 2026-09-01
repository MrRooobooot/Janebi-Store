const { webkit } = require('playwright');
(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 120)));
  // home testimonials
  await page.goto('https://janebiarena.ir', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  const home = await page.evaluate(() => {
    const s = document.querySelector('#latest-reviews-heading');
    const arts = s ? Array.from(s.closest('section').querySelectorAll('article')).map(a => a.innerText.split('\n').filter(Boolean).slice(0, 2)) : null;
    const hasLatinDigitInReviews = s ? /\d/.test(s.closest('section').innerText) : null;
    return { section: !!s, arts, hasLatinDigitInReviews };
  });
  console.log('WEBKIT HOME', JSON.stringify(home));
  // products -> detail
  await page.goto('https://janebiarena.ir/products', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  const link = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(a => /^\/products\/.+/.test(a.getAttribute('href') || ''));
    return a ? a.getAttribute('href') : null;
  });
  console.log('DETAIL LINK', link);
  await page.goto('https://janebiarena.ir' + (link || ''), { waitUntil: 'networkidle', timeout: 60000 });
  const pd = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim().slice(0, 50), url: location.pathname }));
  console.log('WEBKIT PD', JSON.stringify(pd));
  await page.goto('https://janebiarena.ir/cart', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  console.log('WEBKIT CART URL', page.url());
  // filter out enamad
  const nonEnamad = errors.filter(e => !/enamad|408/.test(e) || !/Failed to load resource/.test(e));
  const enamad408 = errors.filter(e => /408/.test(e)).length;
  console.log('WEBKIT ERRORS(non-enamad)', JSON.stringify(nonEnamad), 'enamad408count', enamad408);
  await browser.close();
})();
