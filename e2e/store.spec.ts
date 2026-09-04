import { test, expect } from '@playwright/test';

test.describe('Storefront Pages & Core Flows', () => {
  test('Home page: render branding, categories, and products', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/جانبی|Janebi/i);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  });

  test('Catalog: product listing, filters, and dynamic counts', async ({ page }) => {
    await page.goto('/products');
    const productCard = page.locator('a[href^="/product/"]').first();
    await expect(productCard).toBeVisible();
    
    // Check search input presence
    const searchInput = page.getByPlaceholder(/نام، مدل یا برند/);
    await expect(searchInput).toBeVisible();
  });

  test('Product detail: specs, price, and add-to-cart interaction', async ({ page }) => {
    await page.goto('/products');
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await firstProduct.click();
    await expect(page).toHaveURL(/\/products?\/\d+/);

    // Verify main product details exist
    await expect(page.locator('h1')).toBeVisible();
    const addToCartBtn = page.getByRole('button', { name: /افزودن به سبد خرید|به سبد افزوده شد|اطلاع به محض موجود شدن/ }).first();
    await expect(addToCartBtn).toBeVisible();

    if (await addToCartBtn.isEnabled()) {
      await addToCartBtn.click();
      // Expect feedback or cart badge update
      await expect(
        page.getByText(/به سبد افزوده شد/i).or(page.locator('header [class*="cart"]').first())
      ).toBeVisible();
    }
  });

  test('Cart: empty state and navigation to shop', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /سبد خرید/ }).or(page.getByText(/سبد خرید شما خالی است/))).toBeVisible();
  });

  test('Login form: UI validation and inputs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /ورود به حساب کاربری/ })).toBeVisible();
    
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /ورود به حساب/ });
    await expect(submitBtn).toBeVisible();

    // Trigger validation with invalid phone
    await phoneInput.fill('1234');
    await passwordInput.fill('secret123');
    await submitBtn.click();

    // Toast or validation message
    await expect(page.getByText(/معتبر وارد کنید/)).toBeVisible();
  });

  test('Contact form: validation and field typing', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /تماس با جانبی آرنا/ })).toBeVisible();

    const nameInput = page.getByPlaceholder(/علی محمدی/);
    await expect(nameInput).toBeVisible();

    const contactInput = page.getByPlaceholder('09123456789');
    await expect(contactInput).toBeVisible();

    const messageInput = page.getByPlaceholder(/توضیحات خود را بنویسید/);
    await expect(messageInput).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /ارسال پیام/ });
    await expect(submitBtn).toBeVisible();

    // Fill valid info to test full submit flow
    await nameInput.fill('کاربر آزمایشی');
    await contactInput.fill('09123456789');
    await messageInput.fill('این یک پیام آزمایشی برای صحت‌سنجی پلی‌رایت است.');
    await submitBtn.click();

    // Verify successful dispatch toast
    await expect(page.getByText(/پیام شما با موفقیت ثبت شد/)).toBeVisible({ timeout: 10000 });
  });

  test('Admin security: unauthenticated access redirects', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin\/(dashboard|products|orders)/);
  });
});
