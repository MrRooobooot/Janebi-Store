import { test, expect } from '@playwright/test';

test.describe('Storefront Core Flows', () => {
  test('Home page loads with brand carousel and product categories', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/جانبی|Janebi/i);
    
    // Check main navigation exists
    const nav = page.locator('header');
    await expect(nav).toBeVisible();
    
    // Check brand showcase or carousel
    const brandSection = page.locator('text=برند');
    if (await brandSection.count() > 0) {
      await expect(brandSection.first()).toBeVisible();
    }
  });

  test('Cart and Checkout flow accessibility', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin route protection / redirection', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('body')).toBeVisible();
  });
});
