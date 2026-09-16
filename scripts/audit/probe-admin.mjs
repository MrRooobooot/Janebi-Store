// probe-admin sweep (isolated :3978), light+dark, all 12 admin routes
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'http://127.0.0.1:3978';
const TOKEN = fs.readFileSync('/tmp/audit-isolated/token.txt', 'utf8').trim();
const ADMIN = ['','/products','/orders','/users','/coupons','/messages','/reviews','/newsletter','/blog','/audit-logs','/settings'];
const REPORT = [];

function truncScan() {
  const out = [];
  const els = document.querySelectorAll('h1,h2,h3,p,span,a,button,td,th,label');
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== 'ellipsis' && cs.overflowX !== 'hidden') continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.textContent.trim().length > 3) {
      out.push(el.tagName + ' "' + el.textContent.trim().slice(0, 26) + '" sw=' + el.scrollWidth + ' cw=' + el.clientWidth);
    }
  }
  return out;
}

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
  await ctx.addInitScript(([t, th]) => { localStorage.setItem('token', t); localStorage.setItem('theme', th); }, [TOKEN, theme]);
  for (const p of ADMIN) {
    const page = await ctx.newPage();
    const http4xx = [];
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) http4xx.push(r.status() + ' ' + r.url().replace(BASE, '')); });
    try {
      await page.goto(BASE + '/admin' + p, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1200);
      const scan = await page.evaluate(truncScan);
      const broken = await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).length);
      const err = page.locator('text=/خطا|Error|Failed/');
      const errN = await err.count();
      const slug = (p || 'dashboard').replace(/\//g, '-');
      await page.screenshot({ path: '/tmp/adm-' + slug + '-' + theme + '.png' });
      REPORT.push([theme, p || '/', 'trunc:' + scan.length, 'broken:' + broken, 'errTxt:' + errN, '4xx:' + http4xx.length].join(' | '));
      if (scan.length) REPORT.push('   ' + scan.slice(0, 3).join('\n   '));
      if (http4xx.length) REPORT.push('   ' + http4xx.slice(0, 3).join('\n   '));
    } catch (e) {
      REPORT.push([theme, p, 'NAV-FAIL: ' + String(e.message).slice(0, 60)].join(' | '));
    }
    await page.close();
  }
}
await browser.close();
console.log(REPORT.join('\n'));
