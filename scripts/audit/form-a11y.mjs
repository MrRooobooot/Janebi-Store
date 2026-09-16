// Accessibility field audit (the "no id/name" + "no associated label" DevTools issues):
// walks the public routes, seeds a cart for cart/checkout, and reports EVERY form field with
// which of {id, name, label, aria-label, autocomplete} are missing — grouped by page.
import { chromium } from 'playwright';

const BASE = 'https://janebiarena.ir';
const ROUTES = ['/', '/products', '/product/5632', '/cart', '/checkout', '/login', '/register',
  '/contact', '/wishlist', '/compare', '/offers', '/new-products', '/blog', '/faq', '/about', '/brands'];

const PROBE = () => {
  const labelFor = (el) => {
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return l.textContent.trim().slice(0, 30);
    }
    const anc = el.closest('label');
    if (anc) return anc.textContent.trim().slice(0, 30);
    const al = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if (al) return `aria:${al.slice(0, 30)}`;
    return null;
  };
  return [...document.querySelectorAll('input,select,textarea')]
    .filter((el) => el.type !== 'hidden' && el.getBoundingClientRect().width > 0)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      id: el.id || null,
      name: el.getAttribute('name'),
      autocomplete: el.getAttribute('autocomplete'),
      label: labelFor(el),
      placeholder: el.getAttribute('placeholder'),
      cls: (el.className || '').toString().slice(0, 48),
    }));
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
// seed a cart so /checkout renders its real form (guest checkout form is client-side)
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('cart', JSON.stringify([
  { id: 5632, quantity: 1, price: 1050000, title: 'پایه نگهدارنده تبلت ارلدام مدل ET-EH334', image: '/images/products/ear-eh334.webp', brand: 'ارلدام' },
])));

const report = {};
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(800);
  const fields = await page.evaluate(PROBE);
  const bad = fields.filter((f) => !f.id || !f.name || !f.label);
  if (bad.length) report[route] = bad;
  console.log(`${route}: fields=${fields.length} violating=${bad.length}`);
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
