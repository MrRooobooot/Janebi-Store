// recheck product imgs on /products, both engines, longer settle
const { chromium, webkit } = require('playwright');
(async () => {
  for (const [name, eng] of [['chromium', chromium], ['webkit', webkit]]) {
    const b = await eng.launch();
    const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
    await p.goto('https://janebiarena.ir/products', { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(4000);
    const imgs = await p.evaluate(() => Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src.slice(0, 90), w: i.naturalWidth, h: i.naturalHeight, complete: i.complete })));
    console.log(name, JSON.stringify(imgs, null, 1));
    await b.close();
  }
})();
