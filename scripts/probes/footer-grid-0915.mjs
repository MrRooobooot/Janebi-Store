import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const grid = document.querySelector('footer .grid.grid-cols-2');
  if (!grid) return 'no grid';
  const tiles = [...grid.children].map(t => {
    const icon = t.querySelector('svg');
    const h3 = t.querySelector('h3');
    const p = t.querySelector('p');
    return {
      h: Math.round(t.getBoundingClientRect().height),
      iconBox: icon ? Math.round(icon.getBoundingClientRect().height) : 0,
      title: h3?.textContent?.trim().slice(0,22),
      descH: p ? Math.round(p.getBoundingClientRect().height) : 0,
    };
  });
  return tiles;
});
console.log(JSON.stringify(r, null, 1));
// sidebar probe
const page2 = await browser.newPage({ viewport:{width:1280,height:900} });
await page2.goto('https://janebiarena.ir/products', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page2.waitForTimeout(1500);
const sb = await page2.evaluate(() => {
  const a = document.querySelector('aside.hidden.lg\\:block');
  if (!a) return 'no aside';
  const sections = [...a.querySelectorAll(':scope > div > div, :scope > div.space-y-7 > *')].map(x => ({ tag: x.tagName, h: Math.round(x.getBoundingClientRect().height) }));
  return { total: Math.round(a.getBoundingClientRect().height), vh: window.innerHeight, sections: sections.slice(0,8) };
});
console.log(JSON.stringify(sb, null, 1));
await browser.close();
