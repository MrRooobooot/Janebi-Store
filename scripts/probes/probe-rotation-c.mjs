// probe-rotation-c.mjs — forms & micro-interactions: auth modal, coupon, qty stepper
// DOM + pixel contrast on REAL rendered pixels (oklab getComputedStyle lies — see UI-AUDIT-LOG)
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_BASE || 'https://janebiarena.ir';
const runs = [
  ['d-light', { width: 1280, height: 900 }, 'light'],
  ['d-dark', { width: 1280, height: 900 }, 'dark'],
  ['m-light', { width: 390, height: 844 }, 'light'],
  ['m-dark', { width: 390, height: 844 }, 'dark'],
];

// pixel extreme-contrast of an element screenshot
async function pixel(page, loc) {
  if (!(await loc.count())) return 'no-el';
  if (!(await loc.isVisible().catch(() => false))) return 'hidden';
  const buf = (await loc.screenshot()).toString('base64');
  return page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    let minL = 1, maxL = 0;
    for (let i = 0; i < d.length; i += 4) {
      const L = 0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]);
      if (L < minL) minL = L; if (L > maxL) maxL = L;
    }
    return +((maxL + 0.05) / (minL + 0.05)).toFixed(2);
  }, buf);
}

const geom = (page, sel) => page.evaluate(s => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
}, sel);

const browser = await chromium.launch();
const report = {};

