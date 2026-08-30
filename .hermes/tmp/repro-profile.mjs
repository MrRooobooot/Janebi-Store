// Live repro on https://janebiarena.ir — Profile orders tab, fresh + stale token, both engines.
import { chromium, webkit } from '@playwright/test';

const BASE = 'https://janebiarena.ir';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '[REDACTED-CREDENTIAL]', password: '1234' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('login failed: ' + JSON.stringify(data));
  return data.accessToken;
}

async function run(engine, tokenFactory, label) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ baseURL: BASE, locale: 'fa-IR' });
  const page = await ctx.newPage();
  const consoleMsgs = [];
  const failedReqs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) failedReqs.push(`${r.status()} ${r.url()}`); });

  const token = await tokenFactory();
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('token', t), token);
  await page.goto(BASE + '/profile?tab=orders', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const orderCards = await page.locator('text=سفارش').count();
  console.log(`\n=== ${label} [${engine.name ? engine.name() : ''}] ===`);
  console.log('order-related text nodes:', orderCards);
  console.log('console errors/warnings:', consoleMsgs.length ? consoleMsgs : 'NONE');
  console.log('failed requests:', failedReqs.length ? failedReqs : 'NONE');
  await browser.close();
}

const fresh = async () => await login();
const stale = async () => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3ItZmFrZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDgzNjAwfQ.FAKE_SIG_aa';

await run(chromium, fresh, 'FRESH token');
await run(webkit, fresh, 'FRESH token');
await run(webkit, stale, 'STALE/invalid token');
