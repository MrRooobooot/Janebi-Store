import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const stack = document.querySelector('section div[class*="sm:grid"]');
  const slide = stack?.children[0];
  return {
    stackCls: stack?.className,
    slideCls: slide?.className?.slice(0, 130),
    slideDisplay: slide ? getComputedStyle(slide).display : null,
    slideChildren: slide ? [...slide.children].map(c => ({ w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height), cls: c.className.slice(0, 70) })) : null,
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
