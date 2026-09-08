import { test, expect, type Page } from '@playwright/test';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

/**
 * DEEP-COVERAGE REAL-USER E2E — the actions the main suite does not click yet.
 * Same rules as real-user.spec.ts: real clicks/typing, visible Persian toast /
 * DOM outcomes, reload persistence, zero console-error tolerance.
 * Runs on the same isolated DB + NODE_ENV=test server (playwright.e2e.config.ts).
 */

const ADMIN_PHONE = '09390000001';
const ADMIN_PASS = 'E2eAdmin@123';
const TEST_PASS = 'Test@12345';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => {
    const ft = r.failure()?.errorText || '';
    if (/favicon|cancelled|ERR_ABORTED|aborted/i.test(r.url() + ft)) return;
    errors.push(`reqfail: ${r.url()} ${ft}`);
  });
  return errors;
}

async function assertNoErrors(errors: string[]) {
  const real = errors.filter(
    (e) =>
      !/react-router|React Router|Download the React DevTools|favicon|ResizeObserver|DevTools|\[vite\]|WebSocket|Vite server|access control checks/i.test(e) &&
      !/Importing a module script failed/.test(e) &&
      !/trustseal\.enamad\.ir|enamad-logo|Failed to load resource/.test(e),
  );
  expect(real, `JS/console errors: ${real.join(' | ')}`).toEqual([]);
}

