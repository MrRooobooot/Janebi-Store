import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { env } from '../../server/env.js';

// In production without an SMS provider, every OTP-driven endpoint must be
// hard-disabled with 503 so users never reach an undeliverable flow.
describe('OTP production gate (no SMS provider → 503)', () => {
  const phone = '09120000001';
  // Hermetic: force the "no provider configured" scenario regardless of any
  // SMS_* keys present in the developer's local .env.
  const snapshot = {
    NODE_ENV: env.NODE_ENV,
    SMS_API_KEY: env.SMS_API_KEY,
    SMS_PROVIDER: env.SMS_PROVIDER,
    SMS_TEMPLATE_ID: env.SMS_TEMPLATE_ID,
  };

  beforeAll(() => {
    (env as any).SMS_API_KEY = '';
    (env as any).SMS_PROVIDER = '';
    (env as any).SMS_TEMPLATE_ID = '';
  });

  afterAll(() => {
    Object.assign(env as any, snapshot);
  });

  it('returns 503 for /otp/send, /otp/verify and /reset-password in production', async () => {
    (env as any).NODE_ENV = 'production';

    for (const [path, body] of [
      ['/api/auth/otp/send', { phone }],
      ['/api/auth/otp/verify', { phone, code: '12345' }],
      ['/api/auth/reset-password', { phone, code: '12345', newPassword: 'x1234567' }],
    ] as const) {
      const res = await request(app).post(path).send(body);
      expect(res.status, path).toBe(503);
      expect(res.body.error).toBe('سرویس پیامکی فعال نیست');
    }
  });

  it('keeps the dev/test in-memory OTP flow working', async () => {
    (env as any).NODE_ENV = 'test';
    const send = await request(app).post('/api/auth/otp/send').send({ phone });
    expect(send.status).toBe(200);
    expect(send.body.debugCode).toBeDefined();
  });
});
