import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:30000 }).catch(()=>{});
await page.waitForTimeout(2000);
// scroll category section into view
await page.evaluate(() => {
  const el = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('دسته‌بندی‌های تخصصی'));
  el?.scrollIntoView({ block:'center' });
});
await page.waitForTimeout(1500);
const icons = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('a[href*="category="]').forEach(a => {
    const svg = a.querySelector('svg');
    const cls = svg ? [...svg.classList].find(c => c.startsWith('lucide-') && c !== 'lucide-svg') : null;
    const title = a.querySelector('span')?.textContent?.trim();
    if (title && cls) out.push(title + ' → ' + cls.replace('lucide-',''));
  });
  return [...new Set(out)];
});
console.log(icons.length ? icons.join('\n') : 'NO ICONS FOUND — page may still be old bundle');
await browser.close();
