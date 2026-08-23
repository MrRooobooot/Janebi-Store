import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems } from '../../server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import orderRoutes from '../../server/routes/orders.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

const app = express();
app.use(json());
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

describe('Concurrency & Inventory Race Condition Tests', () => {
  const timestamp = Date.now();
  const testUserId = `user-race-${timestamp}`;
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let singleStockProductId: number;
  let multiStockProductId: number;

  beforeAll(async () => {
    // 1. Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'کاربر مسابقه همزمانی',
      phone: testPhone,
      password: 'hash'
    });

    // 2. Create product with single unit in stock (stockQuantity = 1)
    const [p1] = await db.insert(products).values({
      title: `محصول تک موجودی رقابتی ${timestamp}`,
      category: 'test',
      price: 100000,
      image: '/p1.jpg',
      brand: 'تست',
      stockQuantity: 1,
      sku: `SKU-RACE-1-${timestamp}`
    }).returning();
    singleStockProductId = p1.id;

    // 3. Create product with 3 units in stock (stockQuantity = 3)
    const [p2] = await db.insert(products).values({
      title: `محصول سه موجودی رقابتی ${timestamp}`,
      category: 'test',
      price: 150000,
      image: '/p2.jpg',
      brand: 'تست',
      stockQuantity: 3,
      sku: `SKU-RACE-2-${timestamp}`
    }).returning();
    multiStockProductId = p2.id;
  });

  afterAll(async () => {
    const pids = [singleStockProductId, multiStockProductId].filter(Boolean);
    if (pids.length > 0) {
      await db.delete(orderItems).where(inArray(orderItems.productId, pids));
      await db.delete(products).where(inArray(products.id, pids));
    }
    await db.delete(orders).where(eq(orders.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('guarantees exactly 1 winner and 0 negative stock when 10 concurrent requests compete for 1 item', async () => {
    const concurrentRequestsCount = 10;
    const orderPayload = {
      items: [{ id: singleStockProductId, quantity: 1 }],
      recipient: {
        name: 'خریدار همزمان',
        phone: testPhone,
        address: 'تهران، میدان ونک',
        postalCode: '1234567890'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard'
    };

    // Fire 10 parallel checkout requests
    const promises = Array.from({ length: concurrentRequestsCount }).map(() =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(orderPayload)
    );

    const responses = await Promise.all(promises);

    const successfulResponses = responses.filter(r => r.status === 201);
    const failedResponses = responses.filter(r => r.status === 400);

    // Verify exactly 1 winner
    expect(successfulResponses.length).toBe(1);
    expect(failedResponses.length).toBe(concurrentRequestsCount - 1);

    // Verify failed responses gave proper inventory shortage message
    for (const res of failedResponses) {
      expect(res.body.message).toContain('موجودی');
    }

    // Verify stock is exactly 0 and NOT negative
    const p = await db.query.products.findFirst({
      where: eq(products.id, singleStockProductId)
    });
    expect(p?.stockQuantity).toBe(0);

    // Verify database created exactly 1 order item for this product
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.productId, singleStockProductId)
    });
    expect(items.length).toBe(1);
  });

  it('guarantees exactly 3 winners when 10 concurrent requests compete for 3 items', async () => {
    const concurrentRequestsCount = 10;
    const orderPayload = {
      items: [{ id: multiStockProductId, quantity: 1 }],
      recipient: {
        name: 'خریدار همزمان چندتایی',
        phone: testPhone,
        address: 'تهران، میدان آزادی',
        postalCode: '9876543210'
      },
      paymentMethod: 'online',
      shippingMethod: 'express'
    };

    // Fire 10 parallel checkout requests
    const promises = Array.from({ length: concurrentRequestsCount }).map(() =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(orderPayload)
    );

    const responses = await Promise.all(promises);

    const successfulResponses = responses.filter(r => r.status === 201);
    const failedResponses = responses.filter(r => r.status === 400);

    // Verify exactly 3 winners
    expect(successfulResponses.length).toBe(3);
    expect(failedResponses.length).toBe(concurrentRequestsCount - 3);

    // Verify stock is exactly 0 (3 - 3 = 0)
    const p = await db.query.products.findFirst({
      where: eq(products.id, multiStockProductId)
    });
    expect(p?.stockQuantity).toBe(0);

    // Verify database created exactly 3 order items for this product
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.productId, multiStockProductId)
    });
    expect(items.length).toBe(3);
  });
});