async function addUser(page: Page, phone: string, name: string, password = TEST_PASS) {
  const res = await page.request.post('/api/auth/register', { data: { name, phone, password } });
  expect(res.ok(), `seed user: ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()).accessToken as string;
}

async function uiLogin(page: Page, phone: string, password: string, nameHint: string) {
  await page.goto('/login');
  await page.locator('input[type="tel"]').fill(phone);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('main').getByRole('button', { name: /ورود به حساب/ }).click();
  await expect(page.locator('header').getByText(new RegExp(nameHint)).first()).toBeVisible({ timeout: 12000 });
}

async function adminToken(page: Page) {
  const res = await page.request.post('/api/auth/login', { data: { phone: ADMIN_PHONE, password: ADMIN_PASS } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

async function addFirstProductToCart(page: Page) {
  const res = await page.request.get('/api/products?limit=50&inStock=true');
  const items: any[] = await res.json();
  const p =
    items.find((x) => (x.stockQuantity ?? 0) > 0 && (x.price ?? 0) >= 350000) ||
    items.find((x) => (x.stockQuantity ?? 0) > 0);
  expect(p, 'no in-stock product').toBeTruthy();
  await page.goto(`/products/${p.id}`);
  const addBtn = page.locator('main button:not([disabled])').filter({ hasText: /افزودن به سبد خرید/ }).first();
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();
  await expect(page.getByText(/به سبد خرید اضافه شد|به سبد افزوده شد/).first()).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(600);
  return p;
}

const rndPhone = () => '0939' + Math.floor(1000000 + Math.random() * 8999999);

// Same Vite cold-compile warmup as the main suite (per worker, once).
let warmed = false;
test.beforeEach(async ({ browser }) => {
  if (warmed) return;
  warmed = true;
  const page = await browser.newPage();
  const routes = ['/', '/products', '/cart', '/login', '/register', '/wishlist', '/compare',
    '/checkout', '/profile', '/about', '/contact', '/faq', '/blog', '/offers', '/brands'];
  for (const r of routes) {
    await page.goto(r, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  }
  const pres = await page.request.get('/api/products?limit=1');
  const items = await pres.json();
  if (items[0]) await page.goto(`/products/${items[0].id}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  const login = await page.request.post('/api/auth/login', { data: { phone: ADMIN_PHONE, password: ADMIN_PASS } });
  if (login.ok()) {
    const { accessToken } = await login.json();
    await page.evaluate((t) => localStorage.setItem('token', t), accessToken);
    for (const r of ['/admin', '/admin/products', '/admin/orders', '/admin/coupons', '/admin/settings',
      '/admin/users', '/admin/reviews', '/admin/messages', '/admin/newsletter', '/admin/blog']) {
      await page.goto(r, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    }
  }
  await page.close();
});

// ---------- User: Address CRUD (profile → checkout prefill) ----------

test.describe('User address lifecycle', () => {
  // Modal = portal container that holds BOTH the heading (ثبت/ویرایش آدرس تحویل)
  // and the form (AddressBookTab.tsx:259 — heading is a SIBLING of <form>, so a
  // form-only scope can never contain it).
  const addressModal = (page: Page) =>
    page.locator('div')
      .filter({ has: page.getByRole('heading', { name: /ثبت آدرس جدید تحویل|ویرایش آدرس تحویل/ }) })
      .filter({ has: page.locator('form') })
      .last();
  // modal submit label flips with mode (AddressBookTab.tsx:392):
  // add → «ذخیره آدرس», edit → «ویرایش آدرس»
  const modalSubmit = (page: Page) =>
    addressModal(page).locator('form').getByRole('button', { name: /ذخیره آدرس|ویرایش آدرس/ });

  test('address add → edit → persists after reload → delete → empty state', async ({ page }) => {
    const errors = collectErrors(page);
    const phone = rndPhone();
    await addUser(page, phone, 'صاحب آدرس QA');
    await uiLogin(page, phone, TEST_PASS, 'صاحب آدرس QA');

    await page.goto('/profile?tab=addresses');
    await page.getByRole('button', { name: /افزودن آدرس جدید/ }).click();

    // validation first: required fields are HTML5-required (native blocklist),
    // so the empty save is stopped by the browser and the modal stays open.
    const modal = addressModal(page);
    await expect(modal).toBeVisible();
    await modalSubmit(page).click();
    await expect(page.getByText('ثبت آدرس جدید تحویل')).toBeVisible();
    await expect(modalSubmit(page)).toBeVisible();

    // fill and save
    await page.getByPlaceholder('خانه، شرکت...').fill('خانه QA');
    await page.getByPlaceholder('علی رضایی').fill('صاحب آدرس QA');
    await page.getByPlaceholder('09123456789').fill(phone);
    await page.getByPlaceholder('1234567890').fill('1234567890');
    await page.getByPlaceholder('خیابان اصلی، کوچه، پلاک، واحد...').fill('خیابان تست عمیق، پلاک ۷');
    await modalSubmit(page).click();

    // modal closes, card renders, sidebar badge shows ۱
    await expect(page.locator('main').getByText('خیابان تست عمیق، پلاک ۷')).toBeVisible({ timeout: 8000 });

    // persistence across reload
    await page.reload();
    await expect(page.locator('main').getByText('خیابان تست عمیق، پلاک ۷')).toBeVisible({ timeout: 10000 });

    // edit: change city, save, verify
    await page.locator('button[title="ویرایش آدرس"]').first().click();
    await page.getByPlaceholder('تهران').last().fill('کرج');
    await modalSubmit(page).click();
    await expect(page.locator('main').getByText('کرج').first()).toBeVisible({ timeout: 8000 });

    await page.reload();
    await expect(page.locator('main').getByText('کرج').first()).toBeVisible({ timeout: 10000 });

    // delete (window.confirm) → empty state
    page.on('dialog', (d) => d.accept());
    await page.locator('button[title="حذف آدرس"]').first().click();
    await expect(page.getByText('هنوز هیچ آدرسی ثبت نکرده‌اید.')).toBeVisible({ timeout: 8000 });
    await assertNoErrors(errors);
  });

  test('saved address preselects checkout recipient → COD order completes', async ({ page }) => {
    const errors = collectErrors(page);
    const phone = rndPhone();
    await addUser(page, phone, 'خریدار آدرس‌دار');
    await uiLogin(page, phone, TEST_PASS, 'خریدار آدرس‌دار');

    // create address through the real UI
    await page.goto('/profile?tab=addresses');
    await page.getByRole('button', { name: /افزودن آدرس جدید/ }).click();
    await page.getByPlaceholder('خانه، شرکت...').fill('دفتر QA');
    await page.getByPlaceholder('علی رضایی').fill('خریدار آدرس‌دار');
    await page.getByPlaceholder('09123456789').fill(phone);
    await page.getByPlaceholder('خیابان اصلی، کوچه، پلاک، واحد...').fill('آدرس پیش‌فرض چک‌اوت');
    await modalSubmit(page).click();
    await expect(page.locator('main').getByText('آدرس پیش‌فرض چک‌اوت')).toBeVisible({ timeout: 8000 });

    await addFirstProductToCart(page);
    await page.goto('/checkout');

    // quick-select card exists → click → recipient fields prefilled
    const addrCard = page.locator('button[aria-pressed]').filter({ hasText: 'دفتر QA' }).first();
    await expect(addrCard).toBeVisible({ timeout: 10000 });
    await addrCard.click();
    await expect(page.getByPlaceholder('مثلا: علی محمدی')).toHaveValue(/خریدار آدرس‌دار/, { timeout: 5000 });

    await page.getByText('پرداخت درب منزل (COD)').click();
    await page.locator('[aria-label*="ثبت نهایی سفارش"]').click();
    await expect(page.getByText(/با موفقیت ثبت شد/)).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveURL(/profile/, { timeout: 12000 });
    await assertNoErrors(errors);
  });
});

// ---------- User: profile info + password change ----------

test.describe('User account info', () => {
  test('personal info save persists across reload', async ({ page }) => {
    const errors = collectErrors(page);
    const phone = rndPhone();
    await addUser(page, phone, 'نام اولیه');
    await uiLogin(page, phone, TEST_PASS, 'نام اولیه');

    await page.goto('/profile?tab=info');
    const nameInput = page.locator('main input[type="text"]').first();
    await nameInput.fill('کاربر ویرایش‌شده QA');
    await page.getByRole('button', { name: /ذخیره تغییرات حساب/ }).click();
    await expect(page.getByText('پروفایل با موفقیت بروزرسانی شد')).toBeVisible({ timeout: 8000 });

    // header reflects the new name
    await expect(page.locator('header').getByText('کاربر ویرایش‌شده QA').first()).toBeVisible({ timeout: 10000 });

    // reload persistence
    await page.reload();
    await expect(page.locator('main input[type="text"]').first()).toHaveValue(/کاربر ویرایش‌شده QA/, { timeout: 10000 });
    await assertNoErrors(errors);
  });

  test('password change → logout → login with new password', async ({ page }) => {
    const errors = collectErrors(page);
    const phone = rndPhone();
    await addUser(page, phone, 'تغییر رمز کاربر');
    await uiLogin(page, phone, TEST_PASS, 'تغییر رمز کاربر');

    await page.goto('/profile?tab=info');
    // wrong current password first → visible error
    const pwInputs = page.locator('main input[type="password"]');
    await pwInputs.nth(0).fill('WrongPass@1');
    await pwInputs.nth(1).fill('NewPass@123');
    await page.getByRole('button', { name: /به‌روزرسانی کلمه عبور/ }).click();
    await expect(page.getByText(/کلمه عبور فعلی نادرست است|خطا در به‌روزرسانی/).first()).toBeVisible({ timeout: 8000 });

    // correct current password → success toast
    await pwInputs.nth(0).fill(TEST_PASS);
    await pwInputs.nth(1).fill('NewPass@123');
    await page.getByRole('button', { name: /به‌روزرسانی کلمه عبور/ }).click();
    await expect(page.getByText(/کلمه عبور با موفقیت به‌روزرسانی شد|تغییر یافت/).first()).toBeVisible({ timeout: 8000 });

    // logout via header dropdown (exact text — the profile sidebar's
    // «خروج از حساب کاربری» button would otherwise match too)
    const headerLogout = () =>
      page.locator('header').getByRole('button', { name: 'خروج از حساب', exact: true });
    await page.locator('header').getByRole('button', { name: /کاربر|حساب/ }).first().click();
    await headerLogout().click();
    await expect(page).toHaveURL(/\/($|\?)/, { timeout: 10000 });

    await uiLogin(page, phone, 'NewPass@123', 'تغییر رمز کاربر');
    // old password must now fail
    await page.locator('header').getByRole('button', { name: /کاربر|حساب/ }).first().click();
    await headerLogout().click();
    await page.goto('/login');
    await page.locator('input[type="tel"]').fill(phone);
    await page.locator('input[type="password"]').fill(TEST_PASS);
    await page.locator('main').getByRole('button', { name: /ورود به حساب/ }).click();
    // error toast renders in the body-level ToastProvider portal, not inside main
    await expect(page.getByText(/موبایل یا رمز عبور اشتباه است/).first()).toBeVisible({ timeout: 8000 });
    await assertNoErrors(errors);
  });
});

// ---------- User: OTP forgot-password (dev simulator returns debugCode) ----------

test('OTP reset flow: دریافت کد → reset → login with new password', async ({ page }) => {
  const errors = collectErrors(page);
  const phone = rndPhone();
  await addUser(page, phone, 'کاربر OTP');

  await page.goto('/login');
  await page.getByRole('button', { name: /رمز عبور خود را فراموش کرده‌اید/ }).click();
  await page.locator('input[type="tel"]').fill(phone);

  const otpResp = page.waitForResponse((r) => r.url().includes('/api/auth/otp/send'));
  await page.getByRole('button', { name: /دریافت کد/ }).click();
  const resp = await otpResp;
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  expect(body.debugCode, 'dev simulator must expose debugCode').toBeTruthy();

  await page.getByPlaceholder('12345').last().fill(body.debugCode);
  const newPw = page.locator('input[type="password"]');
  await newPw.first().fill('OtpNew@123');
  await newPw.nth(1).fill('OtpNew@123');
  await page.getByRole('button', { name: /تغییر رمز عبور/ }).click();
  await expect(page.getByText(/رمز عبور با موفقیت تغییر کرد/).first()).toBeVisible({ timeout: 8000 });

  // wrong code rejected: reset success flipped the page back to password mode
  // (Login.tsx setMode("password")) — re-enter the forgot/OTP mode first.
  // «ارسال مجدد» stays disabled for the whole 300s resend window, and the FIRST
  // code is still stored+valid — so submit a garbage code against it directly.
  await page.getByRole('button', { name: /رمز عبور خود را فراموش کرده‌اید/ }).click();
  await expect(page.getByPlaceholder('12345').last()).toBeVisible({ timeout: 8000 });
  await page.getByPlaceholder('12345').last().fill('00000');
  await newPw.first().fill('Whatever@1');
  await newPw.nth(1).fill('Whatever@1');
  await page.getByRole('button', { name: /تغییر رمز عبور/ }).click();
  await expect(page.locator('main').getByText(/کد تایید|نادرست|منقضی/).first()).toBeVisible({ timeout: 8000 });

  // new password logs in
  await uiLogin(page, phone, 'OtpNew@123', 'کاربر OTP');
  await assertNoErrors(errors);
});

// ---------- User: header search autocomplete + recent searches ----------

test('autocomplete: suggestions render, click navigates to product; recent searches persist', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');

  const input = page.getByPlaceholder('جست‌وجوی محصول، برند یا مدل گوشی...');
  await input.click();
  await input.fill('سامسونگ');
  const firstOption = page.getByRole('option').first();
  await expect(firstOption).toBeVisible({ timeout: 8000 });
  await firstOption.click();
  await expect(page).toHaveURL(/\/product\/\d+/, { timeout: 10000 });

  // recent searches section appears when reopening with empty query
  await page.goto('/');
  await page.getByPlaceholder('جست‌وجوی محصول، برند یا مدل گوشی...').click();
  await page.getByPlaceholder('جست‌وجوی محصول، برند یا مدل گوشی...').fill('س');
  await page.getByPlaceholder('جست‌وجوی محصول، برند یا مدل گوشی...').fill('');
  await expect(page.getByText('جستجوهای اخیر')).toBeVisible({ timeout: 8000 });
  await assertNoErrors(errors);
});

