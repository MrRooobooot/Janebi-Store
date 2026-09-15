// verify 6 new comments on :3978 — mobile 390 + desktop
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:390,height:844} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:20000 }).catch(()=>{});
await page.waitForTimeout(1200);
const out = {};
// C1: mobile slide indicators exist + swipe works
out.mobileDots = await page.evaluate(() => {
  const dots = [...document.querySelectorAll('[role="tablist"][aria-label="اسلایدهای صفحه اصلی"] button')];
  return dots.length;
});
// C2: header buttons have tinted bg
out.headerBtn = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-label="جستجو"]')].find(x => !x.className.includes('absolute'));
  return b ? getComputedStyle(b).backgroundColor : 'none';
});
// C3: promo code chip LTR mono
out.promoChip = await page.evaluate(() => {
  const chip = [...document.querySelectorAll('header span')].find(s => s.textContent.trim() === 'WELCOME10' && s.dir === 'ltr');
  return chip ? { dir: chip.dir, mono: getComputedStyle(chip).fontFamily.includes('mono') } : 'missing';
});
// C5: logo tile gradient
out.logoTile = await page.evaluate(() => {
  const el = document.querySelector('header a[href="/"] > div > div.relative');
  return el ? getComputedStyle(el).backgroundImage.slice(0, 60) : 'none';
});
// C4: footer about/links blocks carded
out.footerCards = await page.evaluate(() => {
  const about = [...document.querySelectorAll('footer div')].find(d => d.className.includes('lg:col-span-4'));
  return about ? getComputedStyle(about).backgroundColor : 'none';
});
// swipe simulation: touch on mobile hero
const h0 = 0;
await page.evaluate(() => {
  const hero = document.querySelector('div[class*="touch-pan-y"]');
  if (!hero) return;
  const t0 = new Touch({ identifier: 1, target: hero, clientX: 300, clientY: 200 });
  hero.dispatchEvent(new TouchEvent('touchstart', { touches: [t0], bubbles: true }));
  const t1 = new Touch({ identifier: 1, target: hero, clientX: 200, clientY: 200 });
  hero.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t1], bubbles: true }));
});
await page.waitForTimeout(500);
out.afterSwipe = await page.evaluate(() => {
  const active = document.querySelector('[role="tablist"][aria-label="اسلایدهای صفحه اصلی"] button[aria-selected="true"]');
  return active ? [...active.parentElement.children].indexOf(active) + 1 : '?';
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
