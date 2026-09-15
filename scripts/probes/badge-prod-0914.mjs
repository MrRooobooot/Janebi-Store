// C1/C8 on prod: badge + price font — add item to cart via UI to surface badge
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(1500);
// click first product card buy button to add to cart
await page.locator('button:has-text("خرید")').first().click().catch(()=>{});
await page.waitForTimeout(1200);
const badge = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="مشاهده سبد خرید"] span.absolute, [aria-label="مشاهده سبد خرید"] .-top-2');
  if (!b) return 'no badge visible';
  const cs = getComputedStyle(b);
  return { text: b.textContent.trim(), mono: cs.fontFamily.includes('mono'), minW: cs.minWidth, clipped: b.scrollWidth > b.clientWidth };
});
// price font on card
const price = await page.evaluate(() => {
  const p = [...document.querySelectorAll('div')].find(d => /^\d/.test(d.textContent.trim()) && d.textContent.includes('تومان') === false && d.className.includes('font-black') && d.className.includes('whitespace-nowrap'));
  return p ? { mono: getComputedStyle(p).fontFamily.includes('mono') } : 'no price el';
});
console.log(JSON.stringify({ badge, price }));
await browser.close();
