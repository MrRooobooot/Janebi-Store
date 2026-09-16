// Mobile UX audit (390x844 + 360x800): horizontal overflow, tap-target sizes, tiny text,
// section rhythm, sticky chrome height. Evidence only — no fixes.
import { chromium, webkit } from 'playwright';

const PAGES = { home: 'https://janebiarena.ir/', products: 'https://janebiarena.ir/products', pdp: 'https://janebiarena.ir/product/5632' };

async function audit(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const offenders = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > doc.clientWidth + 1 || r.left < -1)) {
        offenders.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 60), right: Math.round(r.right), left: Math.round(r.left) });
      }
    });
    const clickable = [...document.querySelectorAll('a,button,[role="button"],input,select')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const small = clickable.map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) };
    }).filter(x => x.h < 44 || x.w < 44);
    const tiny = [...document.querySelectorAll('p,span,div,li,a,h1,h2,h3,h4,button')].filter(el => {
      const t = (el.textContent || '').trim();
      if (!t || el.children.length) return false;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      return fs && fs < 12;
    }).map(el => ({ fs: parseFloat(getComputedStyle(el).fontSize), txt: el.textContent.trim().slice(0, 28) })).slice(0, 12);
    const headers = [...document.querySelectorAll('header, nav, [class*="sticky"]')].map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 40), top: Math.round(r.top), h: Math.round(r.height) };
    }).filter(h => h.h > 0 && h.h < 200).slice(0, 6);
    const sections = [...document.querySelectorAll('main > div > section, section')].map(s => {
      const r = s.getBoundingClientRect();
      const cs = getComputedStyle(s);
      return { h: Math.round(r.height), padTop: cs.paddingTop, marginBottom: cs.marginBottom };
    }).slice(0, 12);
    const gaps = [...document.querySelectorAll('main, main > div')].map(el => getComputedStyle(el).gap || getComputedStyle(el).rowGap);
    return {
      viewport: { w: doc.clientWidth, h: doc.clientHeight },
      scrollHeight: doc.scrollHeight,
      horizontalOverflowPx: overflow,
      overflowOffenders: offenders.slice(0, 6),
      clickableCount: clickable.length,
      smallTargets: small.slice(0, 14),
      smallTargetCount: small.length,
      tinyText: tiny,
      stickyChrome: headers,
      mainGaps: gaps,
      sections,
      bottomNavPresent: !!document.querySelector('nav[class*="fixed"], [class*="bottom-0"]'),
    };
  });
}

async function run(name, launcher) {
  const browser = await launcher.launch();
  const out = {};
  for (const [key, url] of Object.entries(PAGES)) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2500);
    out[key] = await audit(page);
    await page.screenshot({ path: `/tmp/mobile-${key}-${name}.png`, fullPage: key === 'home' });
    await ctx.close();
  }
  await browser.close();
  return { engine: name, ...out };
}

const [c, w] = await Promise.all([run('chromium', chromium), run('webkit', webkit)]);
console.log(JSON.stringify({ chromium: c, webkit: w }, null, 1));
