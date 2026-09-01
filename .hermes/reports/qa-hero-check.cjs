const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://janebiarena.ir', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  const out = await page.evaluate(() => {
    // Find the hero slider: element containing the slide titles from settings
    const h = document.querySelector('h1');
    // Walk imgs and report nearest section h2 or aria/alt
    const imgs = Array.from(document.querySelectorAll('img')).map(i => ({
      src: (i.getAttribute('src') || '').split('?')[0],
      alt: i.alt,
      w: i.clientWidth,
      inHero: !!i.closest('section,div')?.textContent?.includes('هولدرهای مگنتی خودرو') || !!i.closest('[class*="hero"],[class*="slide"]'),
    }));
    return { h1: h && h.textContent.trim().slice(0, 60), imgs: imgs.filter(i => /products\//.test(i.src)) };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
