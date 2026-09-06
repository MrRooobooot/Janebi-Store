import { describe, it, expect } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { users } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

describe('OTP Auth, VIP Points & Analytics Integration Tests', () => {
  const timestamp = Date.now();
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  let adminToken: string;

  it('sends OTP code and verifies successful login/registration', async () => {
    // 1. Send OTP
    const sendRes = await request(app)
      .post('/api/auth/otp/send')
      .send({ phone: testPhone });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.expiresIn).toBe(300);

    const otpCode = sendRes.body.debugCode;
    expect(otpCode).toBeDefined();

    // 2. Verify wrong OTP code fails with 400
    const failRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: testPhone, code: '00000' });
    expect(failRes.status).toBe(400);

    // 3. Verify valid OTP succeeds
    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: testPhone, code: otpCode, name: 'کاربر تستی پیامک' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user.phone).toBe(testPhone);
    expect(verifyRes.body.user.vipPoints).toBeGreaterThanOrEqual(100); // 100 bonus signup points
  });

  it('GET /api/admin/analytics returns financial, category and VIP stats for admins', async () => {
    // Create admin user for test
    const adminId = `admin-test-${timestamp}`;
    await db.insert(users).values({
      id: adminId,
      name: 'مدیر کل تست',
      phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
      password: 'password',
      role: 'admin',
      vipPoints: 50
    });

    adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET);

    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.financials).toBeDefined();
    expect(res.body.loyalty).toBeDefined();
    expect(res.body.categoryPerformance).toBeDefined();
    expect(Array.isArray(res.body.topSellingProducts)).toBe(true);

    await db.delete(users).where(eq(users.id, adminId));
  });
});
