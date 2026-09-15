import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('http://localhost:3978/products', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const a = document.querySelector('aside.hidden.lg\\:block');
  const badge = a.querySelector('.tabular-nums.min-w-7');
  const brand = a.querySelector('.max-h-80');
  return {
    sidebarH: Math.round(a.getBoundingClientRect().height),
    scrollable: getComputedStyle(a).overflowY === 'auto',
    badgeFix: !!badge,
    brandMaxH: brand ? getComputedStyle(brand).maxHeight : null,
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
