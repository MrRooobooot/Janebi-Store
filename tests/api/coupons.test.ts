import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import { db } from '../../server/db/index.js';
import { coupons } from '../../server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import couponRoutes from '../../server/routes/coupons.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';

// Setup app
const app = express();
app.use(json());
app.use('/api/coupons', couponRoutes);
app.use(errorHandler);

describe('Coupons API', () => {
  const percentCode = `PERC_${Date.now()}`;
  const amountCode = `FIXED_${Date.now()}`;
  const inactiveCode = `INACT_${Date.now()}`;
  const highMinCode = `HIGHMIN_${Date.now()}`;

  beforeAll(async () => {
    await db.insert(coupons).values([
      {
        code: percentCode,
        percent: 20,
        amount: null,
        minTotal: 100000,
        label: 'تخفیف ۲۰ درصد',
        active: true
      },
      {
        code: amountCode,
        percent: null,
        amount: 50000,
        minTotal: 100000,
        label: 'تخفیف ۵۰ هزار تومان',
        active: true
      },
      {
        code: inactiveCode,
        percent: 30,
        amount: null,
        minTotal: 50000,
        label: 'کد غیرفعال',
        active: false
      },
      {
        code: highMinCode,
        percent: null,
        amount: 20000,
        minTotal: 500000,
        label: 'حداقل خرید بالا',
        active: true
      }
    ]);
  });

  afterAll(async () => {
    await db.delete(coupons).where(
      inArray(coupons.code, [percentCode, amountCode, inactiveCode, highMinCode])
    );
  });

  it('should validate percentage coupon and calculate discount correctly', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: percentCode,
        cartTotal: 200000
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discount).toBe(40000); // 20% of 200k
    expect(res.body.finalTotal).toBe(160000);
    expect(res.body.coupon.code).toBe(percentCode);
  });

  it('should validate fixed amount coupon and calculate discount correctly', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: amountCode,
        cartTotal: 150000
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discount).toBe(50000);
    expect(res.body.finalTotal).toBe(100000);
  });

  it('should be case-insensitive for coupon codes', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: percentCode.toLowerCase(),
        cartTotal: 200000
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discount).toBe(40000);
  });

  it('should return 400 for non-existent coupon', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: 'NON_EXISTENT_COUPON',
        cartTotal: 200000
      });

    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toContain('کد تخفیف نامعتبر یا منقضی شده است');
  });

  it('should return 400 for inactive coupon', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: inactiveCode,
        cartTotal: 200000
      });

    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toContain('کد تخفیف نامعتبر یا منقضی شده است');
  });

  it('should return 400 when cartTotal is below coupon minTotal threshold', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: highMinCode,
        cartTotal: 300000 // minTotal is 500000
      });

    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toContain('حداقل مبلغ سفارش برای این کد تخفیف رعایت نشده است');
  });

  it('should cap discount to cartTotal when discount amount exceeds cartTotal', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: amountCode, // 50,000 discount, minTotal 100,000
        cartTotal: 100000
      });

    expect(res.status).toBe(200);
    expect(res.body.discount).toBe(50000);
    expect(res.body.finalTotal).toBe(50000);

    // If discount was larger than cartTotal (e.g. 50k on a 40k cart if minTotal was lower):
    // Let's test with a direct coupon
    const bigCode = `BIG_${Date.now()}`;
    await db.insert(coupons).values({
      code: bigCode,
      amount: 100000,
      minTotal: 10000,
      label: 'تخفیف بزرگ',
      active: true
    });

    const bigRes = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: bigCode,
        cartTotal: 40000
      });

    expect(bigRes.status).toBe(200);
    expect(bigRes.body.discount).toBe(40000); // capped at 40000
    expect(bigRes.body.finalTotal).toBe(0);

    await db.delete(coupons).where(eq(coupons.code, bigCode));
  });

  it('should validate request body schema', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        cartTotal: 100000
      });

    expect(res.status).toBe(400);
  });

  it('should reject negative cartTotal with 400', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: percentCode,
        cartTotal: -50000
      });

    expect(res.status).toBe(400);
  });

  it('should reject empty coupon code string with 400', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: '',
        cartTotal: 100000
      });

    expect(res.status).toBe(400);
  });

  it('should calculate 100% discount properly resulting in 0 finalTotal', async () => {
    const fullCode = `FULL100_${Date.now()}`;
    await db.insert(coupons).values({
      code: fullCode,
      percent: 100,
      minTotal: 50000,
      label: 'تخفیف ۱۰۰ درصدی',
      active: true
    });

    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: fullCode,
        cartTotal: 100000
      });

    expect(res.status).toBe(200);
    expect(res.body.discount).toBe(100000);
    expect(res.body.finalTotal).toBe(0);

    await db.delete(coupons).where(eq(coupons.code, fullCode));
  });

  it('should support POST /api/coupons as an alias endpoint', async () => {
    const res = await request(app)
      .post('/api/coupons')
      .send({
        code: percentCode,
        cartTotal: 200000
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discount).toBe(40000);
  });
});
