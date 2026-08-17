import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems, coupons } from '../../server/db/schema.js';
import { eq, inArray, sql } from 'drizzle-orm';
import orderRoutes from '../../server/routes/orders.js';
import paymentRoutes from '../../server/routes/payment.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

const app = express();
app.use(json());
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use(errorHandler);

describe('Phase 3 — Order, Stock & Payment Transaction Integrity', () => {
  const timestamp = Date.now();
  const testUserId = `user-p3-${timestamp}`;
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let productId1: number;
  let productId2: number;
  const couponCode = `P3DISCOUNT_${timestamp}`;

  beforeAll(async () => {
    // 1. Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'کاربر تست فاز ۳',
      phone: testPhone,
      password: 'hash',
      role: 'user'
    });

    // 2. Create products
    const [p1] = await db.insert(products).values({
      title: `محصول تست فاز سه ۱ ${timestamp}`,
      category: 'accessories',
      price: 100000,
      image: '/p1.jpg',
      brand: 'برند تستی',
      stockQuantity: 5,
      sku: `SKU-P3-1-${timestamp}`
    }).returning();
    productId1 = p1.id;

    const [p2] = await db.insert(products).values({
      title: `محصول تست فاز سه ۲ ${timestamp}`,
      category: 'accessories',
      price: 200000,
      image: '/p2.jpg',
      brand: 'برند تستی',
      stockQuantity: 2,
      sku: `SKU-P3-2-${timestamp}`
    }).returning();
    productId2 = p2.id;

    // 3. Create test coupon
    await db.insert(coupons).values({
      code: couponCode,
      percent: 20,
      minTotal: 150000,
      label: '۲۰ درصد تخفیف ویژه',
      active: true
    });
  });

  afterAll(async () => {
    const pids = [productId1, productId2].filter(Boolean);
    if (pids.length > 0) {
      await db.delete(orderItems).where(inArray(orderItems.productId, pids));
      await db.delete(products).where(inArray(products.id, pids));
    }
    await db.delete(orders).where(eq(orders.userId, testUserId));
    await db.delete(coupons).where(eq(coupons.code, couponCode));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('correctly calculates discounts, fees, and updates stock in an atomic order creation', async () => {
    const payload = {
      items: [
        { id: productId1, quantity: 2 }, // 2 * 100,000 = 200,000
        { id: productId2, quantity: 1 }  // 1 * 200,000 = 200,000 -> subtotal = 400,000
      ],
      recipient: {
        name: 'گیرنده تست فاز ۳',
        phone: testPhone,
        address: 'تهران، خیابان شریعتی',
        postalCode: '1987654321'
      },
      shippingMethod: 'express', // 50,000
      paymentMethod: 'online',
      couponCode: couponCode // 20% of 400,000 = 80,000
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.subtotal).toBe(400000);
    expect(res.body.order.shippingFee).toBe(50000);
    expect(res.body.order.discountAmount).toBe(80000);
    expect(res.body.order.total).toBe(370000); // 400,000 + 50,000 - 80,000

    // Verify stock deductions in DB
    const updatedP1 = await db.query.products.findFirst({ where: eq(products.id, productId1) });
    const updatedP2 = await db.query.products.findFirst({ where: eq(products.id, productId2) });
    expect(updatedP1?.stockQuantity).toBe(3); // 5 - 2 = 3
    expect(updatedP2?.stockQuantity).toBe(1); // 2 - 1 = 1
  });

  it('restocks items atomically when an order is cancelled', async () => {
    // 1. Create a single-item order
    const orderPayload = {
      items: [{ id: productId2, quantity: 1 }],
      recipient: {
        name: 'گیرنده لغو',
        phone: testPhone,
        address: 'تهران',
        postalCode: '1111111111'
      },
      shippingMethod: 'standard',
      paymentMethod: 'cash_on_delivery'
    };

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(orderPayload);

    expect(createRes.status).toBe(201);
    const orderId = createRes.body.order.id;

    // Stock was 1, now should be 0
    const stockDuringOrder = await db.query.products.findFirst({ where: eq(products.id, productId2) });
    expect(stockDuringOrder?.stockQuantity).toBe(0);

    // 2. Cancel order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${testToken}`)
      .send();

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.status).toBe('cancelled');

    // 3. Verify product was restocked back to 1
    const restockedProduct = await db.query.products.findFirst({ where: eq(products.id, productId2) });
    expect(restockedProduct?.stockQuantity).toBe(1);
  });
});
