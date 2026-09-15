import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:800} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1200);
const r = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="باز کردن منو"], button[aria-label="بستن منو"]');
  const cs = getComputedStyle(b);
  return { cls: b.className.slice(0,80), display: cs.display, visibility: cs.visibility, opacity: cs.opacity, rect: b.getBoundingClientRect().width };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