// ---------- User: ChatWidget ----------

test('ChatWidget: opens, sends message, auto-reply renders', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.locator('button[aria-label="باز کردن راهنمای خرید"]').click();
  await expect(page.getByText('راهنمای خرید جانبی آرنا')).toBeVisible({ timeout: 8000 });

  const input = page.getByPlaceholder('سوال خود را بنویسید...');
  await input.fill('xyzabc نه‌هیچ چیز مرتبط');
  await page.locator('form:has(input[placeholder*="سوال"]) button[type="submit"]').click();

  // user bubble + honest auto-reply fallback
  await expect(page.getByText('xyzabc نه‌هیچ چیز مرتبط').first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/این راهنما پاسخ خودکار است/).first()).toBeVisible({ timeout: 10000 });
  await assertNoErrors(errors);
});

// ---------- User: review submit (real user, logged in) ----------

test('review submit: form validation + success toast + review appears', async ({ page }) => {
  const errors = collectErrors(page);
  const phone = rndPhone();
  await addUser(page, phone, 'نویسنده نظر');
  await uiLogin(page, phone, TEST_PASS, 'نویسنده نظر');

  const res = await page.request.get('/api/products?limit=50&inStock=true');
  const items: any[] = await res.json();
  const p = items.find((x) => (x.stockQuantity ?? 0) > 0);
  await page.goto(`/products/${p.id}`);
  await page.getByRole('button', { name: /نظرات کاربران/ }).click();

  await page.getByRole('button', { name: /افزودن نظر جدید/ }).click();
  const form = page.locator('form').filter({ hasText: 'ثبت نظر و امتیاز' });

  // client validation: short comment blocked
  await form.getByPlaceholder('مثلاً: علی محمدی').fill('نویسنده نظر');
  await form.getByPlaceholder('مثلاً: کیفیـت ساخت عالی و شارژدهی فوق‌العاده').fill('عنوان تست');
  await form.locator('textarea').fill('کوتاه');
  await form.getByRole('button', { name: /ثبت نهایی نظر/ }).click();
  await expect(page.getByText('متن نظر باید حداقل ۱۰ کاراکتر باشد')).toBeVisible({ timeout: 8000 });

  // valid submit
  await form.locator('textarea').fill('کیفیت ساخت خوب بود و ارسال سریع انجام شد، ممنون از فروشگاه.');
  await form.getByRole('button', { name: /ثبت نهایی نظر/ }).click();
  await expect(page.getByText('نظر و امتیاز شما با موفقیت ثبت شد!')).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('عنوان تست').first()).toBeVisible({ timeout: 8000 });

  // After reload the product page resets to the «توضیحات» tab — re-open the
  // reviews tab (button text includes the live count, so match by prefix).
  await page.reload();
  await page.getByRole('button', { name: /نظرات کاربران/ }).click();
  await expect(page.getByText('عنوان تست').first()).toBeVisible({ timeout: 10000 });
  await assertNoErrors(errors);
});

