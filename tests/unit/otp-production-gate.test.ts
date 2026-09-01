import { describe, it, expect, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { env } from '../../server/env.js';

// In production without an SMS provider, every OTP-driven endpoint must be
// hard-disabled with 503 so users never reach an undeliverable flow.
describe('OTP production gate (no SMS provider → 503)', () => {
  const phone = '09120000001';
  const originalNodeEnv = env.NODE_ENV;

  afterAll(() => {
    (env as any).NODE_ENV = originalNodeEnv;
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
