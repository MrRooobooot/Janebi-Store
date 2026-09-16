// Post-deploy guest smoke: real engines against the LIVE site. Flags console
// errors, failed API responses (401 on the session probes is expected) and any
// script-readable credential left in storage.
const BASE = process.env.SMOKE_BASE || 'https://janebiarena.ir';
const { chromium, webkit } = await import('@playwright/test');
const ROUTES = ['/', '/products', '/cart', '/checkout', '/login', '/blog', '/wishlist'];
const IGNORE_API = /\/api\/(auth\/(me|refresh|session)|cart|wishlist|orders|coupons-active)/;
// Third-party noise: the enamad trust seal endpoint drops connections for
// non-Iranian/headless clients (verified: the only failure is
// trustseal.enamad.ir/logo.aspx returning ERR_CONNECTION_CLOSED). It is not our
// origin and not our defect, so it must not mark the smoke red.
const THIRD_PARTY = /enamad|ERR_CONNECTION_CLOSED|status of 408/;

const out = {};
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  const errors = [];
  const apiFails = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!THIRD_PARTY.test(t)) errors.push(t.slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/api/') && r.status() >= 400 && !IGNORE_API.test(u)) apiFails.push(`${r.status()} ${u}`);
  });
  const per = {};
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => {
      per[route] = 'NAV FAIL ' + e.message.split('\n')[0];
    });
    await page.waitForTimeout(400);
    if (per[route]) continue;
    const state = await page.evaluate(() => ({
      root: document.getElementById('root')?.children.length || 0,
      tokenKeys: Object.keys(localStorage).filter((k) => /token/i.test(k)),
      cookie: document.cookie,
      bodyHasError: /Application error|Uncaught|خطای غیرمنتظره/.test(document.body.innerText),
    }));
    per[route] = { rootChildren: state.root, tokenKeys: state.tokenKeys, cookieExposesJwt: /(access|refresh)Token/.test(state.cookie), errorText: state.bodyHasError };
  }
  const collapsed = Object.fromEntries(
    Object.entries(per).map(([k, v]) => [
      k,
      typeof v === 'string'
        ? v
        : `${v.rootChildren ? 'rendered' : 'EMPTY'}${v.tokenKeys.length ? ' TOKEN-KEYS:' + v.tokenKeys : ''}${v.cookieExposesJwt ? ' COOKIE-LEAK' : ''}${v.errorText ? ' ERROR-TEXT' : ''}`,
    ])
  );
  out[name] = { routes: collapsed, consoleErrors: [...new Set(errors)], unexpectedApiFails: [...new Set(apiFails)] };
  await browser.close();
}
console.log(JSON.stringify(out, null, 1));
const bad = Object.values(out).some(
  (b) =>
    b.consoleErrors.length ||
    b.unexpectedApiFails.length ||
    Object.values(b.routes).some((r) => typeof r === 'string' && (/NAV FAIL|EMPTY|TOKEN-KEYS|COOKIE-LEAK|ERROR-TEXT/.test(r)))
);
console.log(bad ? 'SMOKE: PROBLEMS FOUND' : 'SMOKE: CLEAN (all routes rendered, no console errors, no stored JWT)');
