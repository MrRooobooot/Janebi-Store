// probe-blog.mjs — verify blog card defects: title v-clip, meta contrast, chip wrap (dark+light)
import { chromium } from '@playwright/test';
const BASE = process.env.PROBE_BASE || 'https://janebiarena.ir';
const browser = await chromium.launch();
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.goto(BASE + '/blog', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate((theme) => {
    const out = { theme: '', clipV: [], metaLow: [], chipHeights: [] };
    const lum = x => { if (!x) return null; const m = x.match(/[\d.]+/g); if (!m) return null; const [a, b, c, al] = m.map(Number); if (al === 0) return null; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(a) + 0.7152 * f(b) + 0.0722 * f(c); };
    const effBg = el => { let e = el; while (e) { const bg = getComputedStyle(e).backgroundColor; const L = lum(bg); if (L !== null) { const m = bg.match(/[\d.]+/g); if (m.length < 4 || +m[3] > 0.6) return bg; } e = e.parentElement; } return theme === 'dark' ? 'rgb(10,17,40)' : 'rgb(248,250,252)'; };
    const ratio = (col, bg) => { const l1 = lum(col), l2 = lum(bg); if (l1 == null || l2 == null) return null; return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2); };
    for (const h of document.querySelectorAll('h2,h3')) {
      const cs = getComputedStyle(h);
      if (cs.webkitLineClamp !== 'none' && h.scrollHeight > h.clientHeight + 1) out.clipV.push({ t: h.textContent.trim().slice(0, 32), sh: h.scrollHeight, ch: h.clientHeight });
    }
    for (const el of document.querySelectorAll('time, span')) {
      const t = (el.textContent || '').trim();
      if (/(خواندن|دقیقه|خرداد|تیر مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند|۱۴۰[4-6])/.test(t) && t.length < 44 && el.children.length === 0) {
        const rr = ratio(getComputedStyle(el).color, effBg(el));
        if (rr !== null && rr < 3.5) out.metaLow.push({ t: t.slice(0, 30), color: getComputedStyle(el).color, ratio: rr });
      }
    }
    out.metaLow = out.metaLow.slice(0, 6);
    const chips = [...document.querySelectorAll('button')].filter(e => e.textContent.includes('مقاله') && e.getBoundingClientRect().height > 20 && e.getBoundingClientRect().height < 80);
    out.chipHeights = [...new Set(chips.map(e => Math.round(e.getBoundingClientRect().height)))];
    return out;
  }, theme);
  r.theme = theme;
  console.log(JSON.stringify(r));
  await ctx.close();
}
await browser.close();
