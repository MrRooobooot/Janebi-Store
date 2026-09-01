const { chromium, webkit } = require('playwright');
(async () => {
  const res = await fetch('https://janebiarena.ir/api/products');
  const prods = await res.json();
  const id = (Array.isArray(prods) ? prods : prods.data)[0].id;
  console.log('PRODUCT ID', id);
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
    page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 120)));
    await page.goto(`https://janebiarena.ir/products/${id}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const info = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60), url: location.pathname }));
    console.log(name, 'PD', JSON.stringify(info), 'errors', JSON.stringify(errors.filter(e => !/408|enamad/i.test(e))));
    await browser.close();
  }
})();
