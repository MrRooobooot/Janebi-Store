import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems, addresses, cartItems, coupons } from '../../server/db/schema.js';
import { eq, inArray, sql } from 'drizzle-orm';
import orderRoutes from '../../server/routes/orders.js';
import paymentRoutes from '../../server/routes/payment.js';
import userRoutes from '../../server/routes/users.js';
import cartRoutes from '../../server/routes/cart.js';
import couponRoutes from '../../server/routes/coupons.js';
import productRoutes from '../../server/routes/products.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

const app = express();
app.use(json());
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/products', productRoutes);
app.use(errorHandler);

describe('Adversarial Concurrency & Stress Verification', () => {
  const timestamp = Date.now();
  const testUserId = `user-stress-${timestamp}`;
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let productSingleStockId: number;
  let productMultiStockId: number;
  let productAId: number;
  let productBId: number;
  let productStressId: number;
  let productFuzzId: number;
  let productDupId: number;

  let address1Id: string;
  let address2Id: string;
  let address3Id: string;

  beforeAll(async () => {
    // 1. Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'کاربر تست استرس',
      phone: testPhone,
      password: 'hash'
    });

    // 2. Single stock product (stock = 1) for 50-client burst
    const [p1] = await db.insert(products).values({
      title: `محصول تک واحدی استرس ${timestamp}`,
      category: 'test',
      price: 100000,
      image: '/p1.jpg',
      brand: 'تست',
      stockQuantity: 1,
      sku: `SKU-STRESS-1-${timestamp}`
    }).returning();
    productSingleStockId = p1.id;

    // 3. Multi stock product (stock = 5) for 100-client burst
    const [p2] = await db.insert(products).values({
      title: `محصول ۵ واحدی استرس ${timestamp}`,
      category: 'test',
      price: 150000,
      image: '/p2.jpg',
      brand: 'تست',
      stockQuantity: 5,
      sku: `SKU-STRESS-5-${timestamp}`
    }).returning();
    productMultiStockId = p2.id;

    // 4. Products for multi-item asymmetric competition (Product A: stock 10, Product B: stock 3)
    const [pa] = await db.insert(products).values({
      title: `محصول الف استرس ${timestamp}`,
      category: 'test',
      price: 50000,
      image: '/pa.jpg',
      brand: 'تست',
      stockQuantity: 10,
      sku: `SKU-STRESS-A-${timestamp}`
    }).returning();
    productAId = pa.id;

    const [pb] = await db.insert(products).values({
      title: `محصول ب استرس ${timestamp}`,
      category: 'test',
      price: 60000,
      image: '/pb.jpg',
      brand: 'تست',
      stockQuantity: 3,
      sku: `SKU-STRESS-B-${timestamp}`
    }).returning();
    productBId = pb.id;

    // 5. Product for payment restock / cancellation race
    const [ps] = await db.insert(products).values({
      title: `محصول بازگشت موجودی ${timestamp}`,
      category: 'test',
      price: 70000,
      image: '/ps.jpg',
      brand: 'تست',
      stockQuantity: 2,
      sku: `SKU-STRESS-RESTOCK-${timestamp}`
    }).returning();
    productStressId = ps.id;

    // 6. Product for randomized quantity fuzz testing (stock = 12)
    const [pf] = await db.insert(products).values({
      title: `محصول تصادفی فاز ${timestamp}`,
      category: 'test',
      price: 80000,
      image: '/pf.jpg',
      brand: 'تست',
      stockQuantity: 12,
      sku: `SKU-STRESS-FUZZ-${timestamp}`
    }).returning();
    productFuzzId = pf.id;

    // 7. Product for in-payload duplicate item test (stock = 5)
    const [pd] = await db.insert(products).values({
      title: `محصول تکراری در سبد ${timestamp}`,
      category: 'test',
      price: 90000,
      image: '/pd.jpg',
      brand: 'تست',
      stockQuantity: 5,
      sku: `SKU-STRESS-DUP-${timestamp}`
    }).returning();
    productDupId = pd.id;

    // 8. Create 3 addresses for default address concurrency tests
    address1Id = `addr-stress-1-${timestamp}`;
    address2Id = `addr-stress-2-${timestamp}`;
    address3Id = `addr-stress-3-${timestamp}`;

    await db.insert(addresses).values([
      { id: address1Id, userId: testUserId, title: 'آدرس ۱', name: 'کاربر ۱', phone: testPhone, province: 'تهران', city: 'تهران', address: 'خیابان ۱', postalCode: '1111111111', isDefault: true },
      { id: address2Id, userId: testUserId, title: 'آدرس ۲', name: 'کاربر ۲', phone: testPhone, province: 'تهران', city: 'تهران', address: 'خیابان ۲', postalCode: '2222222222', isDefault: false },
      { id: address3Id, userId: testUserId, title: 'آدرس ۳', name: 'کاربر ۳', phone: testPhone, province: 'تهران', city: 'تهران', address: 'خیابان ۳', postalCode: '3333333333', isDefault: false }
    ]);
  });

  afterAll(async () => {
    const pids = [
      productSingleStockId,
      productMultiStockId,
      productAId,
      productBId,
      productStressId,
      productFuzzId,
      productDupId
    ].filter(Boolean);

    if (pids.length > 0) {
      await db.delete(orderItems).where(inArray(orderItems.productId, pids));
      await db.delete(products).where(inArray(products.id, pids));
    }
    await db.delete(addresses).where(eq(addresses.userId, testUserId));
    await db.delete(cartItems).where(eq(cartItems.userId, testUserId));
    await db.delete(orders).where(eq(orders.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('Scenario 1: 50 concurrent requests competing for 1 unit of stock -> exactly 1 winner (201), 49 failures (400), final stock = 0', async () => {
    const burstSize = 50;
    const payload = {
      items: [{ id: productSingleStockId, quantity: 1 }],
      recipient: {
        name: 'مهاجم همزمان',
        phone: testPhone,
        address: 'تهران',
        postalCode: '1111111111'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard'
    };

    const requests = Array.from({ length: burstSize }).map(() =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
    );

    const responses = await Promise.all(requests);
    const successes = responses.filter(r => r.status === 201);
    const failures = responses.filter(r => r.status === 400);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(burstSize - 1);

    // Verify error messages
    for (const f of failures) {
      expect(f.body.message).toContain('موجودی');
    }

    // Verify stock is exactly 0
    const p = await db.query.products.findFirst({ where: eq(products.id, productSingleStockId) });
    expect(p?.stockQuantity).toBe(0);

    // Verify exactly 1 orderItem created
    const items = await db.query.orderItems.findMany({ where: eq(orderItems.productId, productSingleStockId) });
    expect(items.length).toBe(1);
  });

  it('Scenario 2: 100 concurrent requests competing for 5 units of stock -> exactly 5 winners (201), 95 failures (400), final stock = 0', async () => {
    const burstSize = 100;
    const payload = {
      items: [{ id: productMultiStockId, quantity: 1 }],
      recipient: {
        name: 'مهاجم ۱۰۰ نفره',
        phone: testPhone,
        address: 'تهران',
        postalCode: '2222222222'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard'
    };

    const requests = Array.from({ length: burstSize }).map(() =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
    );

    const responses = await Promise.all(requests);
    const successes = responses.filter(r => r.status === 201);
    const failures = responses.filter(r => r.status === 400);

    expect(successes.length).toBe(5);
    expect(failures.length).toBe(burstSize - 5);

    // Verify stock is exactly 0
    const p = await db.query.products.findFirst({ where: eq(products.id, productMultiStockId) });
    expect(p?.stockQuantity).toBe(0);

    // Verify exactly 5 orderItems created
    const items = await db.query.orderItems.findMany({ where: eq(orderItems.productId, productMultiStockId) });
    expect(items.length).toBe(5);
  });

  it('Scenario 3: Asymmetric multi-item competition (Item A stock=10, Item B stock=3) -> exactly 3 orders succeed, 27 fail, Item A stock decrements by exactly 3 to 7', async () => {
    const burstSize = 30;
    const payload = {
      items: [
        { id: productAId, quantity: 1 },
        { id: productBId, quantity: 1 }
      ],
      recipient: {
        name: 'مهاجم چند کالایی',
        phone: testPhone,
        address: 'تهران',
        postalCode: '3333333333'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard'
    };

    const requests = Array.from({ length: burstSize }).map(() =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
    );

    const responses = await Promise.all(requests);
    const successes = responses.filter(r => r.status === 201);
    const failures = responses.filter(r => r.status === 400);

    // Item B bottleneck: only 3 orders can succeed
    expect(successes.length).toBe(3);
    expect(failures.length).toBe(burstSize - 3);

    // Product B stock must be 0
    const pb = await db.query.products.findFirst({ where: eq(products.id, productBId) });
    expect(pb?.stockQuantity).toBe(0);

    // Product A stock must be 10 - 3 = 7 (NO orphaned decrement from the 27 failed transactions)
    const pa = await db.query.products.findFirst({ where: eq(products.id, productAId) });
    expect(pa?.stockQuantity).toBe(7);

    // OrderItems count: exactly 3 for A and 3 for B
    const itemsA = await db.query.orderItems.findMany({ where: eq(orderItems.productId, productAId) });
    const itemsB = await db.query.orderItems.findMany({ where: eq(orderItems.productId, productBId) });
    expect(itemsA.length).toBe(3);
    expect(itemsB.length).toBe(3);
  });

  it('Scenario 4: Concurrent payment verification failure callbacks -> restocks stock exactly once (idempotent, no double-restock exploit)', async () => {
    // 1. Create an order with 2 units of productStressId
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        items: [{ id: productStressId, quantity: 2 }],
        recipient: {
          name: 'تست درگاه',
          phone: testPhone,
          address: 'تهران',
          postalCode: '4444444444'
        },
        paymentMethod: 'online',
        shippingMethod: 'standard'
      });

    expect(createRes.status).toBe(201);
    const orderId = createRes.body.order.id;

    // Stock should now be 0 (2 - 2 = 0)
    let p = await db.query.products.findFirst({ where: eq(products.id, productStressId) });
    expect(p?.stockQuantity).toBe(0);

    // 2. Request payment to get authority token
    const payReq = await request(app)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ orderId });

    expect(payReq.status).toBe(200);

    const orderRow = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    const authority = orderRow?.authority;
    expect(authority).toBeDefined();

    // 3. Fire 20 parallel payment failure verification callbacks
    const callbackRequests = Array.from({ length: 20 }).map(() =>
      request(app)
        .get(`/api/payment/verify?Authority=${authority}&Status=NOK`)
    );

    const callbackResponses = await Promise.all(callbackRequests);
    for (const r of callbackResponses) {
      expect(r.status).toBe(302); // redirects to /checkout/callback?status=failed...
    }

    // 4. Check stock: must be exactly 2 (NOT 2 + 20*2 = 42!)
    p = await db.query.products.findFirst({ where: eq(products.id, productStressId) });
    expect(p?.stockQuantity).toBe(2);

    // Check order status: must be 'cancelled'
    const finalOrder = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    expect(finalOrder?.status).toBe('cancelled');
  });

  it('Scenario 5: Concurrent order cancellation requests -> restocks stock exactly once, subsequent requests return 400', async () => {
    // 1. Create another order for 1 unit
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        items: [{ id: productStressId, quantity: 1 }],
        recipient: {
          name: 'تست لغو همزمان',
          phone: testPhone,
          address: 'تهران',
          postalCode: '5555555555'
        },
        paymentMethod: 'online',
        shippingMethod: 'standard'
      });

    expect(createRes.status).toBe(201);
    const orderId = createRes.body.order.id;

    // Stock before cancel is 2 - 1 = 1
    let p = await db.query.products.findFirst({ where: eq(products.id, productStressId) });
    expect(p?.stockQuantity).toBe(1);

    // 2. Fire 10 parallel cancel requests for this order
    const cancelRequests = Array.from({ length: 10 }).map(() =>
      request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${testToken}`)
    );

    const cancelResponses = await Promise.all(cancelRequests);
    const cancelSuccesses = cancelResponses.filter(r => r.status === 200);
    const cancelFailures = cancelResponses.filter(r => r.status === 400);

    // Exactly 1 cancel should succeed, 9 should be rejected with 400
    expect(cancelSuccesses.length).toBe(1);
    expect(cancelFailures.length).toBe(9);

    // Final stock must be restored by exactly 1 to 2 (NOT 1 + 10 = 11)
    p = await db.query.products.findFirst({ where: eq(products.id, productStressId) });
    expect(p?.stockQuantity).toBe(2);
  });

  it('Scenario 6: Fuzz concurrency with randomized quantities (stock=12, 30 workers requesting 1-3 units) -> zero negative stock, exact conservation of inventory', async () => {
    const workerCount = 30;
    const initialStock = 12;

    // Fixed deterministic sequence of quantities across 30 workers for reproducible testing
    const requestedQuantities = Array.from({ length: workerCount }, (_, i) => (i % 3) + 1); // 1, 2, 3, 1, 2, 3...

    const requests = requestedQuantities.map((qty) =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          items: [{ id: productFuzzId, quantity: qty }],
          recipient: {
            name: `کاربر تصادفی ${qty}`,
            phone: testPhone,
            address: 'تهران',
            postalCode: '6666666666'
          },
          paymentMethod: 'online',
          shippingMethod: 'standard'
        })
    );

    const responses = await Promise.all(requests);
    const successes = responses.filter(r => r.status === 201);
    const failures = responses.filter(r => r.status === 400);

    // Compute total units sold from successful orders
    let totalUnitsSold = 0;
    for (const res of successes) {
      for (const itm of res.body.order.items) {
        totalUnitsSold += itm.quantity;
      }
    }

    const p = await db.query.products.findFirst({ where: eq(products.id, productFuzzId) });
    const remainingStock = p?.stockQuantity ?? -1;

    // Fundamental Invariant 1: remainingStock >= 0 (NO overselling, NO negative stock)
    expect(remainingStock).toBeGreaterThanOrEqual(0);

    // Fundamental Invariant 2: totalUnitsSold + remainingStock === initialStock
    expect(totalUnitsSold + remainingStock).toBe(initialStock);

    // Fundamental Invariant 3: DB order_items match totalUnitsSold
    const dbItems = await db.query.orderItems.findMany({ where: eq(orderItems.productId, productFuzzId) });
    const dbTotalQuantity = dbItems.reduce((acc, curr) => acc + curr.qty, 0);
    expect(dbTotalQuantity).toBe(totalUnitsSold);
  });

  it('Scenario 7: Duplicate items in payload aggregating to exceed stock -> rejected with 400 and zero stock deduction', async () => {
    // productDupId has stock = 5. We send [qty: 3, qty: 3] -> total 6 > 5
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        items: [
          { id: productDupId, quantity: 3 },
          { id: productDupId, quantity: 3 }
        ],
        recipient: {
          name: 'تست تجمیع تکراری',
          phone: testPhone,
          address: 'تهران',
          postalCode: '7777777777'
        },
        paymentMethod: 'online',
        shippingMethod: 'standard'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('موجودی');

    // Stock must remain unchanged at 5
    const p = await db.query.products.findFirst({ where: eq(products.id, productDupId) });
    expect(p?.stockQuantity).toBe(5);
  });

  it('Scenario 8: Concurrent default address switching -> exactly 1 address remains default, zero multi-default race condition', async () => {
    const addressIds = [address1Id, address2Id, address3Id];
    const concurrentSwitches = 15;

    // Fire 15 parallel requests cycling between address 1, 2, and 3
    const requests = Array.from({ length: concurrentSwitches }).map((_, i) => {
      const targetId = addressIds[i % 3];
      return request(app)
        .put(`/api/users/me/addresses/${targetId}/default`)
        .set('Authorization', `Bearer ${testToken}`);
    });

    const responses = await Promise.all(requests);
    for (const r of responses) {
      expect(r.status).toBe(200);
    }

    // Check database: user addresses must have EXACTLY ONE default address
    const userAddresses = await db.query.addresses.findMany({ where: eq(addresses.userId, testUserId) });
    const defaultAddresses = userAddresses.filter(a => a.isDefault);
    expect(defaultAddresses.length).toBe(1);
  });

  it('Scenario 9: High-frequency SQLite mixed read/write burst -> zero SQLITE_BUSY crashes and 100% completion', { timeout: 15000 }, async () => {

    const operations: Promise<any>[] = [];

    // Interleave 10 product queries, 10 cart queries, 10 coupon queries, 10 order queries
    for (let i = 0; i < 10; i++) {
      operations.push(request(app).get('/api/products?page=1&limit=5'));
      operations.push(request(app).get('/api/cart').set('Authorization', `Bearer ${testToken}`));
      operations.push(request(app).post('/api/coupons/validate').send({ code: 'OFFER20', cartTotal: 1000000 }));
      operations.push(request(app).get('/api/orders/my-orders').set('Authorization', `Bearer ${testToken}`));
    }

    const results = await Promise.all(operations);
    expect(results.length).toBe(40);
    for (const res of results) {
      expect(res.status).toBeLessThan(500); // 0 server 500 errors / SQLITE_BUSY crashes
    }
  });
});
