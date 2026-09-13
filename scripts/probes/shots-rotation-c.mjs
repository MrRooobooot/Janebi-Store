// shots-rotation-c.mjs — capture key form states for visual authority
import { chromium } from '@playwright/test';
const BASE = process.env.PROBE_BASE || 'https://janebiarena.ir';
const DIR = 'docs/shots';
const runs = [
  ['d-light', { width: 1280, height: 900 }, 'light'],
  ['d-dark', { width: 1280, height: 900 }, 'dark'],
  ['m-light', { width: 390, height: 844 }, 'light'],
  ['m-dark', { width: 390, height: 844 }, 'dark'],
];
const browser = await chromium.launch();
for (const [tag, vp, theme] of runs) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);

  // auth modal - login
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('header button:has-text("ورود"), header a:has-text("ورود")').first().click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"]').screenshot({ path: `${DIR}/c-${tag}-auth-login.png` });
  // auth modal - register + empty-submit error toast
  await page.locator('[role="dialog"] button:has-text("ثبت")').first().click();
  await page.waitForTimeout(300);
  await page.locator('[role="dialog"] button[type="submit"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/c-${tag}-auth-register-toast.png` });
  await page.keyboard.press('Escape');

  // cart with a priced item + coupon error
  const p2 = await ctx.newPage();
  await p2.addInitScript(t => localStorage.setItem('theme', t), theme);
  await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p2.evaluate(() => localStorage.setItem('cart', JSON.stringify([
    { id: 12, quantity: 1, price: 850000, title: 'قاب گوشی', image: '/images/products/dk-12.jpg', brand: 'Janebi' },
    { id: 5590, quantity: 2, price: 6200000, title: 'مودم نزتک HOPE', image: '/images/products/dk-5590.jpg', brand: 'نزتک' },
  ])));
  await p2.goto(BASE + '/cart', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1000);
  await p2.locator('#coupon-code-input').fill('BOGUS999');
  await p2.locator('button[aria-label="اعمال کد تخفیف"]').click();
  await p2.waitForTimeout(1200);
  await p2.screenshot({ path: `${DIR}/c-${tag}-cart-coupon-err.png`, fullPage: false });

  // PDP buy-box region (price/stock/CTA cluster)
  const p3 = await ctx.newPage();
  await p3.addInitScript(t => localStorage.setItem('theme', t), theme);
  await p3.goto(BASE + '/products/12', { waitUntil: 'networkidle' });
  await p3.waitForTimeout(900);
  await p3.screenshot({ path: `${DIR}/c-${tag}-pdp.png` });

  await ctx.close();
}
await browser.close();
console.log('shots done');
