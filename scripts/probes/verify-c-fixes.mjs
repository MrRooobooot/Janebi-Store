// verify-c-fixes.mjs — post-fix visual+DOM proof on local build (:3977)
import { chromium } from '@playwright/test';
const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:3977';
const browser = await chromium.launch();
const res = {};
for (const [tag, vp, theme] of [['m-light', { width: 390, height: 844 }, 'light'], ['d-light', { width: 1280, height: 900 }, 'light']]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  const R = res[tag] = {};

  // 1. auth modal empty submit → Persian toast, no browser tooltip
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.locator('header button:has-text("ورود"), header a:has-text("ورود")').first().click();
  await page.waitForSelector('[role="dialog"]');
  await page.locator('[role="dialog"] button:has-text("ثبت")').first().click();
  await page.waitForTimeout(200);
  await page.locator('[role="dialog"] button[type="submit"]').click();
  await page.waitForTimeout(400);
  R.toast = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(d => /معتبر|وارد کنید|حداقل/.test(d.textContent) && getComputedStyle(d.closest('.fixed') || d).position === 'fixed' && d.closest('.fixed')?.className.includes('bottom'));
    return el ? el.textContent.slice(0, 70) : 'NO TOAST';
  });
  R.browserTooltipGone = await page.evaluate(() => {
    // native validation would block submit; if our toast fired instead, noValidate works
    const i = document.querySelector('[role="dialog"] input:invalid');
    return i === null;
  });
  await page.screenshot({ path: `docs/shots/fix-${tag}-auth-toast.png` });
  await page.keyboard.press('Escape');

  // 2. toast vs bottom nav overlap geometry (mobile)
  await page.goto(BASE + '/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const card = page.locator('a[href*="/products/"]').first();
  await card.waitFor({ timeout: 15000 }).catch(() => {});
  await page.locator('button[aria-label^="افزودن به سبد"], button:has-text("افزودن")').first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  if (vp.width === 390) {
    R.toastNavOverlap = await page.evaluate(() => {
      const toast = [...document.querySelectorAll('div')].find(d => /به سبد افزوده/.test(d.textContent) && d.children.length === 0);
      const nav = document.querySelector('nav.fixed, .fixed.bottom-0');
      if (!toast) return 'no toast to measure';
      if (!nav) return 'no nav';
      const t = toast.getBoundingClientRect(), n = nav.getBoundingClientRect();
      const overlap = Math.min(t.bottom, n.bottom) - Math.max(t.top, n.top);
      return { toastBottom: Math.round(t.bottom), navTop: Math.round(n.top), overlapPx: Math.round(overlap > 0 ? overlap : 0) };
    });
  }

  // 3. coupon error = Persian business msg + single surface (no dup toast)
  await page.evaluate(() => localStorage.setItem('cart', JSON.stringify([{ id: 12, quantity: 1, price: 8500000, title: 'قاب گوشی', image: '/images/products/dk-12.jpg', brand: 'Janebi' }])));
  const p2 = await ctx.newPage();
  await p2.addInitScript(t => localStorage.setItem('theme', t), theme);
  await p2.goto(BASE + '/cart', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(800);
  await p2.locator('#coupon-code-input').fill('ZZTEST');
  await p2.locator('button[aria-label="اعمال کد تخفیف"]').click();
  await p2.waitForTimeout(1200);
  R.couponErrPersian = await p2.evaluate(() => document.querySelector('#coupon-error-message')?.innerText.slice(0, 60) || 'none');
  R.duplicateToast = await p2.evaluate(() => [...document.querySelectorAll('.fixed.bottom-20, .fixed.bottom-4')].some(c => /نامعتبر|تلاش/.test(c.innerText)));
  if (vp.width === 390) R.toastDupOverlap = await p2.evaluate(() => {
    const t = [...document.querySelectorAll('div')].find(d => /نامعتبر|تلاش/.test(d.textContent) && d.closest('[class*="bottom-20"]'));
    return !!t;
  });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(res, null, 2));
