// Live probe: hero section must show REAL product cards (photo + title + price), not demo art.
// Desktop 1280 (light + dark) and mobile 390, Chromium + WebKit.
import { chromium, webkit } from 'playwright';

const URL = 'https://janebiarena.ir/';

async function hero(page) {
  return page.evaluate(() => {
    const section = document.querySelector('section');
    const links = [...section.querySelectorAll('a[href^="/product/"]')];
    return {
      cards: links.length,
      withImage: links.filter(a => a.querySelector('img')).length,
      realImages: links.map(a => (a.querySelector('img') || {}).src || '').filter(s => s.includes('ear-') || s.includes('/images/products/')),
      broken: links.filter(a => { const i = a.querySelector('img'); return i && i.complete && i.naturalWidth === 0; }).length,
      prices: links.map(a => (a.textContent.match(/[\u06F0-\u06F9\d][\u06F0-\u06F9\d,٬]*\s*تومان/) || [''])[0]).filter(Boolean),
      svgFallbackTiles: section.querySelectorAll('.hero-visual-tile').length,
      slideCount: section.querySelectorAll('[role="tab"]').length,
      heroText: section.querySelector('h1') ? section.querySelector('h1').textContent.trim().slice(0, 60) : null,
      tabTexts: [...section.querySelectorAll('[role="tab"]')].map(b => b.getAttribute('aria-label')), heroCardHrefs: links.map(a => a.getAttribute('href')),
    };
  });
}

async function run(name, launcher) {
  const browser = await launcher.launch();
  const out = {};
  for (const [label, vp, dark] of [['desktop-light', { width: 1280, height: 900 }, false], ['desktop-dark', { width: 1280, height: 900 }, true], ['mobile', { width: 390, height: 844 }, false]]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: dark ? 'dark' : 'light' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2500);
    out[label] = await hero(page);
    out[label].errs = errs;
    if (label === 'desktop-light' || label === 'mobile') {
      await page.screenshot({ path: `/tmp/hero-cards-${label}-${name}.png`, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 900) } });
    }
    await ctx.close();
  }
  await browser.close();
  return { engine: name, ...out };
}

const [c, w] = await Promise.all([run('chromium', chromium), run('webkit', webkit)]);
console.log(JSON.stringify({ chromium: c, webkit: w }, null, 1));
