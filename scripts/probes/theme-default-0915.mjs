// تسک: پیشفرض سفید + دارک فقط موبایل
import { chromium } from 'playwright';
const browser = await chromium.launch();
// DESKTOP: no toggle anywhere, default light, localStorage dark still honored (explicit user choice)
const d = await browser.newPage({ viewport:{width:1280,height:900} });
await d.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:20000 }).catch(()=>{});
await d.waitForTimeout(1000);
const desktop = await d.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  toggles: [...document.querySelectorAll('header button')].filter(b => (b.title||'').includes('حالت')).length,
}));
// MOBILE: toggle in drawer works
const m = await browser.newPage({ viewport:{width:390,height:844} });
await m.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:20000 }).catch(()=>{});
await m.waitForTimeout(800);
await m.click('button[aria-label="باز کردن منو"]');
await m.waitForTimeout(500);
const before = await m.evaluate(() => document.documentElement.classList.contains('dark'));
await m.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('حالت شب') || x.textContent.includes('حالت روز'));
  b?.click();
});
await m.waitForTimeout(400);
const after = await m.evaluate(() => document.documentElement.classList.contains('dark'));
console.log(JSON.stringify({
  desktopDefaultDark: desktop.dark,
  desktopToggleCount: desktop.toggles,
  mobileBefore: before, mobileAfterDark: after,
  pass: !desktop.dark && desktop.toggles === 0 && before === false && after === true,
}, null, 1));
await browser.close();
