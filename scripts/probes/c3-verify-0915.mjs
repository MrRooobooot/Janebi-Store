import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1280,height:900} });
await page.goto('https://janebiarena.ir/', { waitUntil:'networkidle', timeout:20000 }).catch(()=>{});
await page.waitForTimeout(1200);
const out = {};
out.heroH = await page.evaluate(() => Math.round(document.querySelector('section .relative.rounded-3xl')?.getBoundingClientRect().height || 0));
out.b2bGone = await page.evaluate(() => ![...document.querySelectorAll('h3')].some(h => h.textContent.includes('عمده')));
out.wishlistGone = await page.evaluate(() => !document.querySelector('header a[title="علاقه‌مندی‌ها"]'));
out.themeToggleGone = await page.evaluate(() => ![...document.querySelectorAll('header button')].some(b => (b.title||'').includes('حالت')));
out.searchBarMobile = await page.evaluate(() => !!document.querySelector('header .md\\:hidden form, header .md\\:hidden input'));
out.cartH = await page.evaluate(() => Math.round(document.querySelector('button[aria-label="مشاهده سبد خرید"]')?.getBoundingClientRect().height || 0));
out.userH = await page.evaluate(() => {
  const b = [...document.querySelectorAll('header button')].find(x => x.textContent.includes('آیدین') || x.textContent.includes('حساب'));
  return Math.round(b?.getBoundingClientRect().height || 0);
});
// VIP phone-only
await page.fill('section form input', '09123456789');
const resp = await page.evaluate(async () => {
  const r = await fetch('/api/contact/newsletter', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone: '09123456789' }) });
  return { status: r.status, body: await r.json() };
});
out.vipPhone = resp;
// invalid phone rejected?
const bad = await page.evaluate(async () => {
  const r = await fetch('/api/contact/newsletter', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone: '12345' }) });
  return { status: r.status };
});
out.vipBadRejected = bad;
console.log(JSON.stringify(out, null, 1));
await browser.close();
