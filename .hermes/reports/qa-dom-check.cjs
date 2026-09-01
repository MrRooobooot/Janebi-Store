const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  let latestBody = null;
  page.on('response', async r => {
    if (r.url().includes('/api/reviews/latest')) {
      try { latestBody = (await r.text()).slice(0, 400); } catch {}
    }
  });
  await page.goto('https://janebiarena.ir', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const out = await page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim());
    const section = document.querySelector('#latest-reviews-heading');
    const reviewsContainer = section ? section.closest('section') : null;
    const articles = reviewsContainer ? Array.from(reviewsContainer.querySelectorAll('article')).map(a => a.innerText.slice(0, 120)) : null;
    // hero: find slider container — look for imgs inside the hero area
    const heroImgs = Array.from(document.querySelectorAll('img'))
      .filter(i => /products\/(hld|cas|cbl)-/.test(i.getAttribute('src') || ''))
      .map(i => ({ src: i.getAttribute('src'), visible: !!(i.offsetParent || i.getClientRects().length), w: i.clientWidth }));
    return { heading: heading.filter(t => /نظر/.test(t)), sectionExists: !!section, articles, heroImgs, allH2: heading.slice(0, 15) };
  });
  console.log(JSON.stringify({ out, latestBody }, null, 1));
  await browser.close();
})();
