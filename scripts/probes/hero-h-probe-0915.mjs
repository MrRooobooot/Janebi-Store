import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('http://localhost:3978/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const box = document.querySelector('section .relative.rounded-3xl');
  const stack = box?.querySelector('.hidden.sm\\:grid');
  const slides = stack ? [...stack.children].map(c => Math.round(c.getBoundingClientRect().height)) : [];
  const vis = stack ? [...stack.children].map(c => getComputedStyle(c).visibility) : [];
  return { boxH: Math.round(box?.getBoundingClientRect().height||0), slideHeights: slides, vis };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
