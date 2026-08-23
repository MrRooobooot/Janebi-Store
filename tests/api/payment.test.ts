import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import paymentRoutes from '../../server/routes/payment.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

const app = express();
app.use(json());
app.use('/api/payment', paymentRoutes);

describe('Payment API', () => {
  let productId: number;
  const testUserId = 'pay-user-' + Date.now();
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  const otherUserId = 'other-user-' + Date.now();
  const otherToken = jwt.sign({ userId: otherUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  const orderId = 'ORD-PAY-' + Math.floor(100000 + Math.random() * 900000);

  beforeAll(async () => {
    // Insert test users
    await db.insert(users).values({
      id: testUserId,
      name: 'Pay User',
      phone: testPhone,
      password: 'hash'
    });

    await db.insert(users).values({
      id: otherUserId,
      name: 'Other User',
      phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
      password: 'hash'
    });

    // Insert test product with stockQuantity: 5
    const product = await db.insert(products).values({
      title: 'Payment Test Product',
      category: 'test',
      price: 150000,
      image: 'test.jpg',
      brand: 'Test Brand',
      stockQuantity: 5
    }).returning({ id: products.id });
    productId = product[0].id;

    // Create a pending order for testUserId with 2 items (simulating stock decremented from 5 to 3)
    await db.insert(orders).values({
      id: orderId,
      userId: testUserId,
      date: '1403/05/25',
      status: 'pending_payment',
      statusText: 'در انتظار پرداخت',
      total: 335000,
      subtotal: 300000,
      shippingFee: 35000,
      discountAmount: 0,
      paymentMethod: 'پرداخت آنلاین',
      shippingMethod: 'پست پیشتاز',
      recipientName: 'Pay User',
      recipientPhone: testPhone,
      recipientAddress: 'Tehran',
      recipientPostalCode: '11111'
    });

    await db.insert(orderItems).values({
      orderId,
      productId,
      price: 150000,
      qty: 2,
      title: 'Payment Test Product',
      image: 'test.jpg',
      brand: 'Test Brand'
    });

    await db.update(products).set({ stockQuantity: 3 }).where(eq(products.id, productId));
  });

  afterAll(async () => {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, otherUserId));
  });

  it('should require authentication for /api/payment/request', async () => {
    const res = await request(app)
      .post('/api/payment/request')
      .send({ orderId });
    expect(res.status).toBe(401);
  });

  it('should reject payment request for another user order with 403', async () => {
    const res = await request(app)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ orderId });
    expect(res.status).toBe(403);
  });

  it('should successfully create payment request and return URL', async () => {
    const res = await request(app)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ orderId });
    expect(res.status).toBe(200);
    expect(res.body.url).toBeDefined();

    // Verify authority was saved in DB
    const dbOrder = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    expect(dbOrder?.authority).toBeDefined();
  });

  it('should cancel order and restock products when payment verify status is NOK', async () => {
    const dbOrder = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    const authority = dbOrder?.authority;
    expect(authority).toBeDefined();

    // Verify stock before failed payment is 3
    let p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(p?.stockQuantity).toBe(3);

    // Call verify with Status=NOK
    const res = await request(app)
      .get(`/api/payment/verify?Authority=${authority}&Status=NOK`);
    expect(res.status).toBe(302);
    expect(res.header.location).toContain('status=failed');

    // Verify order is marked as cancelled
    const updatedOrder = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    expect(updatedOrder?.status).toBe('cancelled');

    // Verify stock was restored by 2 (3 + 2 = 5)
    p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(p?.stockQuantity).toBe(5);

    // Verify idempotency: calling verify again does not restore stock again
    const repeatRes = await request(app)
      .get(`/api/payment/verify?Authority=${authority}&Status=NOK`);
    expect(repeatRes.status).toBe(302);

    p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(p?.stockQuantity).toBe(5); // Still 5, not 7!
  });

  it('POST /api/payment/request returns 400 when orderId is missing', async () => {
    const res = await request(app)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/payment/request returns 404 for non-existent orderId', async () => {
    const res = await request(app)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ orderId: 'ORD-DOES-NOT-EXIST-999' });
    expect(res.status).toBe(404);
  });

  it('GET /api/payment/verify redirects to failed callback on missing query params', async () => {
    const res = await request(app).get('/api/payment/verify');
    expect(res.status).toBe(302);
    expect(res.header.location).toContain('status=failed');
  });

  it('GET /api/payment/verify redirects to failed callback on non-existent authority', async () => {
    const res = await request(app).get('/api/payment/verify?Authority=NON_EXISTENT_AUTH&Status=OK');
    expect(res.status).toBe(302);
    expect(res.header.location).toContain('status=failed');
  });

  it('GET /api/payment/verify successfully marks order as processing and sets refId on Status=OK', async () => {
    // Create a new pending order for success test
    const successOrderId = 'ORD-SUCC-' + Math.floor(100000 + Math.random() * 900000);
    await db.insert(orders).values({
      id: successOrderId,
      userId: testUserId,
      date: '1403/05/25',
      status: 'pending_payment',
      statusText: 'در انتظار پرداخت',
      total: 150000,
      subtotal: 150000,
      paymentMethod: 'پرداخت آنلاین',
      shippingMethod: 'پست پیشتاز',
      recipientName: 'Pay User',
      recipientPhone: testPhone,
      recipientAddress: 'Tehran'
    });

    // Request payment to assign dummy authority
    const reqRes = await request(app)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ orderId: successOrderId });
    expect(reqRes.status).toBe(200);

    const savedOrder = await db.query.orders.findFirst({ where: eq(orders.id, successOrderId) });
    const auth = savedOrder?.authority;
    expect(auth).toBeDefined();

    // Verify payment with Status=OK
    const verifyRes = await request(app)
      .get(`/api/payment/verify?Authority=${auth}&Status=OK`);
    expect(verifyRes.status).toBe(302);
    expect(verifyRes.header.location).toContain('status=success');

    // Verify order status is now processing
    const processedOrder = await db.query.orders.findFirst({ where: eq(orders.id, successOrderId) });
    expect(processedOrder?.status).toBe('processing');
    expect(processedOrder?.refId).toBeDefined();

    // Idempotency: verify again returns success without error
    const repeatVerify = await request(app)
      .get(`/api/payment/verify?Authority=${auth}&Status=OK`);
    expect(repeatVerify.status).toBe(302);
    expect(repeatVerify.header.location).toContain('status=success');

    await db.delete(orders).where(eq(orders.id, successOrderId));
  });
});
