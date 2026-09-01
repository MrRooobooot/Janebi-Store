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
      SMS_API_KEY: '',
      SMS_PROVIDER: '',
      SMS_TEMPLATE_ID: '',
    },
  },
});
