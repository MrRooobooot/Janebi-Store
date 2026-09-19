// Dual-engine prod probe: new Mcdodo PDPs render images (naturalWidth>0), title correct.
import { chromium, webkit } from 'playwright';

const IDS = [5633, 5634, 5635, 5636, 5637, 5638, 5639];
const BASE = 'https://janebiarena.ir';

async function probe(browser, label) {
  const page = await browser.newPage();
  let broken = 0, ok = 0;
  for (const id of IDS) {
    await page.goto(`${BASE}/products/${id}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const title = (await page.locator('h1').first().textContent()) || '';
    await page.waitForSelector('img[src*="ca-"], img[srcset*="ca-"]', { timeout: 15000 }).catch(() => {});
    const imgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter((i) => /ca-\d{4}\.webp/.test(i.currentSrc || i.src))
        .map((i) => i.naturalWidth)
    );
    if (imgs.length && imgs.every((w) => w > 0)) ok++;
    else { broken++; console.log(`[${label}] ${id} IMG FAIL`, title.trim().slice(0, 40), imgs); }
  }
  console.log(`[${label}] OK=${ok} BROKEN=${broken}`);
  await page.close();
}

const c = await chromium.launch();
await probe(c, 'chromium');
await c.close();
const w = await webkit.launch();
await probe(w, 'webkit');
await w.close();
