import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, coupons, users, orders, orderItems } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import orderRoutes from '../../server/routes/orders.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';

// Setup app
const app = express();
app.use(json());
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

describe('Orders API', () => {
  let productId: number;
  const testUserId = 'test-user-' + Date.now();
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const otherUserId = 'other-user-' + Date.now();
  const otherUserPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const otherUserToken = jwt.sign({ userId: otherUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  beforeAll(async () => {
    // Insert a test user
    await db.insert(users).values({
      id: testUserId,
      name: 'Test User',
      phone: testPhone,
      password: 'hash'
    });

    await db.insert(users).values({
      id: otherUserId,
      name: 'Other User',
      phone: otherUserPhone,
      password: 'hash'
    });

    // Insert a test product
    const product = await db.insert(products).values({
      title: 'Test Product',
      category: 'test',
      price: 100000,
      image: 'test.jpg',
      brand: 'Test Brand',
      stockQuantity: 5
    }).returning({ id: products.id });
    productId = product[0].id;

    // Insert a test coupon
    await db.insert(coupons).values({
      code: 'TEST20',
      percent: 20,
      minTotal: 50000,
      label: 'تخفیف تست',
      active: true
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(orderItems).where(eq(orderItems.productId, productId));
    await db.delete(orders).where(eq(orders.userId, testUserId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(coupons).where(eq(coupons.code, 'TEST20'));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, otherUserId));
  });

  it('should successfully place an order and decrement stock', async () => {
    const payload = {
      items: [{ id: productId, quantity: 2 }],
      recipient: {
        name: 'John Doe',
        phone: '09123456789',
        address: 'Test Addr',
        postalCode: '12345'
      },
      paymentMethod: 'online',
      shippingMethod: 'express',
      couponCode: 'TEST20'
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);
    if (res.status !== 201) console.log(res.body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.subtotal).toBe(200000);
    expect(res.body.order.discountAmount).toBe(40000); // 20% of 200,000
    expect(res.body.order.shippingFee).toBe(50000); // express
    expect(res.body.order.total).toBe(210000); // 200k + 50k - 40k
    
    // Check stock was decremented
    const p = await db.query.products.findFirst({
      where: eq(products.id, productId)
    });
    expect(p?.stockQuantity).toBe(3); // 5 - 2
  });

  it('should fail if stock is insufficient', async () => {
    const payload = {
      items: [{ id: productId, quantity: 10 }], // only 3 left
      recipient: {
        name: 'John Doe',
        phone: '09123456789',
        address: 'Test Addr',
        postalCode: '12345'
      },
      paymentMethod: 'online',
      shippingMethod: 'express'
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('موجودی');
  });

  it('should fail if coupon is invalid', async () => {
    const payload = {
      items: [{ id: productId, quantity: 1 }],
      recipient: {
        name: 'John Doe',
        phone: '09123456789',
        address: 'Test Addr',
        postalCode: '12345'
      },
      paymentMethod: 'online',
      shippingMethod: 'express',
      couponCode: 'INVALID'
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('نامعتبر است');
  });

  it('should aggregate duplicate item IDs in payload before stock verification', async () => {
    // Current stock is 3. Sending duplicate item IDs: 1 + 1 = 2
    const payload = {
      items: [
        { id: productId, quantity: 1 },
        { productId: productId, quantity: 1 }
      ],
      recipient: {
        name: 'John Doe',
        phone: '09123456789',
        address: 'Test Addr',
        postalCode: '12345'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard'
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.order.items.length).toBe(1);
    expect(res.body.order.items[0].quantity).toBe(2);

    const p = await db.query.products.findFirst({
      where: eq(products.id, productId)
    });
    expect(p?.stockQuantity).toBe(1); // 3 - 2 = 1
  });

  it('should fail if aggregated duplicate items exceed available stock', async () => {
    // Current stock is 1. Sending duplicate item IDs: 1 + 1 = 2
    const payload = {
      items: [
        { id: productId, quantity: 1 },
        { productId: productId, quantity: 1 }
      ],
      recipient: {
        name: 'John Doe',
        phone: '09123456789',
        address: 'Test Addr',
        postalCode: '12345'
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
  });

  it('should clamp discount to subtotal when coupon discount exceeds subtotal', async () => {
    // Insert a high fixed amount coupon
    await db.insert(coupons).values({
      code: 'BIGDISCOUNT',
      amount: 500000,
      minTotal: 50000,
      label: 'تخفیف زیاد',
      active: true
    }).onConflictDoNothing();

    // Order 1 item (subtotal = 100,000, shipping standard = 35,000)
    const payload = {
      items: [{ id: productId, quantity: 1 }],
      recipient: {
        name: 'John Doe',
        phone: '09123456789',
        address: 'Test Addr',
        postalCode: '12345'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard',
      couponCode: 'BIGDISCOUNT'
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.order.subtotal).toBe(100000);
    expect(res.body.order.discountAmount).toBe(100000); // Clamped to subtotal (100k instead of 500k)
    expect(res.body.order.shippingFee).toBe(35000);
    expect(res.body.order.total).toBe(35000); // 100k + 35k - 100k = 35k (not negative)

    await db.delete(coupons).where(eq(coupons.code, 'BIGDISCOUNT'));
  });

  it('should successfully cancel order and restock inventory', async () => {
    // Stock is 0 now after previous orders. Let's create an order and then cancel it.
    // First replenish stock to 2
    await db.update(products).set({ stockQuantity: 2 }).where(eq(products.id, productId));

    const payload = {
      items: [{ id: productId, quantity: 2 }],
      recipient: {
        name: 'John Doe',
        phone: '09123456789',
        address: 'Test Addr',
        postalCode: '12345'
      },
      paymentMethod: 'online',
      shippingMethod: 'standard'
    };

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload);
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.order.id;

    // Check stock was decremented to 0
    let p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(p?.stockQuantity).toBe(0);

    // Cancel order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${testToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.message).toContain('لغو شد');
    expect(cancelRes.body.order.status).toBe('cancelled');

    // Check stock was restored to 2
    p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(p?.stockQuantity).toBe(2);

    // Trying to cancel again should fail with 400
    const secondCancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${testToken}`);
    expect(secondCancelRes.status).toBe(400);

    // Cancelling non-existent order should return 404
    const notFoundRes = await request(app)
      .post('/api/orders/ORD-NONEXISTENT/cancel')
      .set('Authorization', `Bearer ${testToken}`);
    expect(notFoundRes.status).toBe(404);

    // Cancelling another user's order should return 403
    const forbiddenRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(forbiddenRes.status).toBe(403);
  });

  it('should enforce tenant isolation on GET /api/orders/:id', async () => {
    // 1. Create an order for testUserId
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        items: [{ id: productId, quantity: 1 }],
        recipient: {
          name: 'John Doe',
          phone: '09123456789',
          address: 'Test Addr'
        },
        paymentMethod: 'online',
        shippingMethod: 'standard'
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.order.id;

    // 2. Owner should be able to fetch the order (200)
    const ownerRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${testToken}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.id).toBe(orderId);

    // 3. Other user should receive 404 due to tenant isolation filter
    const otherRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(otherRes.status).toBe(404);

    // 4. Non-existent order returns 404
    const notFoundRes = await request(app)
      .get('/api/orders/ORD-NONEXISTENT')
      .set('Authorization', `Bearer ${testToken}`);
    expect(notFoundRes.status).toBe(404);
  });

  it('should reject order placement with empty items array with 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        items: [],
        recipient: {
          name: 'John Doe',
          phone: '09123456789',
          address: 'Test Addr'
        }
      });
    expect(res.status).toBe(400);
  });

  it('should reject order placement with missing recipient fields with 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        items: [{ id: productId, quantity: 1 }],
        recipient: {
          name: '',
          phone: '',
          address: ''
        }
      });
    expect(res.status).toBe(400);
  });

  it('should reject order placement when product stock is 0 with 400', async () => {
    // Set stock to 0
    await db.update(products).set({ stockQuantity: 0 }).where(eq(products.id, productId));

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        items: [{ id: productId, quantity: 1 }],
        recipient: {
          name: 'John Doe',
          phone: '09123456789',
          address: 'Test Addr'
        }
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('موجودی');
  });

  it('should return 401 for unauthenticated requests on all order endpoints', async () => {
    const getOrders = await request(app).get('/api/orders');
    expect(getOrders.status).toBe(401);

    const getMyOrders = await request(app).get('/api/orders/my-orders');
    expect(getMyOrders.status).toBe(401);

    const postOrder = await request(app).post('/api/orders').send({});
    expect(postOrder.status).toBe(401);

    const cancelOrder = await request(app).post('/api/orders/ORD-123456/cancel');
    expect(cancelOrder.status).toBe(401);

    const getOrder = await request(app).get('/api/orders/ORD-123456');
    expect(getOrder.status).toBe(401);
  });
});
