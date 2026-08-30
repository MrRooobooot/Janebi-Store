// Repro attempt: user SyntaxError on HOME hero (Safari). Idle hero + slide auto-rotation, both engines.
import { chromium, webkit } from '@playwright/test';
const BASE = 'https://janebiarena.ir';
for (const eng of [chromium, webkit]) {
  const b = await eng.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 300)); });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(6000);
  console.log('===', eng.name(), 'HOME ===');
  console.log(errs.length ? errs.join('\n') : 'CLEAN');
  await b.close();
}
