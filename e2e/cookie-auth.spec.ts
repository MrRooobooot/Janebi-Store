// Cookie-only auth proof (SEC-H6): after the localStorage JWT mirror was
// removed, a browser session must work end to end on the HttpOnly cookie
// alone — no client-readable credential anywhere.
// Run standalone: E2E_MATCH=cookie-auth.spec.ts npm run test:e2e
import { test, expect, type Page } from '@playwright/test';

const ADMIN_PHONE = '09390000001';
const ADMIN_PASS = 'E2eAdmin@123';
const TEST_PASS = 'E2eUser@123';
const rndPhone = () => '0939' + Math.floor(1000000 + Math.random() * 8999999);

async function uiLogin(page: Page, phone: string, password: string, nameHint: string) {
  await page.goto('/login');
  await page.locator('input[type="tel"]').fill(phone);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('main').getByRole('button', { name: /ورود به حساب/ }).click();
  await expect(page.locator('header').getByText(new RegExp(nameHint)).first()).toBeVisible({ timeout: 15000 });
}

test.describe('cookie-only session', () => {
  test('a guest boot stores nothing and logs no auth error', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/', { waitUntil: 'load' });
    expect(errors.filter((e) => /401|Unauthorized/i.test(e))).toEqual([]);
    const ls = await page.evaluate(() => Object.keys(localStorage).filter((k) => /token/i.test(k)));
    expect(ls).toEqual([]);
  });

  test('login leaves NO script-readable credential (no localStorage JWT, no token cookie)', async ({ page }) => {
    const phone = rndPhone();
    const reg = await page.request.post('/api/auth/register', {
      data: { name: 'کاربر کوکی', phone, password: TEST_PASS },
    });
    expect(reg.ok(), `seed: ${reg.status()} ${await reg.text()}`).toBeTruthy();

    await uiLogin(page, phone, TEST_PASS, 'کاربر کوکی');

    const ls = await page.evaluate(() => Object.keys(localStorage));
    expect(ls.filter((k) => /token/i.test(k)), `localStorage keys: ${ls.join(',')}`).toEqual([]);
    const cookie = await page.evaluate(() => document.cookie);
    expect(cookie).not.toContain('accessToken');
    expect(cookie).not.toContain('refreshToken');
  });

  test('authenticated endpoints answer on cookies alone, and survive a reload', async ({ page }) => {
    const phone = rndPhone();
    await page.request.post('/api/auth/register', { data: { name: 'کوکی دو', phone, password: TEST_PASS } });
    await uiLogin(page, phone, TEST_PASS, 'کوکی دو');

    // in-page fetch: no Authorization header is ever set by the app any more
    const me = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me');
      return { status: res.status, body: await res.json().catch(() => null) };
    });
    expect(me.status).toBe(200);
    expect(me.body?.user?.phone || me.body?.phone).toBeTruthy();

    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('header').getByText(/کوکی دو/).first()).toBeVisible({ timeout: 15000 });
  });

  test('cart and wishlist writes are authorized by the cookie and persist server-side', async ({ page }) => {
    const phone = rndPhone();
    await page.request.post('/api/auth/register', { data: { name: 'کوکی سه', phone, password: TEST_PASS } });
    await uiLogin(page, phone, TEST_PASS, 'کوکی سه');

    const list = await page.request.get('/api/products?limit=50&inStock=true');
    const items: any[] = await list.json();
    const p = items.find((x) => (x.stockQuantity ?? 0) > 0);
    expect(p, 'no in-stock product').toBeTruthy();

    await page.goto(`/products/${p.id}`);
    const addBtn = page.locator('main button:not([disabled])').filter({ hasText: /افزودن به سبد خرید/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await expect(page.getByText(/به سبد خرید اضافه شد|به سبد افزوده شد/).first()).toBeVisible({ timeout: 8000 });

    const cart = await page.request.get('/api/cart');
    expect(cart.status()).toBe(200);
    const cartBody: any[] = await cart.json();
    expect(Array.isArray(cartBody) ? cartBody.length : 0).toBeGreaterThan(0);

    const wish = await page.request.post('/api/wishlist', { data: { productId: p.id } });
    expect([200, 201]).toContain(wish.status());
    const wl = await page.request.get('/api/wishlist');
    expect(wl.status()).toBe(200);
  });

  test('admin panel authorization rides the cookie too', async ({ page }) => {
    await uiLogin(page, ADMIN_PHONE, ADMIN_PASS, 'ادمین تست E2E');
    const stats = await page.evaluate(async () => (await fetch('/api/admin/stats')).status);
    expect(stats).toBe(200);
    const noAuth = await page.request.get('/api/admin/stats', { headers: { Cookie: '' } });
    expect(noAuth.status()).toBe(401);
  });
});
