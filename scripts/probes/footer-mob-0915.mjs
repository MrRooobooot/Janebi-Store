// C2 said sizes/placement untidy — probe MOBILE footer grid (grid-cols-2 at 390px)
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:390,height:844} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const grid = document.querySelector('footer .grid.grid-cols-2');
  const tiles = [...grid.children].map(t => ({ h: Math.round(t.getBoundingClientRect().height), desc: t.querySelector('p')?.getBoundingClientRect().height }));
  // newsletter + enamad heights
  const nl = document.querySelector('footer .grid.grid-cols-1')?.children;
  return { tiles, cols: nl ? [...nl].map(c=>Math.round(c.getBoundingClientRect().height)) : null };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
