import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('http://localhost:3978/', { waitUntil:'networkidle', timeout:20000 }).catch(()=>{});
await page.waitForTimeout(800);
const h = await page.evaluateHandle(() => [...document.querySelectorAll('section')].find(s => s.textContent.includes('دسته‌بندی‌های تخصصی')));
await h.asElement().scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
fs.writeFileSync('/tmp/cats-live.png', await h.asElement().screenshot());
const icons = await page.evaluate(() => {
  return [...document.querySelectorAll('a')].filter(a => a.querySelector('svg') && a.textContent.includes('کالا')).slice(0,20).map(a => {
    const svg = a.querySelector('svg');
    // lucide icons have class like lucide-<name>
    const cls = [...svg.classList].find(c => c.startsWith('lucide-') && !c.startsWith('lucide-svg'));
    const title = a.querySelector('span')?.textContent?.trim();
    return title + ' → ' + cls;
  });
});
console.log(icons.join('\n'));
await browser.close();
