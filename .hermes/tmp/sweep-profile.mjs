// Broad error hunt on /profile?tab=orders with fresh real login, both engines,
// incl. the exact sequence: land logged-out -> login -> navigate (token set after app boot).
import { chromium, webkit } from '@playwright/test';

const BASE = 'https://janebiarena.ir';

async function sweep(engine, label, navFn) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ locale: 'fa-IR' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`[${r.status()}] ${r.url()}`); });

  try {
    await navFn(page, ctx);
    await page.waitForTimeout(2500);
    console.log(`\n=== ${label} ===`);
    console.log(errs.length ? errs.join('\n') : 'CLEAN');
  } catch (e) {
    console.log(`\n=== ${label} ===\nNAV FAIL: ${e.message.split('\n')[0]}\npartial errors:\n` + errs.join('\n'));
  }
  await browser.close();
}

const loginViaForm = async (page) => {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="tel"], input[name="phone"]', '[REDACTED-CREDENTIAL]');
  await page.fill('input[type="password"]', '1234');
  await page.click('button[type="submit"]');
  await page.waitForURL(/profile|\/$/, { timeout: 15000 });
  await page.goto(BASE + '/profile?tab=orders', { waitUntil: 'networkidle' });
};

const directWithToken = async (page, ctx) => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '[REDACTED-CREDENTIAL]', password: '1234' }),
  });
  const { accessToken } = await res.json();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('token', t), accessToken);
  await page.goto(BASE + '/profile?tab=orders', { waitUntil: 'networkidle' });
};

for (const eng of [chromium, webkit]) {
  await sweep(eng, `${eng.name()} form-login -> orders`, loginViaForm);
  await sweep(eng, `${eng.name()} token-inject -> orders`, directWithToken);
}
