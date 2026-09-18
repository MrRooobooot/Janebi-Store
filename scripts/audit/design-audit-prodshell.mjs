// design-audit with domcontentloaded + settle (networkidle never fires under SW).
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./design-audit.mjs', import.meta.url), 'utf-8');
const patched = src
  .replace(/waitUntil: 'networkidle', timeout: 30000/g, "waitUntil: 'domcontentloaded', timeout: 30000")
  .replace(/await page\.waitForTimeout\(600\);/g, 'await page.waitForTimeout(2500);');
fs.writeFileSync(new URL('./design-audit-run.mjs', import.meta.url), patched);
await import('./design-audit-run.mjs');
fs.unlinkSync(new URL('./design-audit-run.mjs', import.meta.url));
