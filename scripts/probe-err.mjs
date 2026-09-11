// probe: capture same-host console errors + >=400 responses on /products
import { chromium } from '@playwright/test';
const BASE = 'http://127.0.0.1:3977';
const ctx = await chromium.launch().then(b => b.newContext({ viewport: { width: 1280, height: 800 }, extraHTTPHeaders: { 'x-forwarded-proto': 'http' }, colorScheme: 'light' }));
const page = await ctx.newPage();
const issues = [];
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const loc = m.location()?.url || '';
  if (loc && !loc.includes('127.0.0.1')) return;
  issues.push('CONSOLE: ' + m.text().slice(0, 200));
});
page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) issues.push(`HTTP ${r.status} ${r.url()}`); });
await page.goto(BASE + '/products', { waitUntil: 'networkidle', timeout: 30000 });
await page.evaluate(() => localStorage.setItem('theme', 'light'));
await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
console.log([...new Set(issues)].join('\n') || 'no issues');
await ctx.close();
