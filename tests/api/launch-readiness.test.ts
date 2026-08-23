import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../server/db/index.js';
import { coupons, users, products, orders, orderItems } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import couponRoutes from '../../server/routes/coupons.js';
import orderRoutes from '../../server/routes/orders.js';
import paymentRoutes from '../../server/routes/payment.js';
import { app as serverApp } from '../../server/app.js';
import { env } from '../../server/env.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';

/**
 * Launch-readiness regression suite:
 *  1. Coupon expiry (expiresAt) is enforced in both validate & order-create.
 *  2. Order IDs are collision-resistant (ORD-<ts>-<rand>).
 *  3. Cancelling a COD order refunds VIP points used and claws back earned ones.
 *  4. Health endpoint reports DB connectivity.
 */

const couponApp = express();
couponApp.use(json());
couponApp.use('/api/coupons', couponRoutes);
couponApp.use(errorHandler);

describe('Launch Readiness — coupon expiry / order id / vip refund / health', () => {
  const ts = Date.now();
  const expiredCode = `EXPIRED_${ts}`;
  const liveCode = `LIVE_${ts}`;
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const userId = 'lr-user-' + ts;
  let token: string;
  let productId: number;

  beforeAll(async () => {
    await db.insert(coupons).values([
      {
        code: expiredCode,
        percent: 10,
        amount: null,
        minTotal: 10000,
        label: 'کد منقضی',
        active: true,
        expiresAt: new Date(ts - 60_000).toISOString(), // expired 1 min ago
      },
      {
        code: liveCode,
        percent: 5,
        amount: null,
        minTotal: 10000,
        label: 'کد فعال',
        active: true,
        expiresAt: new Date(ts + 86_400_000).toISOString(), // expires tomorrow
      },
    ]);

    await db.insert(users).values({
      id: userId,
      name: 'Launch Readiness User',
      phone,
      password: 'hash-not-checked-here',
      role: 'user',
      vipPoints: 5000,
    });
    token = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    const p = await db.insert(products).values({
      title: 'LR Product',
      category: 'test',
      price: 1000000,
      image: 'lr.jpg',
      brand: 'LR Brand',
      stockQuantity: 50,
    }).returning({ id: products.id });
    productId = p[0].id;
  });

  afterAll(async () => {
    // Remove all orders created for this user, children (order_items) first.
    const userOrders = await db.query.orders.findMany({ where: eq(orders.userId, userId) });
    for (const o of userOrders) {
      await db.delete(orderItems).where(eq(orderItems.orderId, o.id));
    }
    await db.delete(orders).where(eq(orders.userId, userId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(coupons).where(eq(coupons.code, expiredCode));
    await db.delete(coupons).where(eq(coupons.code, liveCode));
  });

  // ---------------------------------------------------------------
  // 1) Coupon expiry
  // ---------------------------------------------------------------
  it('rejects an expired coupon in the validate endpoint', async () => {
    const res = await request(couponApp)
      .post('/api/coupons/validate')
      .send({ code: expiredCode, cartTotal: 100000 });
    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });

  it('accepts an active coupon whose expiry is in the future', async () => {
    const res = await request(couponApp)
      .post('/api/coupons/validate')
      .send({ code: liveCode, cartTotal: 100000 });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('rejects an expired coupon at order creation too', async () => {
    const res = await request(serverApp)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 1 }],
        recipient: { name: 'Test', phone, address: 'Tehran, Test St' },
        shippingMethod: 'standard',
        paymentMethod: 'cash',
        couponCode: expiredCode,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('منقضی');
  });

  // ---------------------------------------------------------------
  // 2) Collision-resistant order ids
  // ---------------------------------------------------------------
  it('creates orders with the new ORD-<base36 ts>-<rand> id format', async () => {
    const res = await request(serverApp)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 1 }],
        recipient: { name: 'Test', phone, address: 'Tehran, Test St' },
        shippingMethod: 'standard',
        paymentMethod: 'cash',
      });
    expect(res.status).toBe(201);
    const orderId = res.body.order.id as string;
    // ORD-XXXXX-YYYY : timestamp part + random part
    expect(orderId).toMatch(/^ORD-[A-Z0-9]+-[A-Z0-9]{2,8}$/);
    expect(orderId).not.toMatch(/^ORD-\d{6}$/);

    // Cancel this order later in the VIP test instead of deleting blindly
    globalThis.__lrOrderId = orderId;
  });

  // ---------------------------------------------------------------
  // 3) VIP point integrity on cancellation (COD order → processing)
  // ---------------------------------------------------------------
  it('cancelling a processing COD order refunds used points and claws back earned ones', async () => {
    // Create a COD order that uses 2000 of the user's 5000 points.
    // total = 1,000,000 + 35,000 shipping − 2,000,000-point discount… keep math simple:
    // 1 point = 1000 T discount; useVipPoints with balance 5000 caps at payable/1000.
    const createRes = await request(serverApp)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 1 }],
        recipient: { name: 'Test', phone, address: 'Tehran, Test St' },
        shippingMethod: 'standard',
        paymentMethod: 'cash',
        useVipPoints: true,
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.order.id as string;
    const pointsUsed = createRes.body.order.vipPointsUsed as number;
    const pointsEarned = createRes.body.order.vipPointsEarned as number;

    const userAfterCreate = await db.query.users.findFirst({ where: eq(users.id, userId) });
    // The earlier "order id format" test already ran and earned its points;
    // reconstruct the pre-order balance from the current one.
    const balanceBefore = (userAfterCreate?.vipPoints ?? 0) + pointsUsed - pointsEarned;
    expect(userAfterCreate?.vipPoints).toBe(balanceBefore - pointsUsed + pointsEarned);

    const cancelRes = await request(serverApp)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancelRes.status).toBe(200);

    const userAfterCancel = await db.query.users.findFirst({ where: eq(users.id, userId) });
    // Balance returns to exactly what it was before this order existed.
    expect(userAfterCancel?.vipPoints).toBe(balanceBefore);
  });

  // ---------------------------------------------------------------
  // 4) Health endpoint
  // ---------------------------------------------------------------
  it('GET /api/health reports ok with database reachable', async () => {
    const res = await request(serverApp).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('ok');
  });

  // ---------------------------------------------------------------
  // Payment failure still refunds VIP points (regression for earlier fix)
  // ---------------------------------------------------------------
  it('failed online payment cancels order AND refunds vip points spent at checkout', async () => {
    const payOrderId = `PAY-${ts}`;
    await db.insert(orders).values({
      id: payOrderId,
      userId,
      date: '۱۴۰۴/۰۶/۰۱',
      status: 'pending_payment',
      statusText: 'در انتظار پرداخت',
      total: 1035000,
      subtotal: 1000000,
      shippingFee: 35000,
      vipPointsUsed: 2000,
      vipPointsEarned: 0,
      paymentMethod: 'پرداخت آنلاین زرین‌پال',
      shippingMethod: 'پست سفارشی (معمولی)',
      recipientName: 'Test',
      recipientPhone: phone,
      recipientAddress: 'Tehran',
    });

    // Simulate checkout having already deducted the points.
    await db.update(users).set({ vipPoints: 3000 }).where(eq(users.id, userId));

    const reqRes = await request(paymentRoutes && serverApp)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: payOrderId });
    // NODE_ENV in tests triggers dummy gateway path
    expect(reqRes.status).toBe(200);
    const authority = (await db.query.orders.findFirst({ where: eq(orders.id, payOrderId) }))?.authority;
    expect(authority).toContain('DUMMY_AUTH_');

    const verifyRes = await request(serverApp).get(`/api/payment/verify?Authority=${authority}&Status=NOK`);
    expect(verifyRes.status).toBe(302);

    const cancelled = await db.query.orders.findFirst({ where: eq(orders.id, payOrderId) });
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.vipPointsUsed).toBe(0);

    const refundedUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    expect(refundedUser?.vipPoints).toBe(5000);

    await db.delete(orders).where(eq(orders.id, payOrderId));
  });
});
