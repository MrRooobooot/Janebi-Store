import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:390,height:844} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.evaluate(() => document.querySelector('footer')?.scrollIntoView());
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const grid = document.querySelector('footer .grid.grid-cols-1');
  if (!grid) return 'no grid';
  const cols = [...grid.children].map(c => {
    const r = c.getBoundingClientRect();
    return { h: Math.round(r.height), text: c.textContent.slice(0, 25) };
  });
  return cols;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
