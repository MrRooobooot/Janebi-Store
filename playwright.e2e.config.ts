import { defineConfig, devices } from '@playwright/test';
import crypto from 'crypto';

/**
 * REAL-USER E2E config.
 * - e2e/prepare-db.mjs snapshots the dev DB to an isolated scratch DB and seeds a
 *   known admin. It runs as part of the webServer command, NOT in globalSetup:
 *   Playwright starts webServer before globalSetup, so preparing the DB there
 *   unlinked the file out from under the running server (see prepare-db.mjs).
 * - Starts the dev server against the copy on port 3210.
 */

export default defineConfig({
  testDir: './e2e',
  testMatch: process.env.E2E_MATCH || 'real-user.spec.ts',
  timeout: 90 * 1000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: 2,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-real' }]],
  use: {
    baseURL: 'http://localhost:3210',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node e2e/prepare-db.mjs && npm run dev',
    url: 'http://localhost:3210',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      PORT: '3210',
      DATABASE_URL: 'data/janebi.e2e.db',
      // NODE_ENV=test: express-rate-limit skip() fires → no 429s during suite;
      // server/index.ts still runs vite middleware (only 'production' disables it).
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || crypto.randomBytes(24).toString('hex'),
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || crypto.randomBytes(24).toString('hex'),
    },
  },
});
