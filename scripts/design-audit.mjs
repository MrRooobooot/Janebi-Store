// GOAL-09013 design audit — light AND dark theme, both engines, both viewports.
// Checks per combo:
//  - card CTA stays inside card bounds (bleed = 0)
//  - price/CTA baselines aligned (Δ ≤ 2px)
//  - chat FAB never overlaps the sidebar's last filter (desktop, scrolled)
//  - hero subtext contrast ≥ 4.5:1
//  - NO "stuck" text: every visible text node's computed contrast vs its
//    effective bg ≥ 2.0 (catches navy-on-navy survivors) — sampled, same-host
//  - 0 same-host console errors
import { chromium, webkit } from '@playwright/test';

const BASE = 'http://127.0.0.1:3977';
const HEADERS = { 'x-forwarded-proto': 'http' };

async function audit(browser, engine, viewport, isDesktop, theme) {
  const ctx = await browser.newContext({ viewport, extraHTTPHeaders: HEADERS, colorScheme: theme });
  const page = await ctx.newPage();
  const consoleIssues = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = m.location()?.url || '';
    if (loc && !loc.includes('127.0.0.1')) return;
    consoleIssues.push(m.text().slice(0, 120));
  });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) consoleIssues.push(`HTTP ${r.status}`); });
  await page.goto(BASE + '/products', { waitUntil: 'networkidle', timeout: 30000 });
  // Set theme via localStorage then RELOAD — ThemeContext initializes from
  // localStorage on mount; a manual classList.toggle gets reverted by React.
  await page.evaluate((t) => localStorage.setItem('theme', t), theme);
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
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
    const out = { ctaBleed: 0, baselineDelta: 0, fabOverlap: false, subtextContrast: 0, stuckTexts: [], cardCount: 0 };
    const lum = (c) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      if (m[4] !== undefined && parseFloat(m[4]) === 0) return null; // fully transparent — skip
      const [r, g, b] = [m[1], m[2], m[3]].map(Number).map((v) => {
        const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const effectiveBg = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        const m = bg.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (m && (m[4] === undefined || parseFloat(m[4]) >= 0.1)) {
          // treat near-transparent whites/blacks (alpha < .1 overlays) as pass-through
          return lum(bg);
        }
        n = n.parentElement;
      }
      return lum('rgb(255,255,255)');
    };

    // Cards: bleed + baseline
    const cards = [...document.querySelectorAll('.linear-card')].slice(0, 12);
    out.cardCount = cards.length;
    for (const card of cards) {
      const cr = card.getBoundingClientRect();
      const btn = card.querySelector('button[aria-label*="سبد"]');
      if (btn) {
        const br = btn.getBoundingClientRect();
        if (br.bottom > cr.bottom + 0.5) out.ctaBleed = Math.max(out.ctaBleed, br.bottom - cr.bottom);
        const price = card.querySelector('.font-mono');
        // measure the whole price column (number + تومان unit line) vs button bottom
        const priceCol = price?.parentElement ?? price;
        if (priceCol) out.baselineDelta = Math.max(out.baselineDelta, Math.abs(priceCol.getBoundingClientRect().bottom - br.bottom));
      }
    }

    // FAB overlap
    const fab = document.querySelector('.fixed.z-50');
    const aside = document.querySelector('aside');
    if (fab && aside && isDesktop) {
      const btns = aside.querySelectorAll('button');
      const last = btns[btns.length - 1];
      if (last) {
        const fr = fab.getBoundingClientRect(), lr = last.getBoundingClientRect();
        out.fabOverlap = fr.top < lr.bottom && fr.right > lr.left;
      }
    }

    // Hero subtext contrast
    const p = document.querySelector('h1')?.nextElementSibling;
    if (p) {
      const l1 = lum(getComputedStyle(p).color), l2 = effectiveBg(p);
      if (l1 !== null && l2 !== null) out.subtextContrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    // Stuck-text sweep: sample text-bearing leaf elements, flag contrast < 2.0
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node, sampled = 0;
    const bad = new Map();
    while ((node = walker.nextNode()) && sampled < 400) {
      const hasText = [...node.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
      if (!hasText) continue;
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.3) continue;
      const r = node.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
      const l1 = lum(cs.color), l2 = effectiveBg(node);
      if (l1 === null || l2 === null) continue;
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      sampled++;
      if (ratio < 2.0) {
        const key = `${node.tagName}.${String(node.className).slice(0, 60)}`;
        if (!bad.has(key)) bad.set(key, { ratio: +ratio.toFixed(2), text: node.textContent.trim().slice(0, 30) });
      }
    }
    out.stuckTexts = [...bad.entries()].slice(0, 6).map(([k, v]) => `${k} ratio=${v.ratio} "${v.text}"`);
    return out;
  }, isDesktop);

  await ctx.close();
  return { engine, theme, viewport: viewport.width, ...results, consoleIssues: consoleIssues.length };
}

let pass = true;
const rows = [];
for (const [engine, launch] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await launch.launch();
  for (const theme of ['light', 'dark']) {
    rows.push(await audit(browser, engine, { width: 390, height: 844 }, false, theme));
    rows.push(await audit(browser, engine, { width: 1280, height: 800 }, true, theme));
  }
  await browser.close();
}
for (const r of rows) {
  const ok = r.ctaBleed <= 0.5 && r.baselineDelta <= 2 && !r.fabOverlap && r.subtextContrast >= 4.5 && r.consoleIssues === 0 && r.stuckTexts.length === 0;
  if (!ok) pass = false;
  console.log(`${r.engine}/${r.theme}/${r.viewport}px | bleed:${r.ctaBleed.toFixed(1)} Δ:${r.baselineDelta.toFixed(1)} fab:${r.fabOverlap} heroCT:${r.subtextContrast.toFixed(2)} stuck:${r.stuckTexts.length} err:${r.consoleIssues} => ${ok ? 'PASS' : 'FAIL'}`);
  for (const s of r.stuckTexts) console.log('   STUCK:', s);
}
console.log(pass ? 'DESIGN-AUDIT PASS (light+dark)' : 'DESIGN-AUDIT FAIL');
process.exit(pass ? 0 : 1);
