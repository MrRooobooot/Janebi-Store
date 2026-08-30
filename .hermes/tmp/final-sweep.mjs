// Final post-deploy sweep: home + profile/orders (stale-LS-token flow) + full user flow, both engines.
import { chromium, webkit } from '@playwright/test';
const BASE = 'https://janebiarena.ir';

async function freshOrders(eng) {
  const b = await eng.launch();
  const ctx = await b.newContext({ locale: 'fa-IR' });
  const page = await ctx.newPage();
  const errs = [], failed = [];
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 150)); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="tel"], input[name="phone"]', '[REDACTED-CREDENTIAL]');
  await page.fill('input[type="password"]', '1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const t = localStorage.getItem('token');
    if (t) localStorage.setItem('token', t.slice(0, -3) + 'zzz');
  });
  await page.goto(BASE + '/profile?tab=orders', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const nodes = await page.locator('text=سفارش').count();
  console.log(`[${eng.name()}] stale-token orders: 4xx=${failed.length ? failed.join(',') : '0'} err=${errs.length ? errs.join('|') : '0'} nodes=${nodes}`);
  await b.close();
}

async function home(eng) {
  const b = await eng.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 150)); });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  console.log(`[${eng.name()}] home: err=${errs.length ? errs.join('|') : '0'}`);
  await b.close();
}

for (const eng of [chromium, webkit]) {
  await home(eng);
  await freshOrders(eng);
}
