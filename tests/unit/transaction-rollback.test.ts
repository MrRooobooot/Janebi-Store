import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems } from '../../server/db/schema.js';
import { eq, inArray, sql } from 'drizzle-orm';
import orderRoutes from '../../server/routes/orders.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

const app = express();
app.use(json());
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

describe('Database Transaction Rollback Integrity', () => {
  const timestamp = Date.now();
  const testUserId = `user-rollback-${timestamp}`;
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let prodInStockId: number;
  let prodOutOfStockId: number;

  beforeAll(async () => {
    // 1. Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'کاربر تست تراکنش',
      phone: testPhone,
      password: 'hash'
    });

    // 2. Create product with stock
    const [p1] = await db.insert(products).values({
      title: `محصول دارای موجودی ${timestamp}`,
      category: 'test',
      price: 200000,
      image: '/p1.jpg',
      brand: 'تست',
      stockQuantity: 10,
      sku: `SKU-ROLLBACK-1-${timestamp}`
    }).returning();
    prodInStockId = p1.id;

    // 3. Create product with zero stock
    const [p2] = await db.insert(products).values({
      title: `محصول ناموجود ${timestamp}`,
      category: 'test',
      price: 150000,
      image: '/p2.jpg',
      brand: 'تست',
      stockQuantity: 0,
      sku: `SKU-ROLLBACK-2-${timestamp}`
    }).returning();
    prodOutOfStockId = p2.id;
  });

  afterAll(async () => {
    const pids = [prodInStockId, prodOutOfStockId].filter(Boolean);
    if (pids.length > 0) {
      await db.delete(orderItems).where(inArray(orderItems.productId, pids));
      await db.delete(products).where(inArray(products.id, pids));
    }
    await db.delete(orders).where(eq(orders.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('rolls back all stock deductions and order inserts when one item in multi-item order is out of stock', async () => {
    // Stock before checkout
    const beforeP1 = await db.query.products.findFirst({ where: eq(products.id, prodInStockId) });
    expect(beforeP1?.stockQuantity).toBe(10);

    const initialOrders = await db.query.orders.findMany({ where: eq(orders.userId, testUserId) });
    const initialOrderCount = initialOrders.length;

    // Attempt multi-item order where item 1 has stock (requesting 3) but item 2 is out of stock (requesting 1)
    const payload = {
      items: [
        { id: prodInStockId, quantity: 3 },
        { id: prodOutOfStockId, quantity: 1 }
      ],
      recipient: {
        name: 'کاربر تست',
        phone: testPhone,
        address: 'تهران، خیابان آزادی',
        postalCode: '1234567890'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard'
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('موجودی');

    // Verify stock of prodInStock was NOT decremented (must still be 10)
    const afterP1 = await db.query.products.findFirst({ where: eq(products.id, prodInStockId) });
    expect(afterP1?.stockQuantity).toBe(10);

    // Verify zero new orders were committed in the database
    const afterOrders = await db.query.orders.findMany({ where: eq(orders.userId, testUserId) });
    expect(afterOrders.length).toBe(initialOrderCount);
  });

  it('rolls back database modifications when an unhandled error is thrown inside db.transaction', () => {
    const initialPrice = 200000;

    expect(() => {
      db.transaction((tx) => {
        // Step 1: Update product price inside transaction
        tx.update(products)
          .set({ price: 999999 })
          .where(eq(products.id, prodInStockId))
          .run();

        // Step 2: Throw artificial exception
        throw new Error('Simulated failure during checkout/transaction');
      });
    }).toThrow('Simulated failure during checkout/transaction');

    // Verify the update was completely discarded and price reverted
    const p = db.select().from(products).where(eq(products.id, prodInStockId)).get();
    expect(p?.price).toBe(initialPrice);
  });

  it('rolls back multi-table writes atomically upon transaction failure', () => {
    const fakeOrderId = `ORD-FAIL-${Date.now()}`;

    expect(() => {
      db.transaction((tx) => {
        // 1. Insert order
        tx.insert(orders).values({
          id: fakeOrderId,
          userId: testUserId,
          date: '1403/05/25',
          status: 'pending_payment',
          statusText: 'تست',
          total: 50000,
          subtotal: 50000,
          paymentMethod: 'online',
          shippingMethod: 'standard',
          recipientName: 'تست',
          recipientPhone: testPhone,
          recipientAddress: 'آدرس'
        }).run();

        // 2. Decrement stock
        tx.update(products)
          .set({ stockQuantity: sql`stockQuantity - 5` })
          .where(eq(products.id, prodInStockId))
          .run();

        // 3. Throw to abort
        throw new Error('Abort transaction');
      });
    }).toThrow('Abort transaction');

    // Verify neither order nor stock change was persisted
    const orderCheck = db.select().from(orders).where(eq(orders.id, fakeOrderId)).get();
    expect(orderCheck).toBeUndefined();

    const productCheck = db.select().from(products).where(eq(products.id, prodInStockId)).get();
    expect(productCheck?.stockQuantity).toBe(10);
  });
});
