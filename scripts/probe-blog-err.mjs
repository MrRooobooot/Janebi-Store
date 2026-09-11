// probe blog+offers console errors
import { chromium } from '@playwright/test';
const ctx = await chromium.launch().then(b => b.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { 'x-forwarded-proto': 'http' } }));
const page = await ctx.newPage();
const issues = [];
page.on('console', (m) => { if (m.type() === 'error' && (m.location()?.url || '').includes('127.0.0.1')) issues.push('CONSOLE ' + m.text().slice(0, 150)); });
page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) issues.push(`HTTP ${r.status} ${r.url()}`); });
for (const p of ['/blog', '/offers']) {
  await page.goto('http://127.0.0.1:3977' + p, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  console.log(p + ':', issues.length ? issues.join(' | ') : 'clean');
  issues.length = 0;
}
await ctx.close();