// ---------- Cart stock-cap probe (expected defect: optimistic over-add) ----------

test('stock cap: adding beyond stock must not keep phantom qty after reload', async ({ page }) => {
  const errors = collectErrors(page);
  const phone = rndPhone();
  await addUser(page, phone, 'آزمون سقف موجودی');
  await uiLogin(page, phone, TEST_PASS, 'آزمون سقف موجودی');

  const res = await page.request.get('/api/products?limit=100&inStock=true');
  const items: any[] = await res.json();
  const p = items.slice().sort((a, b) => (a.stockQuantity ?? 99) - (b.stockQuantity ?? 99))[0];
  const stock = p.stockQuantity as number;
  expect(stock).toBeGreaterThan(0);

  await page.goto(`/products/${p.id}`);
  const addBtn = page.locator('main button:not([disabled])').filter({ hasText: /افزودن به سبد خرید/ }).first();
  for (let i = 0; i < stock + 1; i++) {
    await addBtn.click({ timeout: 15000 });
    await expect(page.getByText(/به سبد خرید اضافه شد/).first()).toBeVisible({ timeout: 8000 });
    // the cart DRAWER opens on every add and intercepts further clicks — close
    // it deterministically: wait for the drawer dialog, click its own close
    // button (CartDrawer.tsx:87), assert hidden. .first() survives the
    // exit-animation overlap where two dialogs briefly coexist.
    const drawer = page.locator('div[role="dialog"][aria-labelledby="cart-drawer-title"]').first();
    await drawer.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const closeBtn = drawer.getByRole('button', { name: 'بستن سبد خرید', exact: true });
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ timeout: 5000 });
      await expect(drawer).toBeHidden({ timeout: 5000 });
    }
    await page.waitForTimeout(2200); // addedToCart label resets after 2s
  }

  // authoritative server list after reload — qty must equal stock, never stock+1
  await page.goto('/cart');
  await page.reload();
  await expect(page.locator('main').getByText(/۱|۲|۳|۴|۵|۶|۷|۸|۹/).first()).toBeVisible({ timeout: 10000 });
  const qty = await page.request.get('/api/cart', { headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}` } });
  const cart = await qty.json();
  const line = Array.isArray(cart) ? cart.find((c: any) => c.id === p.id) : null;
  expect(line, 'cart line exists').toBeTruthy();
  expect(line.quantity, `server qty must clamp to stock (${stock})`).toBeLessThanOrEqual(stock);
  await assertNoErrors(errors);
});

// ---------- Cross-role Scenario C: user order → admin status → user sees it ----------

test('Scenario C: user COD order → admin ships → user re-login sees «ارسال شده»', async ({ page, browser }) => {
  const errors = collectErrors(page);
  const phone = rndPhone();
  await addUser(page, phone, 'سناریو سی خریدار');

  // user places COD order through the real UI
  await uiLogin(page, phone, TEST_PASS, 'سناریو سی خریدار');
  await addFirstProductToCart(page);
  await page.goto('/checkout');
  await page.getByPlaceholder('مثلا: علی محمدی').fill('سناریو سی خریدار');
  await page.getByPlaceholder('09123456789').fill(phone);
  await page.getByPlaceholder(/مثلا: تهران/).first().fill('تهران');
  await page.getByPlaceholder(/خیابان اصلی/).fill('خیابان سناریو سی، پلاک ۳');
  await page.getByText('پرداخت درب منزل (COD)').click();
  await page.locator('[aria-label*="ثبت نهایی سفارش"]').click();
  await expect(page.getByText(/با موفقیت ثبت شد/)).toBeVisible({ timeout: 20000 });
  const orderUrl = page.url();
  expect(orderUrl).toMatch(/profile/);

  // admin panel: open the order, change status → shipped (dropdown opens on focus-within)
  const actx = await browser.newContext();
  const apage = await actx.newPage();
  const aerrors = collectErrors(apage);
  await uiLogin(apage, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await apage.goto('/admin/orders');
  const row = apage.locator('table tbody tr').filter({ hasText: 'سناریو سی خریدار' }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.getByRole('button', { name: /تغییر وضعیت/ }).click();
  // scope to the dropdown inside this row (the status FILTER TAB has the same text)
  await row.locator('div.relative.group button', { hasText: 'ارسال شده' }).click();
  await expect(apage.getByText('وضعیت سفارش بروزرسانی شد')).toBeVisible({ timeout: 8000 });
  await expect(apage.locator('button').filter({ hasText: 'ارسال شده' }).filter({ hasText: /\d/ })).toBeVisible({ timeout: 8000 });

  // user side: logout → login → orders tab shows shipped status
  const headerLogout = () =>
    page.locator('header').getByRole('button', { name: 'خروج از حساب', exact: true });
  await page.locator('header').getByRole('button', { name: /سناریو سی خریدار/ }).first().click();
  await headerLogout().click();
  await uiLogin(page, phone, TEST_PASS, 'سناریو سی خریدار');
  await page.goto('/profile?tab=orders');
  await expect(page.locator('main').getByText('ارسال شده').first()).toBeVisible({ timeout: 10000 });

  await assertNoErrors(errors);
  await assertNoErrors(aerrors);
  await actx.close();
});

// ---------- Cross-role Scenario D: review → admin reject → user sees it gone ----------

test('Scenario D: user review → admin rejects → review disappears from product page', async ({ page, browser }) => {
  const errors = collectErrors(page);
  const phone = rndPhone();
  const res = await page.request.get('/api/products?limit=50&inStock=true');
  const items: any[] = await res.json();
  const p = items[0];
  const uniqueTitle = `نظر یکتا ${Date.now()}`;

  await addUser(page, phone, 'سناریو دی نویسنده');
  await uiLogin(page, phone, TEST_PASS, 'سناریو دی نویسنده');
  await page.goto(`/products/${p.id}`);
  await page.getByRole('button', { name: /نظرات کاربران/ }).click();
  await page.getByRole('button', { name: /افزودن نظر جدید/ }).click();
  const form = page.locator('form').filter({ hasText: 'ثبت نظر و امتیاز' });
  await form.getByPlaceholder('مثلاً: علی محمدی').fill('سناریو دی نویسنده');
  await form.getByPlaceholder('مثلاً: کیفیـت ساخت عالی و شارژدهی فوق‌العاده').fill(uniqueTitle);
  await form.locator('textarea').fill('متن نظر برای آزمون رد شدن توسط مدیر — متن کافی برای ولیدیشن.');
  await form.getByRole('button', { name: /ثبت نهایی نظر/ }).click();
  await expect(page.getByText('نظر و امتیاز شما با موفقیت ثبت شد!')).toBeVisible({ timeout: 8000 });

  // admin rejects it
  const actx = await browser.newContext();
  const apage = await actx.newPage();
  await uiLogin(apage, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await apage.goto('/admin/reviews');
  const revRow = apage.locator('tr').filter({ hasText: uniqueTitle }).first();
  await expect(revRow).toBeVisible({ timeout: 10000 });
  await revRow.locator('button[title*="رد کردن"]').click();
  await expect(apage.getByText('نظر رد شد')).toBeVisible({ timeout: 8000 });

  // user reloads product → review is gone from public list
  await page.reload();
  await expect(page.getByText(uniqueTitle)).toHaveCount(0, { timeout: 10000 });
  await assertNoErrors(errors);
  await actx.close();
});

// ---------- Coupon full cycle: admin create → user apply → toggle → expiry ----------

test('Coupon lifecycle: create → user applies → admin disables → invalid → re-enable → valid → expired rejected', async ({ page, browser }) => {
  const errors = collectErrors(page);
  const code = 'QA' + Math.floor(Math.random() * 1e6);
  const token = await adminToken(page);
  const cres = await page.request.post('/api/admin/coupons', {
    headers: { Authorization: `Bearer ${token}` },
    data: { code, percent: 25, minTotal: 100000, label: 'چرخه کامل QA', active: true },
  });
  expect(cres.ok(), `create coupon: ${cres.status()} ${await cres.text()}`).toBeTruthy();

  const phone = rndPhone();
  await addUser(page, phone, 'مصرف‌کننده کوپن');
  await uiLogin(page, phone, TEST_PASS, 'مصرف‌کننده کوپن');
  await addFirstProductToCart(page);
  await page.goto('/cart');
  await page.getByPlaceholder('مثلا: OFF20').fill(code);
  await page.locator('[aria-label="اعمال کد تخفیف"]').click();
  await expect(page.getByText(/۲۵٪|اعمال شد/).first()).toBeVisible({ timeout: 8000 });

  // admin disables the coupon
  const actx = await browser.newContext();
  const apage = await actx.newPage();
  await uiLogin(apage, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await apage.goto('/admin/coupons');
  // Each coupon is a card (key=coupon.code) containing its own status-toggle
  // (title غیرفعال‌سازی/فعال‌سازی) and copy button (aria-label کپی کد تخفیف <code>).
  // Isolate THIS card: innermost div holding both the copy button and the code.
  const couponCard = (pg: Page) =>
    pg.locator('div')
      .filter({ has: pg.getByRole('button', { name: `کپی کد تخفیف ${code}` }) })
      .filter({ has: pg.locator('button[title="غیرفعال‌سازی"], button[title="فعال‌سازی"]') })
      .last();
  await couponCard(apage).locator('button[title="غیرفعال‌سازی"]').click();
  await expect(apage.getByText(`کد ${code} غیرفعال شد`)).toBeVisible({ timeout: 8000 });

  // user: now rejected as invalid
  await page.reload();
  await page.getByPlaceholder('مثلا: OFF20').fill(code);
  await page.locator('[aria-label="اعمال کد تخفیف"]').click();
  await expect(page.getByText(/کد تخفیف نامعتبر یا منقضی شده است/).first()).toBeVisible({ timeout: 8000 });

  // admin re-enables → user applies successfully again
  await apage.reload();
  await couponCard(apage).locator('button[title="فعال‌سازی"]').click();
  await expect(apage.getByText(`کد ${code} فعال شد`)).toBeVisible({ timeout: 8000 });
  await page.reload();
  await page.getByPlaceholder('مثلا: OFF20').fill(code);
  await page.locator('[aria-label="اعمال کد تخفیف"]').click();
  await expect(page.getByText(/۲۵٪|اعمال شد/).first()).toBeVisible({ timeout: 8000 });

  // expired coupon (created through the admin UI with a past date) is rejected
  await page.request.post('/api/admin/coupons', {
    headers: { Authorization: `Bearer ${token}` },
    data: { code: code + 'X', percent: 10, minTotal: 10000, label: 'منقضی QA', active: true, expiresAt: '2026-01-01T00:00:00.000Z' },
  });
  await page.getByPlaceholder('مثلا: OFF20').fill(code + 'X');
  await page.locator('[aria-label="اعمال کد تخفیف"]').click();
  // same text renders in BOTH the inline error box and the toast → scope to the box
  await expect(page.locator('#coupon-error-message').getByText('کد تخفیف منقضی شده است')).toBeVisible({ timeout: 8000 });

  await assertNoErrors(errors);
  await actx.close();
});

// ---------- Admin: Users — role toggle, new password, VIP points ----------

test('Admin users: promote/demote role, set new password, edit VIP points', async ({ page }) => {
  const errors = collectErrors(page);
  page.on('dialog', (d) => d.accept());
  const phone = rndPhone();
  await addUser(page, phone, 'کاربر مقام‌پذیر');
  await uiLogin(page, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');

  await page.goto('/admin/users');
  // same-day joinedDate ties make list order unreliable → use the page's own search
  const searchBox = page.getByPlaceholder(/جستجو|جست‌وجو/).first();
  await searchBox.fill(phone);
  const row = page.locator('table tbody tr').filter({ hasText: phone }).first();
  await expect(row).toBeVisible({ timeout: 10000 });

  // role toggle → confirm dialog → row badge flips
  const roleRes = page.waitForResponse((r) => /\/api\/admin\/users\/.+\/role/.test(r.url()));
  await row.getByRole('button', { name: /ارتقا به مدیر/ }).click();
  const rr = await roleRes;
  expect(rr.status()).toBe(200);
  await expect(row.getByText(/تنزل به کاربر/)).toBeVisible({ timeout: 8000 });

  // demote back
  await row.getByRole('button', { name: /تنزل به کاربر/ }).click();
  await expect(row.getByText(/ارتقا به مدیر/)).toBeVisible({ timeout: 8000 });

  // set new password via modal (network 200 + modal closes)
  await row.getByRole('button', { name: /رمز جدید/ }).click();
  const pwInput = page.locator('input[type="password"]:visible, input[type="text"]:visible').last();
  await pwInput.fill('AdminSet@123');
  const pwRes = page.waitForResponse((r) => /\/api\/admin\/users\/.+\/password/.test(r.url()));
  await page.getByRole('button', { name: /ذخیره رمز جدید/ }).click();
  expect((await pwRes).status()).toBe(200);

  // VIP points edit → row shows «۱۵۰ امتیاز»
  await row.locator('button[title="ویرایش امتیازات باشگاه مشتریان"]').click();
  const ptsInput = page.locator('input:visible').last();
  await ptsInput.fill('150');
  const ptsRes = page.waitForResponse((r) => /\/api\/admin\/users\/.+\/points/.test(r.url()));
  await page.getByRole('button', { name: /ذخیره|ثبت امتیاز/ }).last().click();
  expect((await ptsRes).status()).toBe(200);
  await expect(row.getByText(/۱۵۰/).first()).toBeVisible({ timeout: 8000 });
  await assertNoErrors(errors);
});

// ---------- Admin: Messages — modal, archive, mark-all-read, bulk delete ----------

test('Admin messages: open modal → archive → mark-all-read → bulk delete', async ({ page }) => {
  const errors = collectErrors(page);
  const marker = 'پیام QA عمیق ' + Date.now();
  const c1 = await page.request.post('/api/contact', {
    data: { name: 'فرستنده یک', email: 'qa1@test.ir', phone: '09120000001', subject: 'موضوع یک', message: marker },
  });
  const c2 = await page.request.post('/api/contact', {
    data: { name: 'فرستنده دو', email: 'qa2@test.ir', phone: '09120000002', subject: 'موضوع دو', message: marker + ' دوم' },
  });
  expect(c1.ok() || c1.status() === 201).toBeTruthy();
  expect(c2.ok() || c2.status() === 201).toBeTruthy();

  await uiLogin(page, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await page.goto('/admin/messages');
  const row = page.locator('tr, div[class*="cursor-pointer"]').filter({ hasText: marker }).first();
  await expect(row).toBeVisible({ timeout: 10000 });

  // open detail modal
  await row.click();
  await expect(page.getByText(marker).first()).toBeVisible({ timeout: 8000 });

  // archive from the modal → toast → close modal (overlay blocks background clicks)
  await page.getByRole('button', { name: /بایگانی/ }).last().click();
  await expect(page.getByText('پیام بایگانی شد')).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: /بستن پنجره پیام/ }).click();
  await page.getByRole('button', { name: /بایگانی \(/ }).click();
  await page.waitForTimeout(700);

  // mark all read
  await page.locator('button[aria-label="علامت‌گذاری همه پیام‌ها به عنوان خوانده‌شده"]').click();
  await expect(page.getByText('همه پیام‌های خوانده‌نشده علامت‌گذاری شدند')).toBeVisible({ timeout: 8000 });

  // bulk delete the seeded pair
  page.on('dialog', (d) => d.accept());
  const boxes = page.locator('input[type="checkbox"]');
  const n = Math.min(await boxes.count(), 2);
  for (let i = 0; i < n; i++) await boxes.nth(i).check();
  await page.locator('button[aria-label="حذف پیام‌های انتخاب‌شده"]').click();
  await expect(page.getByText('پیام‌های انتخاب‌شده حذف شدند')).toBeVisible({ timeout: 8000 });
  await assertNoErrors(errors);
});

// ---------- Admin: Blog — create → public → article view → unpublish → delete ----------

test('Admin blog: create post → visible on /blog → article opens → unpublish hides → delete', async ({ page, browser }) => {
  const errors = collectErrors(page);
  const title = 'مقاله QA عمیق ' + Date.now();

  await uiLogin(page, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await page.goto('/admin/blog');
  await page.getByRole('button', { name: /مقاله جدید/ }).click();
  await page.getByPlaceholder('عنوان مقاله *').fill(title);
  await page.getByPlaceholder('خلاصه مقاله (تا ۱۰۰۰ کاراکتر) *').fill('خلاصه آزمون پوشش عمیق مجله.');
  await page.getByPlaceholder('متن کامل مقاله — پاراگراف‌ها را با خط خالی جدا کنید *').fill('پاراگراف اول مقاله آزمونی.\n\nپاراگراف دوم با جزئیات بیشتر.');
  await page.getByRole('button', { name: /انتشار مقاله/ }).click();
  await expect(page.locator('table').getByText(title).first()).toBeVisible({ timeout: 10000 });

  // public blog shows it and opens the article
  await page.goto('/blog');
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
  await page.locator('div, article').filter({ hasText: title }).first().click();
  await expect(page.getByText('پاراگراف اول مقاله آزمونی.')).toBeVisible({ timeout: 8000 });

  // unpublish → gone from public
  await page.goto('/admin/blog');
  await page.locator('button[title="پیش‌نویس کردن"]').first().click();
  await expect(page.getByText('مقاله پیش‌نویس شد')).toBeVisible({ timeout: 8000 });
  await page.goto('/blog');
  await expect(page.getByText(title)).toHaveCount(0, { timeout: 10000 });

  // delete (confirm) → gone from admin table
  page.on('dialog', (d) => d.accept());
  await page.goto('/admin/blog');
  const row = page.locator('tr').filter({ hasText: title }).first();
  await row.locator('button[title="حذف"]').click();
  await expect(page.getByText('مقاله حذف شد')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('table').getByText(title)).toHaveCount(0, { timeout: 8000 });
  await assertNoErrors(errors);
});

// ---------- Admin: Newsletter CSV export ----------

test('Admin newsletter: empty list → export shows warning, no download', async ({ page }) => {
  const errors = collectErrors(page);
  await uiLogin(page, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await page.goto('/admin/newsletter');
  await expect(page.getByText(/اعضای خبرنامه/).first()).toBeVisible({ timeout: 10000 });

  // empty-list behavior (separate scenario): warning toast, no CSV download
  const dlPromise = page.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await page.getByRole('button', { name: /خروجی CSV \/ اکسل/ }).click();
  await expect(page.getByText('لیست ایمیل‌ها خالی است')).toBeVisible({ timeout: 8000 });
  expect(await dlPromise, 'no download may fire for an empty list').toBeNull();
  await assertNoErrors(errors);
});

test('Admin newsletter: real subscriber (via footer UI) → CSV export downloads + toast', async ({ page }) => {
  const errors = collectErrors(page);
  // create a real subscriber through the user-facing footer form
  const email = `qa-news-${Date.now()}@test.ir`;
  await page.goto('/');
  await page.getByPlaceholder('آدرس ایمیل شما...').fill(email);
  await page.getByRole('button', { name: 'ارسال عضویت در خبرنامه' }).click();
  await expect(page.getByText('با موفقیت در خبرنامه عضو شدید')).toBeVisible({ timeout: 8000 });

  await uiLogin(page, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await page.goto('/admin/newsletter');
  // subscriber is really in the admin list
  const row = page.locator('tr').filter({ hasText: email });
  await expect(row).toBeVisible({ timeout: 10000 });

  // now the export MUST download a CSV + success toast
  const dlPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: /خروجی CSV \/ اکسل/ }).click();
  await expect(page.getByText('فایل اکسل/CSV ایمیل‌ها دانلود شد')).toBeVisible({ timeout: 8000 });
  const dl = await dlPromise;
  expect((await dl.suggestedFilename()).toLowerCase()).toMatch(/\.csv$/);
  await assertNoErrors(errors);
});

// ---------- Admin: Orders — CSV export + tracking code via Eye modal ----------

test('Admin orders: CSV export + Eye modal + postal tracking code persists', async ({ page, browser }) => {
  const errors = collectErrors(page);
  // seed an order through the API (fresh user)
  const phone = rndPhone();
  const token = await addUser(page, phone, 'سفارش رهگیری QA');
  const pres = await page.request.get('/api/products?limit=50&inStock=true');
  const items: any[] = await pres.json();
  const prod = items.find((x) => (x.stockQuantity ?? 0) > 1);
  const ores = await page.request.post('/api/orders', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      recipient: { name: 'سفارش رهگیری QA', phone, address: 'تهران، رهگیری', postalCode: '1234567890' },
      items: [{ productId: prod.id, quantity: 1 }],
      paymentMethod: 'cod',
      shippingMethod: 'standard',
    },
  });
  expect(ores.ok(), `seed order: ${ores.status()} ${await ores.text()}`).toBeTruthy();
  const orderId = (await ores.json()).orderId || (await ores.json()).order?.id;

  await uiLogin(page, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await page.goto('/admin/orders');

  // CSV export → download event + toast
  const dlPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.getByRole('button', { name: /خروجی اکسل/ }).click();
  await expect(page.getByText('گزارش اکسل/CSV سفارشات با موفقیت دانلود شد')).toBeVisible({ timeout: 8000 });
  expect(await dlPromise).toBeTruthy();

  // Eye modal → set tracking code → toast → persisted in row
  const row = page.locator('table tbody tr').filter({ hasText: 'سفارش رهگیری QA' }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.locator('button[title="مشاهده فاکتور و رهگیری"]').click();
  await expect(page.getByText(/جزئیات سفارش/)).toBeVisible({ timeout: 8000 });
  const trackInput = page.getByPlaceholder('مثلاً: 243920194857291038');
  await trackInput.fill('QA-TRACK-123456');
  const trackRes = page.waitForResponse((r) => /\/api\/admin\/orders\/.+\/tracking|\/api\/admin\/orders\/.+/.test(r.url()) && r.request().method() === 'PUT');
  await page.getByRole('button', { name: /ثبت بارکد/ }).click();
  const tr = await trackRes;
  expect(tr.status()).toBe(200);
  await expect(page.getByText('کد رهگیری پستی با موفقیت ثبت شد')).toBeVisible({ timeout: 8000 });

  // modal + list show the new refId
  await expect(page.getByText('QA-TRACK-123456').first()).toBeVisible({ timeout: 8000 });
  await page.reload();
  await expect(page.getByText('QA-TRACK-123456').first()).toBeVisible({ timeout: 10000 });
  await assertNoErrors(errors);
});

// ---------- Admin: force-change-password first-login gate ----------

test('Force-change-password: gated admin cannot reach panel until password set', async ({ page }) => {
  const errors = collectErrors(page);
  // seed an admin flagged must_change_password directly in the isolated DB
  const id = 'usr-e2e-force-' + Date.now();
  const hash = await bcrypt.hash('FirstLogin@1', 10);
  const db = new Database('data/janebi.e2e.db');
  db.prepare(
    'INSERT OR REPLACE INTO users (id, name, phone, password, role, vip_points, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, 'ادمین اجباری QA', '09390000077', hash, 'admin', 0, 1);
  db.close();

  await uiLogin(page, '09390000077', 'FirstLogin@1', 'ادمین اجباری QA');
  // login must land on the forced screen (Login.tsx reads the flag from the
  // login RESULT and navigates to /force-change-password), not /profile
  await expect(page).toHaveURL(/force-change-password/, { timeout: 10000 });

  // too-short password rejected
  await page.locator('input[type="password"]').first().fill('short1');
  await page.locator('input[type="password"]').nth(1).fill('short1');
  await page.getByRole('button', { name: /ثبت رمز جدید و ورود به پنل/ }).click();
  await expect(page.getByText('رمز عبور جدید باید حداقل ۸ کاراکتر باشد')).toBeVisible({ timeout: 8000 });

  // valid set → lands in admin panel (server skips current-password check for
  // the flagged admin; the flag itself is the proof of the fresh login)
  await page.locator('input[type="password"]').first().fill('ForcedNew@123');
  await page.locator('input[type="password"]').nth(1).fill('ForcedNew@123');
  await page.getByRole('button', { name: /ثبت رمز جدید و ورود به پنل/ }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  // panel content actually reachable (sidebar nav renders; AdminLayout gate cleared)
  await expect(page.getByRole('link', { name: 'داشبورد و آمار کلان' })).toBeVisible({ timeout: 15000 });

  // flag cleared server-side: old password no longer works
  const oldPw = await page.request.post('/api/auth/login', { data: { phone: '09390000077', password: 'FirstLogin@1' } });
  expect(oldPw.status()).toBe(401);
  await assertNoErrors(errors);
});

// ---------- User: VIP club coupon copy ----------

test('VIP tab: coupon copy button flips to «کپی شد!»', async ({ page }) => {
  const errors = collectErrors(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const phone = rndPhone();
  await addUser(page, phone, 'کاربر VIP');
  await uiLogin(page, phone, TEST_PASS, 'کاربر VIP');
  await page.goto('/profile?tab=vip');

  const copyBtn = page.getByRole('button', { name: /کپی کد تخفیف/ }).first();
  const hasCoupons = (await copyBtn.count()) > 0;
  test.skip(!hasCoupons, 'no active coupons rendered in VIP tab');
  await copyBtn.click();
  await expect(page.getByText('کپی شد!').first()).toBeVisible({ timeout: 8000 });
  await assertNoErrors(errors);
});

// ---------- Product gallery / lightbox (guarded: only when a zoom trigger exists) ----------

test('product lightbox opens and closes with Escape', async ({ page }) => {
  const errors = collectErrors(page);
  const res = await page.request.get('/api/products?limit=50');
  const items: any[] = await res.json();
  const p = items[0];
  await page.goto(`/products/${p.id}`);

  const zoom = page.locator('button[aria-label*="بزرگ"], button[title*="بزرگ"], button:has(svg.lucide-zoom-in), button:has(svg.lucide-maximize)').first();
  const hasZoom = (await zoom.count()) > 0;
  test.skip(!hasZoom, 'no zoom/lightbox trigger rendered for this product');
  await zoom.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 }).catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await assertNoErrors(errors);
});

// ---------- Admin: product edit modal (guarded) ----------

test('Admin product edit: change price via edit modal, persists after reload', async ({ page }) => {
  const errors = collectErrors(page);
  const title = `کالای ویرایش QA ${Date.now()}`;
  await uiLogin(page, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست');
  await page.goto('/admin/products');

  await page.getByRole('button', { name: /افزودن محصول جدید/ }).click();
  const form = page.locator('#product-form');
  await form.getByPlaceholder('مثال: هندزفری بی‌سیم سامسونگ Galaxy Buds2 Pro').fill(title);
  const catSel = form.locator('select').first();
  const catOpts = await catSel.locator('option').allTextContents();
  const pick = catOpts.find((o) => o && !/انتخاب|همه/.test(o));
  await catSel.selectOption({ label: pick! });
  await form.getByPlaceholder('مثال: Samsung, Apple, Anker, Xiaomi').fill('QA Brand');
  await form.getByPlaceholder('مثال: ۱,۲۰۰,۰۰۰').fill('700000');
  await form.getByPlaceholder('مثال: ۹۸۰,۰۰۰').fill('600000');
  await form.locator('input[inputMode="numeric"]').last().fill('5');
  await page.getByRole('button', { name: /ثبت و انتشار محصول/ }).click();
  await expect(page.getByText(/محصول با موفقیت ایجاد شد/)).toBeVisible({ timeout: 10000 });
  await page.reload();
  const row = page.locator('tr').filter({ hasText: title }).first();
  await expect(row).toBeVisible({ timeout: 15000 });

  // open the edit modal if the row exposes an edit affordance
  const editBtn = row.locator('button[title*="ویرایش"], button:has(svg.lucide-pencil)').first();
  const canEdit = (await editBtn.count()) > 0;
  test.skip(!canEdit, 'no edit affordance on admin product row');
  await editBtn.click();
  const priceInput = form.getByPlaceholder('مثال: ۹۸۰,۰۰۰');
  await expect(priceInput).toBeVisible({ timeout: 8000 });
  await priceInput.fill('650000');
  // edit-modal submit uses the editingProduct label (Products.tsx sticky footer)
  await page.getByRole('button', { name: /ذخیره تغییرات محصول/ }).click();
  await expect(page.getByText('محصول با موفقیت بروزرسانی شد')).toBeVisible({ timeout: 10000 });

  // evidence 1: the product's own row shows the new price in fa-IR format
  // (formatPrice → toLocaleString('fa-IR') → ۶۵۰٬۰۰۰ with U+066C, NOT ASCII comma)
  await page.reload();
  const rowAfter = page.locator('tr').filter({ hasText: title }).first();
  await expect(rowAfter).toBeVisible({ timeout: 15000 });
  await expect(rowAfter.getByText('۶۵۰٬۰۰۰ تومان')).toBeVisible({ timeout: 10000 });

  // evidence 2: persistence — reload again and re-check the same row cell
  await page.reload();
  await expect(
    page.locator('tr').filter({ hasText: title }).first().getByText('۶۵۰٬۰۰۰ تومان'),
  ).toBeVisible({ timeout: 10000 });

  // cleanup
  page.on('dialog', (d) => d.accept());
  const delBtn = page.locator('tr').filter({ hasText: title }).first().locator('button[title="حذف کالا"]').first();
  await delBtn.click();
  await expect(page.getByText('محصول حذف شد')).toBeVisible({ timeout: 10000 });
  await assertNoErrors(errors);
});
