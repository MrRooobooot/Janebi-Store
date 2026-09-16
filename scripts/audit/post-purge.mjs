// Post-purge live check: only the real inventory should be listed; pages must render.
import { chromium, webkit } from 'playwright';

const CAT = 'https://janebiarena.ir/products?category=' + encodeURIComponent('هولدر و نگهدارنده');

async function run(name, launcher) {
  const browser = await launcher.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e).slice(0, 120)));
  const out = {};
  for (const [key, url] of [['home', 'https://janebiarena.ir/'], ['products', 'https://janebiarena.ir/products'], ['category', CAT]]) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    out[key] = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('a[href*="/product/"]')].map(a => a.getAttribute('href'));
      const imgs = [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src);
      return {
        productLinks: new Set(cards).size,
        productImgs: imgs.filter(s => s.includes('/images/products/')).length,
        broken: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).length,
        categoriesShown: [...document.querySelectorAll('a[href*="category="]')].map(a => a.textContent.trim()).filter(Boolean).slice(0, 8),
        bodyText: document.body.innerText.slice(0, 120).replace(/\s+/g, ' ')
      };
    });
  }
  await page.goto(CAT, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `/tmp/postpurge-${name}.png` });
  await browser.close();
  return { engine: name, ...out, errs };
}

const [c, w] = await Promise.all([run('chromium', chromium), run('webkit', webkit)]);
console.log(JSON.stringify({ chromium: c, webkit: w }, null, 1));
