import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:390,height:844} });
await page.goto('http://localhost:3978/', { waitUntil:'networkidle', timeout:20000 }).catch(()=>{});
await page.waitForTimeout(1000);
const r = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="جستجو"]');
  const cs = getComputedStyle(b);
  return { cls: b.className.slice(0, 120), bg: cs.backgroundColor };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
