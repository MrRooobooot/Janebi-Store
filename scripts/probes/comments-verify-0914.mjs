// verify each in-app comment fix on :3978 (both viewports)
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
const out = {};
await page.goto('http://localhost:3978/', { waitUntil:'networkidle', timeout:20000 }).catch(()=>{});
await page.waitForTimeout(1200);
// C1: cart badge no clip, no font-mono
out.badge = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="مشاهده سبد خرید"] span.absolute');
  if (!b) return 'no badge';
  const cs = getComputedStyle(b);
  return { mono: cs.fontFamily.includes('mono'), w: Math.round(b.getBoundingClientRect().width), fits: b.scrollWidth <= b.clientWidth };
});
// C2/5: hero height stable across slides
const h1 = await page.evaluate(() => document.querySelector('.hero-slide-content')?.closest('section')?.querySelector('.relative.rounded-3xl').getBoundingClientRect().height);
await page.click('button[aria-label="اسلاید بعدی"]').catch(()=>{});
await page.waitForTimeout(700);
const h2 = await page.evaluate(() => document.querySelector('section .relative.rounded-3xl')?.getBoundingClientRect().height);
out.heroHeight = { before: Math.round(h1), after: Math.round(h2), stable: Math.abs(h1-h2) < 2 };
// C3: arrows vs text col — measure overlap of left arrow with text column
out.arrowOverlap = await page.evaluate(() => {
  const arrow = document.querySelector('button[aria-label="اسلاید بعدی"]');
  const h1 = document.querySelector('h1');
  if (!arrow || !h1) return 'n/a';
  const a = arrow.getBoundingClientRect(), t = h1.getBoundingClientRect();
  const xOverlap = Math.max(0, Math.min(a.right, t.right) - Math.max(a.left, t.left));
  return { overlapPx: Math.round(xOverlap) };
});
// C9: tabs are pills now
out.tabs = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'همه محصولات');
  return btn ? { radius: getComputedStyle(btn).borderRadius, pressed: btn.getAttribute('aria-pressed') } : 'not found';
});
// C12: compare button gone from header
out.compareGone = await page.evaluate(() => !document.querySelector('a[aria-label="مشاهده لیست مقایسه کالاها"]'));
// C13: mobile drawer last link spans 2 cols when odd count
await page.setViewportSize({ width: 390, height: 844 });
await page.click('button[aria-label="باز کردن منو"]').catch(()=>{});
await page.waitForTimeout(600);
out.drawer = await page.evaluate(() => {
  const links = [...document.querySelectorAll('div.grid.grid-cols-2 > a')];
  const last = links[links.length-1];
  return { count: links.length, lastSpans2: last ? last.className.includes('col-span-2') : null };
});
// C10: footer order link target
out.footerLink = await page.evaluate(() => document.querySelector('footer a[href*="profile"]')?.getAttribute('href'));
// C11: 4th trust tile bg matches siblings
out.trustTile = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('footer .grid.grid-cols-2 > div')];
  const bgs = tiles.slice(0,4).map(t => getComputedStyle(t).backgroundColor);
  return { uniform: new Set(bgs).size === 1, bgs };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
