// Console-error probe for a single page (local audit server).
import { chromium } from '@playwright/test';

const url = process.argv[2] || 'http://127.0.0.1:3977/products';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
p.on('requestfailed', (r) => errs.push('reqfail: ' + r.url().slice(0, 140) + ' ' + (r.failure()?.errorText || '')));
p.on('response', (r) => { if (r.status() >= 400) errs.push('http' + r.status() + ': ' + r.url().slice(0, 140)); });
await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
const n = await p.locator('img').count();
const broken = await p.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')));
console.log(JSON.stringify({ url, imgs: n, broken, errors: errs }, null, 1));
await b.close();
