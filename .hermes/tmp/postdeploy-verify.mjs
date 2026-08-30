// Post-deploy live verification: 401-retry path + stale-token UX + home SyntaxError hunt.
// Flow: inject EXPIRED-but-well-formed token + real refresh cookie via API login, then hit orders tab.
import { chromium, webkit } from '@playwright/test';
const BASE = 'https://janebiarena.ir';

// Get a real refresh cookie by API login, then replace the access token with a stale signature
// (forces 401 on /api/orders while refresh cookie stays valid — exactly the user's scenario).
async function makeStaleCtx(browser) {
  const ctx = await browser.newContext({ locale: 'fa-IR' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const apiRes = await ctx.request.post(BASE + '/api/auth/login', {
    data: { phone: '[REDACTED-CREDENTIAL]', password: '1234' },
  });
  const body = await apiRes.json();
  await page.evaluate((t) => localStorage.setItem('token', t + 'x'), body.accessToken); // corrupt -> 401
  return { ctx, page };
}

for (const eng of [chromium, webkit]) {
  const b = await eng.launch();
  const { ctx, page } = await makeStaleCtx(b);
  const errs = [];
  const failed = [];
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });

  await page.goto(BASE + '/profile?tab=orders', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const hasLoginPrompt = await page.locator('text=وارد حساب کاربری').count();
  const orderText = await page.locator('text=سفارش').count();
  console.log(`=== ${eng.name()} stale-token orders ===`);
  console.log('errors:', errs.length ? errs.join(' | ') : 'NONE');
  console.log('4xx:', failed.length ? failed.join(' | ') : 'NONE');
  console.log('login-prompt blocks:', hasLoginPrompt, '| order nodes:', orderText);
  await b.close();
}

// Fresh full-flow sanity: login -> orders, plus home page
for (const eng of [webkit]) {
  const b = await eng.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  console.log(`=== ${eng.name()} home post-deploy ===`);
  console.log('errors:', errs.length ? errs.join(' | ') : 'NONE');
  await b.close();
}
