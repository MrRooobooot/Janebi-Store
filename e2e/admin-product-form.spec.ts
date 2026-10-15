import fs from 'fs';
import path from 'path';
import { test, expect, type Page } from '@playwright/test';

/**
 * Admin «افزودن کالا» form — real-user checks on the isolated E2E DB.
 * Each check is a click/typing with a visible outcome. SHOTS_DIR, when set,
 * also writes screenshots for design review.
 */

const ADMIN_PHONE = '09390000001';
const ADMIN_PASS = 'E2eAdmin@123';
const SHOTS = process.env.SHOTS_DIR || '';
const PHOTO_A = path.join(process.cwd(), 'public/images/hero/holder.webp');
const PHOTO_B = path.join(process.cwd(), 'public/images/hero/cable.webp');
const photoB = () => ({ name: 'cable.webp', mimeType: 'image/webp', buffer: fs.readFileSync(PHOTO_B) });

// Vite dev-server HMR socket noise (and its client error reports) is not an app error.
const DEV_NOISE = /WebSocket|\[vite\]|Vite server|Failed to load resource|Importing a module script failed/;

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    if (!DEV_NOISE.test(e.message)) errors.push(`pageerror: ${e.message}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !DEV_NOISE.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="tel"]').fill(ADMIN_PHONE);
  await page.locator('input[type="password"]').fill(ADMIN_PASS);
  await page.locator('main').getByRole('button', { name: /ورود به حساب/ }).click();
  await expect(page.locator('header').getByText(/ادمین تست/).first()).toBeVisible({ timeout: 12000 });
}

async function openAddForm(page: Page) {
  await login(page);
  await page.goto('/admin/products');
  await expect(page.getByText(/مدیریت محصولات و موجودی انبار/).first()).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /افزودن محصول جدید/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function fillRequired(page: Page, title: string) {
  await page.locator('#pf-title').fill(title);
  await page.locator('#pf-category').selectOption('هندزفری و ایرباد');
  await page.locator('#pf-brand').fill('E2E Brand');
  await page.locator('#pf-price').fill('980000');
  await page.locator('#pf-stock').fill('7');
  await page.locator('input[aria-label="آپلود عکس اصلی"]').setInputFiles(PHOTO_A);
  await expect(page.locator('img[alt="عکس اصلی کالا"]')).toHaveAttribute('src', /\/images\/products\//, { timeout: 15000 });
}

async function apiProducts(page: Page) {
  const res = await page.request.get('/api/admin/products?limit=1000');
  return (await res.json()) as Array<Record<string, any>>;
}

test.describe('admin add-product form', () => {
  test('empty submit lists every missing field and focuses the first one', async ({ page }) => {
    await openAddForm(page);
    await page.getByRole('button', { name: 'ثبت و انتشار کالا' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('alert').filter({ hasText: 'عنوان کالا را وارد کنید' })).toBeVisible();
    await expect(dialog.getByRole('alert').filter({ hasText: 'برند کالا را وارد کنید' })).toBeVisible();
    await expect(dialog.getByRole('alert').filter({ hasText: 'قیمت فروش را وارد کنید' })).toBeVisible();
    await expect(dialog.getByRole('alert').filter({ hasText: 'موجودی را وارد کنید' })).toBeVisible();
    await expect(dialog.getByRole('alert').filter({ hasText: 'تصویر کالا را آپلود کنید' })).toBeVisible();
    await expect(page.locator('#pf-title')).toBeFocused();
  });

  test('no defaults: brand, stock and photo start empty', async ({ page }) => {
    await openAddForm(page);
    await expect(page.locator('#pf-brand')).toHaveValue('');
    await expect(page.locator('#pf-stock')).toHaveValue('');
    await expect(page.locator('img[alt="عکس اصلی کالا"]')).toHaveCount(0);
  });

  test('price, original price and percent stay in step; margin warning shows below the floor', async ({ page }) => {
    await openAddForm(page);
    await page.locator('#pf-original').fill('1200000');
    await page.locator('#pf-price').fill('980000');
    await expect(page.locator('#pf-percent')).toHaveValue('18');
    await page.locator('#pf-percent').fill('20');
    await expect(page.locator('#pf-price')).toHaveValue('۹۶۰,۰۰۰');
    await page.getByText('تنظیمات پیشرفته').click();
    await page.locator('#pf-cost').fill('900000');
    await expect(page.getByText(/سود تخمینی: ۶٪/)).toBeVisible();
    await expect(page.getByText(/کمتر از حداقل مجاز است/)).toBeVisible();
  });

  test('photos: cover and gallery upload, a bad file is reported without losing good ones', async ({ page }) => {
    const errors = collectErrors(page);
    await openAddForm(page);
    await page.locator('input[aria-label="آپلود عکس اصلی"]').setInputFiles(PHOTO_A);
    await expect(page.locator('img[alt="عکس اصلی کالا"]')).toHaveAttribute('src', /\/images\/products\//, { timeout: 15000 });
    await expect(page.getByText(/عکس واقعی؛ در صفحه اصلی نمایش داده می‌شود/)).toBeVisible();

    await page.locator('input[aria-label="آپلود عکس‌های بیشتر"]').setInputFiles([
      photoB(),
      { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image at all') },
    ]);
    await expect(page.getByText(/عکس‌های بیشتر \(.*۱ از ۸\)/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('alert').filter({ hasText: 'bad.png' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('changing category keeps an uploaded real photo', async ({ page }) => {
    await openAddForm(page);
    await page.locator('input[aria-label="آپلود عکس اصلی"]').setInputFiles(PHOTO_A);
    const cover = page.locator('img[alt="عکس اصلی کالا"]');
    await expect(cover).toHaveAttribute('src', /\/images\/products\//, { timeout: 15000 });
    const before = await cover.getAttribute('src');
    await page.locator('#pf-category').selectOption('کابل و سیم');
    await expect(cover).toHaveAttribute('src', before!);
  });

  test('creates a product with spec lines and gallery; it is persisted and listed', async ({ page }) => {
    const errors = collectErrors(page);
    const title = `فرم جدید ${Date.now()}`;
    await openAddForm(page);
    await fillRequired(page, title);
    await page.locator('input[aria-label="آپلود عکس‌های بیشتر"]').setInputFiles(photoB());
    await expect(page.getByText(/عکس‌های بیشتر \(.*۱ از ۸\)/)).toBeVisible({ timeout: 15000 });
    await page.locator('#pf-feature').fill('جنس سیلیکون');
    await page.locator('#pf-feature').press('Enter');
    await expect(page.getByText('جنس سیلیکون', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'ثبت و انتشار کالا' }).click();
    await expect(page.getByText('محصول با موفقیت ایجاد شد')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const saved = (await apiProducts(page)).find((p) => p.title === title);
    expect(saved, 'product saved').toBeTruthy();
    expect(saved!.stockQuantity).toBe(7);
    expect(saved!.features).toEqual(['جنس سیلیکون']);
    expect(saved!.images.length).toBe(1);
    expect(saved!.brand).toBe('E2E Brand');
    expect(errors).toEqual([]);
  });

  test('save and add another keeps category, brand and warranty, and clears the rest', async ({ page }) => {
    const title = `کالای اول ${Date.now()}`;
    await openAddForm(page);
    await fillRequired(page, title);
    await page.locator('#pf-warranty').fill('۱۸ ماهه ایستا');
    await page.getByRole('button', { name: 'ثبت و افزودن کالای بعدی' }).click();
    await expect(page.getByText('محصول با موفقیت ایجاد شد')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#pf-title')).toHaveValue('');
    await expect(page.locator('#pf-brand')).toHaveValue('E2E Brand');
    await expect(page.locator('#pf-category')).toHaveValue('هندزفری و ایرباد');
    await expect(page.locator('#pf-warranty')).toHaveValue('۱۸ ماهه ایستا');
    await expect(page.locator('img[alt="عکس اصلی کالا"]')).toHaveCount(0);
  });

  test('editing keeps stock 0 and does not invent a warranty', async ({ page }) => {
    const title = `موجودی صفر ${Date.now()}`;
    await login(page);
    const created = await page.request.post('/api/admin/products', {
      data: {
        title, category: 'هندزفری و ایرباد', price: 500000, image: '/images/products/p-test.webp',
        brand: 'E2E Brand', stockQuantity: 0, isActive: 1,
      },
    });
    expect(created.status()).toBe(201);
    await page.goto('/admin/products');
    await expect(page.getByText(/مدیریت محصولات و موجودی انبار/).first()).toBeVisible({ timeout: 10000 });
    await page.locator('tr').filter({ hasText: title }).first().getByRole('button', { name: 'ویرایش کالا' }).click();
    await expect(page.locator('#pf-stock')).toHaveValue('0');
    await expect(page.locator('#pf-warranty')).toHaveValue('');
    await page.locator('#pf-description').fill('ویرایش تست');
    await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
    await expect(page.getByText('محصول با موفقیت بروزرسانی شد')).toBeVisible({ timeout: 10000 });
    const saved = (await apiProducts(page)).find((p) => p.title === title);
    expect(saved!.stockQuantity).toBe(0);
  });

  test('closing with unsaved edits asks first; cancelling keeps the form', async ({ page }) => {
    await openAddForm(page);
    await page.locator('#pf-title').fill('نیمه‌کاره');
    page.once('dialog', (d) => d.dismiss());
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#pf-title')).toHaveValue('نیمه‌کاره');
  });

  test('phone width: the form fits without sideways scrolling', async ({ page }) => {
    await openAddForm(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
      return dialog ? dialog.scrollWidth - dialog.clientWidth : -1;
    });
    expect(overflow).toBeLessThanOrEqual(1);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-phone.png` });
  });

  test('desktop screenshot of a filled form for review', async ({ page }) => {
    test.skip(!SHOTS, 'set SHOTS_DIR to capture screenshots');
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAddForm(page);
    await fillRequired(page, 'هندزفری نمونه برای بررسی طراحی');
    await page.locator('#pf-original').fill('1200000');
    await page.locator('#pf-feature').fill('جنس سیلیکون');
    await page.locator('#pf-feature').press('Enter');
    await page.screenshot({ path: `${SHOTS}/after-desktop.png` });
  });
});
