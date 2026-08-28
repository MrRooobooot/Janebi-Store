import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

describe('Auth & OTP Rate Limiting Defense Suite', () => {
  it('enforces rate limiting after 5 consecutive auth attempts within window', async () => {
    const testApp = express();
    testApp.use(express.json());

    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      message: {
        message: 'تعداد درخواست‌های بیش از حد مجاز.',
        error: 'Too many authentication requests',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    testApp.post('/test/auth/login', testLimiter, (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // 1-5: should pass
    for (let i = 0; i < 5; i++) {
      const res = await request(testApp).post('/test/auth/login').send({});
      expect(res.status).toBe(200);
    }

    // 6th attempt: should be blocked with 429
    const blockedRes = await request(testApp).post('/test/auth/login').send({});
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error).toBe('Too many authentication requests');
  });
});
