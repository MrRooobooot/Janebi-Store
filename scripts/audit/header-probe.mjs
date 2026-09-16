// Header inventory probe — which interactive controls a guest actually gets in
// <header>, plus console errors. Used to localize header-related E2E failures.
// Run from the repo root: node scripts/audit/header-probe.mjs  (PROBE_BASE to retarget)
const { chromium } = await import('@playwright/test');
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 160)));
await p.goto(process.env.PROBE_BASE || 'https://janebiarena.ir', { waitUntil: 'networkidle', timeout: 45000 });
await p.waitForTimeout(800);
const info = await p.evaluate(() => {
  const h = document.querySelector('header');
  const labels = [...(h?.querySelectorAll('button,a') || [])].map(
    (e) => e.getAttribute('aria-label') || e.textContent.trim().slice(0, 20)
  );
  return {
    headerExists: !!h,
    headerText: h?.innerText.replace(/\s+/g, ' ').slice(0, 140) || null,
    ariaLabels: labels.slice(0, 24),
    themeBtn: !!document.querySelector('header button[aria-label*="حالت"]'),
    searchInput: !!document.querySelector('header input'),
    rootChildren: document.getElementById('root')?.children.length || 0,
    tokenKeys: Object.keys(localStorage).filter((k) => /token/i.test(k)),
  };
});
console.log(JSON.stringify({ info, errs: [...new Set(errs)].slice(0, 6) }, null, 1));
await b.close();
