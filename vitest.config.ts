import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    // Tests must never dispatch real SMS: force the OTP provider gate off so
    // /api/auth/otp/send uses the in-process simulator (debugCode) instead of
    // hitting the live SMS.ir API with fake test phones (intermittent 502s).
    env: {
      NODE_ENV: 'test',
      SMS_API_KEY: '',
      SMS_PROVIDER: '',
      SMS_TEMPLATE_ID: '',
      // CI has no .env — server/env.ts hard-exits without JWT secrets (min 10).
      // Test-only values; the INSECURE_DEFAULT guard stays on for production.
      JWT_ACCESS_SECRET: 'vitest-access-secret-0001',
      JWT_REFRESH_SECRET: 'vitest-refresh-secret-0001',
    },
  },
});
