import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const el = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('دسته‌بندی‌های تخصصی'));
  el?.scrollIntoView({ block:'center' });
});
await page.waitForTimeout(1500);
const cats = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('a[href*="category="]').forEach(a => {
    const txt = a.textContent.replace(/\s+/g,' ').trim();
    if (txt.includes('کالا') && txt.length < 60) out.push(txt);
  });
  return [...new Set(out)];
});
console.log(cats.length ? cats.join(' | ') : 'none found');
await browser.close();
