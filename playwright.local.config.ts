import { defineConfig, devices } from '@playwright/test';

/**
 * Runs the acceptance specs against an ALREADY RUNNING server (no webServer),
 * so the same spec can be pointed at a local prod build or a local dev server:
 *   E2E_BASE_URL=http://127.0.0.1:4322 npx playwright test \
 *     --config=playwright.local.config.ts e2e/seo-crawl-parity.spec.ts
 * `npm run test:e2e` (playwright.e2e.config.ts) stays untouched.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4322',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