for (const [tag, vp, theme] of runs) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  const R = report[tag] = {};

  // ── 1. AUTH MODAL (open it via header trigger) ──
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const trig = page.locator('header button:has-text("ورود"), header a:has-text("ورود")').first();
  R.authTrigger = await trig.count() ? 'found' : 'MISSING';
  if (await trig.count()) {
    await trig.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 4000 }).catch(() => {});
    const dlg = page.locator('[role="dialog"]');
    R.dialogOpen = await dlg.count() > 0;
    if (R.dialogOpen) {
      R.focusOnOpen = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return d === document.activeElement ? 'dialog' : (document.activeElement?.tagName || 'none');
      });
      R.authPhoneInputContrast = await pixel(page, page.locator('[role="dialog"] input').first());
      R.authPhonePlaceholder = await page.evaluate(() => {
        const i = document.querySelector('[role="dialog"] input');
        if (!i) return null;
        // probe rendered placeholder: set value empty, read ::placeholder color via range trick not possible → use pixel after screenshot while empty
        return getComputedStyle(i).fontSize; // just record size; placeholder contrast via pixel below
      });
      // switch to register tab — check tab inactive contrast + tap targets
      const tabReg = page.locator('[role="dialog"] button:has-text("ثبت‌نام")').first();
      R.tabRegister = await tabReg.count() ? await tabReg.evaluate(el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }) : 'no-tab';
      R.tabInactiveContrast = await pixel(page, tabReg);
      if (await tabReg.count()) {
        await tabReg.click();
        await page.waitForTimeout(300);
        R.registerInputs = await page.locator('[role="dialog"] input').count();
        const submit = page.locator('[role="dialog"] button[type="submit"]');
        R.submitGeom = await page.evaluate(() => {
          const b = document.querySelector('[role="dialog"] button[type="submit"]');
          if (!b) return null; const r = b.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height) };
        });
        R.submitContrast = await pixel(page, submit);
        // error micro-interaction: submit empty
        await submit.click();
        await page.waitForTimeout(500);
        const toast = page.locator('.fixed, [role="status"], [role="alert"]').filter({ hasText: /معتبر|وارد کنید|حداقل/ }).first();
        R.emptySubmitFeedback = await toast.count() ? (await toast.innerText()).slice(0, 80) : 'NO FEEDBACK';
      }
      // escape closes
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      R.escapeCloses = !(await page.locator('[role="dialog"]').count());
      R.bodyScrollRestored = await page.evaluate(() => document.body.style.overflow !== 'hidden');
      // reopen, test password eye toggle
      await trig.click();
      await page.waitForSelector('[role="dialog"] input[type="password"]', { timeout: 4000 }).catch(() => {});
      const pw = page.locator('[role="dialog"] input[type="password"]').first();
      if (await pw.count()) {
        await pw.fill('test1234');
        const eyeBtn = page.locator('[role="dialog"] button').filter({ has: page.locator('svg[class*="eye" i]') }).first();
        R.eyeToggleExists = await eyeBtn.count() > 0;
        if (R.eyeToggleExists) {
          await eyeBtn.click();
          R.eyeRevealsText = await page.locator('[role="dialog"] input[type="text"]').count() > 0;
        }
      }
      // focus ring visible on input
      R.inputFocusRing = await page.evaluate(() => {
        const i = document.querySelector('[role="dialog"] input');
        if (!i) return null;
        i.focus();
        const cs = getComputedStyle(i);
        return { outline: cs.outlineStyle + ' ' + cs.outlineWidth, shadow: cs.boxShadow.slice(0, 60) };
      });
      // close via backdrop
      await page.mouse.click(20, 20);
      await page.waitForTimeout(400);
      R.backdropCloses = !(await page.locator('[role="dialog"]').count());
    }
  }

  // ── 2. CART: qty stepper — isolate: close page, seed via fresh nav ──
  await page.close();
  const page2 = await ctx.newPage();
  await page2.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page2.evaluate(() => localStorage.setItem('cart', JSON.stringify([{ id: 12, quantity: 1 }])));
  await page2.goto(BASE + '/cart', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);

  const minus = page2.locator('button[aria-label^="کاهش تعداد"]').first();
  const plus = page2.locator('button[aria-label^="افزایش تعداد"]').first();
  R.cartHasItem = await plus.count() > 0;
  if (R.cartHasItem) {
    R.minusAt1_disabled = await minus.evaluate(el => el.disabled);
    R.minusAt1_opacity = await minus.evaluate(el => getComputedStyle(el).opacity);
    R.plusGeom = await page2.evaluate(() => {
      const b = document.querySelector('button[aria-label^="افزایش"]');
      const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    // increment → qty 2, minus becomes enabled; tap → remove? (go back to 1)
    await plus.click();
    await page2.waitForTimeout(400);
    R.qtyAfterPlus = await page2.evaluate(() => document.querySelector('span.font-mono, .font-black.w-7')?.innerText || '?');
    // stepper hover state visible?
    R.plusHoverBg = await page2.evaluate(async () => {
      const b = document.querySelector('button[aria-label^="افزایش"]');
      b.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      return getComputedStyle(b).backgroundColor;
    });
  }

  // ── 3. COUPON: invalid then valid flow ──
  const couponInput = page2.locator('#coupon-code-input');
  R.couponField = await couponInput.count() > 0;
  if (R.couponField) {
    await couponInput.fill('BOGUS999');
    await page2.locator('button[aria-label="اعمال کد تخفیف"]').click();
    await page2.waitForTimeout(1200);
    const err = page2.locator('#coupon-error-message');
    R.couponErrorShown = await err.count() > 0;
    if (R.couponErrorShown) {
      R.couponErrorContrast = await pixel(page2, err);
      R.couponErrorText = (await err.innerText()).slice(0, 80);
      R.ariaInvalid = await couponInput.evaluate(el => el.getAttribute('aria-invalid'));
      const dismiss = page2.locator('button[aria-label="بستن پیام خطای کد تخفیف"]');
      if (await dismiss.count()) { await dismiss.click(); await page2.waitForTimeout(300); }
      R.errorDismissable = !(await page2.locator('#coupon-error-message').count());
    }
  }

  // ── 4. checkout form: phone normalization + inline validation ──
  await page2.goto(BASE + '/checkout', { waitUntil: 'networkidle' }).catch(() => {});
  await page2.waitForTimeout(800);
  const phone = page2.locator('input[inputmode="tel"], input[placeholder*="09"], input[placeholder*="موبایل"]').first();
  R.checkoutPhoneField = await phone.count() > 0 ? 'found' : (await page2.locator('input').count()) + ' inputs, no tel';
  if (await phone.count()) {
    await phone.fill('9123456789');
    await phone.blur();
    await page2.waitForTimeout(300);
    R.phoneNormalized = await phone.inputValue();
  }

  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
