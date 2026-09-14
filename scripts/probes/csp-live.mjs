// csp-live.mjs — live browser proof for SEC-03 (prod).
// Usage: node scripts/probes/csp-live.mjs [https://janebiarena.ir]
// For each engine: instrument securitypolicyviolation BEFORE any page script,
// pre-seed theme=dark, then assert (a) zero script-src violations, (b) the inline
// anti-FOUC bootstrap actually EXECUTED (dark class applied), (c) the SPA mounted.
import { chromium, webkit } from '@playwright/test';

const base = process.argv[2] ?? 'https://janebiarena.ir';
const ARMED = `(() => {
  window.__csp = [];
  addEventListener('securitypolicyviolation', (e) => window.__csp.push({
    directive: e.violatedDirective, blocked: e.blockedURI, sample: (e.sample || '').slice(0, 120),
  }));
  try { localStorage.setItem('theme', 'dark'); } catch {}
})()`;

let failed = 0;
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.text().includes('Content Security Policy')) consoleErrors.push(m.text().slice(0, 160)); });
  await page.addInitScript(ARMED);
  await page.goto(`${base}/?cb=${Date.now()}`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(4000);

  const r = await page.evaluate(() => ({
    violations: window.__csp || [],
    dark: document.documentElement.classList.contains('dark'),
    rootChildren: document.querySelector('#root')?.children.length ?? 0,
  }));
  await browser.close();

  const blocking = r.violations.filter((v) => /script-src/i.test(v.directive));
  const ok = blocking.length === 0 && r.dark === true && r.rootChildren > 0 && consoleErrors.length === 0;
  console.log(`[${name}] ${ok ? 'PASS' : 'FAIL'} violations=${r.violations.length} script-src=${blocking.length} dark=${r.dark} rootChildren=${r.rootChildren} consoleCSP=${consoleErrors.length}`);
  for (const v of blocking) console.log(`   blocked: ${v.directive} ${v.blocked} ${v.sample}`);
  for (const c of consoleErrors) console.log(`   console: ${c}`);
  if (!ok) failed = 1;
}
process.exit(failed);
