// Focused check: /api/orders with stale access token + valid refresh cookie must recover via authFetch.
// Corrupt ONLY the access token in localStorage, keep refresh cookie from real login, then load orders tab.
import { chromium, webkit } from '@playwright/test';
const BASE = 'https://janebiarena.ir';

for (const eng of [chromium, webkit]) {
  const b = await eng.launch();
  const ctx = await b.newContext({ locale: 'fa-IR' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="tel"], input[name="phone"]', '[REDACTED-CREDENTIAL]');
  await page.fill('input[type="password"]', '1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500); // login completes: token in LS + refresh cookie set
  await page.evaluate(() => {
    const t = localStorage.getItem('token');
    if (t) localStorage.setItem('token', t.slice(0, -3) + 'zzz'); // break signature -> 401
  });
  const errs = [];
  const failed = [];
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 150)); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });

  await page.goto(BASE + '/profile?tab=orders', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const orderNodes = await page.locator('text=سفارش').count();
  console.log(`=== ${eng.name()} stale-LS-token + valid-cookie orders ===`);
  console.log('4xx:', failed.length ? failed.join(' | ') : 'NONE');
  console.log('errors:', errs.length ? errs.join(' | ') : 'NONE');
  console.log('order nodes rendered:', orderNodes);
  await b.close();
}
