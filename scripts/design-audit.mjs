// GOAL-09012 verification — visual/layout assertions on the catalog page,
// both engines, mobile 390px + desktop 1280px:
// 1. Card CTA never overflows its card (buy button bottom <= card bottom).
// 2. Sidebar last category item clear of the chat FAB (no overlap).
// 3. Hero band subtext contrast >= 4.5:1 (computed from rendered colors).
// 4. Price/CTA baselines aligned within one card (delta <= 2px).
import { chromium, webkit } from '@playwright/test';

const BASE = 'http://127.0.0.1:3977';
const HEADERS = { 'x-forwarded-proto': 'http' };

async function audit(browser, engine, viewport, isDesktop) {
  const ctx = await browser.newContext({ viewport, extraHTTPHeaders: HEADERS });
  const page = await ctx.newPage();
  const consoleIssues = [];
  const host = '127.0.0.1';
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = m.location()?.url || '';
    if (loc && !loc.includes(host)) return; // external-host noise (enamad 408) ≠ app bug
    consoleIssues.push(m.text().slice(0, 120));
  });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes(host)) consoleIssues.push(`HTTP ${r.status}`); });
  await page.goto(BASE + '/products', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);
  // Desktop: emulate the real overlap scenario — user scrolled the page so the
  // sidebar's last filter sits in the FAB's viewport band.
  if (isDesktop) {
    await page.evaluate(() => {
      const aside = document.querySelector('aside');
      const fab = document.querySelector('.fixed.z-50');
      if (aside && fab) {
        const btns = aside.querySelectorAll('button');
        const last = btns[btns.length - 1];
        const lr = last.getBoundingClientRect();
        const fr = fab.getBoundingClientRect();
        window.scrollTo(0, window.scrollY + (lr.bottom - fr.top) + 8);
      }
    });
    await page.waitForTimeout(300);
  }

  const results = await page.evaluate((isDesktop) => {
    const out = { ctaBleed: 0, baselineDelta: 0, fabOverlap: true, subtextContrast: 0, cardCount: 0 };

    // 1+4: CTA inside card bounds + baseline alignment
    const cards = [...document.querySelectorAll('.linear-card')].slice(0, 12);
    out.cardCount = cards.length;
    let maxBleed = 0, maxDelta = 0;
    for (const card of cards) {
      const cr = card.getBoundingClientRect();
      const btn = card.querySelector('button[aria-label*="سبد"]');
      if (btn) {
        const br = btn.getBoundingClientRect();
        if (br.bottom > cr.bottom + 0.5) maxBleed = Math.max(maxBleed, br.bottom - cr.bottom);
        const price = card.querySelector('.font-mono');
        if (price) {
          const d = Math.abs((price.getBoundingClientRect().bottom) - br.bottom);
          maxDelta = Math.max(maxDelta, d);
        }
      }
    }
    out.ctaBleed = maxBleed;
    out.baselineDelta = maxDelta;

    // 2: sidebar last row vs chat fab (desktop only — fab overlaps sidebar on tall lists)
    const fab = document.querySelector('.fixed.z-50');
    const aside = document.querySelector('aside');
    if (fab && aside && isDesktop) {
      const fr = fab.getBoundingClientRect();
      const lastBtn = aside.querySelector('button:last-of-type');
      if (lastBtn) {
        const lr = lastBtn.getBoundingClientRect();
        out.fabOverlap = fr.top < lr.bottom && fr.right > lr.left;
      }
    } else out.fabOverlap = false;

    // 3: hero subtext contrast
    const p = document.querySelector('h1')?.nextElementSibling;
    if (p) {
      const cs = getComputedStyle(p);
      const bgEl = p.closest('div');
      const bg = getComputedStyle(bgEl).backgroundColor;
      const lum = (c) => {
        const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => {
          const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const l1 = lum(cs.color), l2 = lum(bg.startsWith('rgba') && bg.endsWith(', 0)') ? 'rgb(255,255,255)' : bg);
      out.subtextContrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    return out;
  }, isDesktop);

  await ctx.close();
  return { engine, viewport: `${viewport.width}`, ...results, consoleIssues: consoleIssues.length };
}

let pass = true;
const browserW = await webkit.launch();
const browserC = await chromium.launch();
const rows = [
  await audit(browserW, 'webkit', { width: 390, height: 844 }, false),
  await audit(browserW, 'webkit', { width: 1280, height: 800 }, true),
  await audit(browserC, 'chromium', { width: 390, height: 844 }, false),
  await audit(browserC, 'chromium', { width: 1280, height: 800 }, true),
];
await Promise.all([browserW.close(), browserC.close()]);

for (const r of rows) {
  const ok = r.ctaBleed <= 0.5 && r.baselineDelta <= 2 && !r.fabOverlap && r.subtextContrast >= 4.5 && r.consoleIssues === 0;
  if (!ok) pass = false;
  console.log(`${r.engine}/${r.viewport}px | cards:${r.cardCount} bleed:${r.ctaBleed.toFixed(1)}px baselineΔ:${r.baselineDelta.toFixed(1)}px fabOverlap:${r.fabOverlap} contrast:${r.subtextContrast.toFixed(2)}:1 consoleErr:${r.consoleIssues} => ${ok ? 'PASS' : 'FAIL'}`);
}
console.log(pass ? 'DESIGN-AUDIT PASS' : 'DESIGN-AUDIT FAIL');
process.exit(pass ? 0 : 1);
