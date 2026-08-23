import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { users, products, cartItems } from '../../server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

describe('Cart API Integration Tests', () => {
  const timestamp = Date.now();
  const testUserId = `user-cart-${timestamp}`;
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let testProductId1: number;
  let testProductId2: number;

  beforeAll(async () => {
    // 1. Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'کاربر سبد خرید',
      phone: testPhone,
      password: 'hash'
    });

    // 2. Create test products
    const [p1] = await db.insert(products).values({
      title: `محصول سبد ۱ ${timestamp}`,
      category: 'accessories',
      price: 150000,
      image: '/p1.jpg',
      brand: 'تست',
      stockQuantity: 20,
      sku: `SKU-CART-1-${timestamp}`
    }).returning();
    testProductId1 = p1.id;

    const [p2] = await db.insert(products).values({
      title: `محصول سبد ۲ ${timestamp}`,
      category: 'cables',
      price: 90000,
      image: '/p2.jpg',
      brand: 'تست',
      stockQuantity: 10,
      sku: `SKU-CART-2-${timestamp}`
    }).returning();
    testProductId2 = p2.id;
  });

  afterAll(async () => {
    await db.delete(cartItems).where(eq(cartItems.userId, testUserId));
    const testProductIds = [testProductId1, testProductId2].filter(Boolean);
    if (testProductIds.length > 0) {
      await db.delete(products).where(inArray(products.id, testProductIds));
    }
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('should return 401 for unauthenticated requests', async () => {
    const getRes = await request(app).get('/api/cart');
    expect(getRes.status).toBe(401);

    const postRes = await request(app).post('/api/cart').send({ productId: testProductId1, quantity: 1 });
    expect(postRes.status).toBe(401);

    const putRes = await request(app).put(`/api/cart/${testProductId1}`).send({ quantity: 2 });
    expect(putRes.status).toBe(401);

    const deleteRes = await request(app).delete(`/api/cart/${testProductId1}`);
    expect(deleteRes.status).toBe(401);

    const clearRes = await request(app).delete('/api/cart');
    expect(clearRes.status).toBe(401);
  });

  it('POST /api/cart should return 400 for invalid productId', async () => {
    const stringIdRes = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: 'not-a-number', quantity: 1 });
    expect(stringIdRes.status).toBe(400);

    const negativeIdRes = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: -5, quantity: 1 });
    expect(negativeIdRes.status).toBe(400);
  });

  it('POST /api/cart should return 400 when quantity exceeds maximum limit of 10', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId1, quantity: 15 });
    expect(res.status).toBe(400);
  });

  it('POST /api/cart should add item with 200', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId1, quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('اضافه شد');

    const getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${testToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBe(1);
    expect(getRes.body[0].id).toBe(testProductId1);
    expect(getRes.body[0].quantity).toBe(2);
  });

  it('POST /api/cart should increment quantity when re-adding existing item up to max 10', async () => {
    // Current quantity is 2. Adding 5 more -> 7
    const addRes1 = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId1, quantity: 5 });

    expect(addRes1.status).toBe(200);

    let getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${testToken}`);
    expect(getRes.body[0].quantity).toBe(7);

    // Adding 5 more -> should cap at 10 (Math.min(7 + 5, 10) = 10)
    const addRes2 = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId1, quantity: 5 });

    expect(addRes2.status).toBe(200);

    getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${testToken}`);
    expect(getRes.body[0].quantity).toBe(10);
  });

  it('PUT /api/cart/:id should return 400 when updating quantity beyond 10', async () => {
    const res = await request(app)
      .put(`/api/cart/${testProductId1}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ quantity: 12 });

    expect(res.status).toBe(400);
  });

  it('PUT /api/cart/:id should update quantity with 200', async () => {
    const res = await request(app)
      .put(`/api/cart/${testProductId1}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('بروزرسانی');

    const getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${testToken}`);
    expect(getRes.body[0].quantity).toBe(3);
  });

  it('DELETE /api/cart/:id should delete single item with 200', async () => {
    // First add second item
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId2, quantity: 1 });

    let getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${testToken}`);
    expect(getRes.body.length).toBe(2);

    // Delete first item
    const deleteRes = await request(app)
      .delete(`/api/cart/${testProductId1}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toContain('حذف');

    getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${testToken}`);
    expect(getRes.body.length).toBe(1);
    expect(getRes.body[0].id).toBe(testProductId2);
  });

  it('DELETE /api/cart should clear all cart items with 200', async () => {
    const clearRes = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${testToken}`);

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.message).toContain('خالی شد');

    const getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${testToken}`);
    expect(getRes.body.length).toBe(0);
  });

  it('POST /api/cart should reject zero or negative quantity with 400', async () => {
    const resZero = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId1, quantity: 0 });
    expect(resZero.status).toBe(400);

    const resNeg = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId1, quantity: -2 });
    expect(resNeg.status).toBe(400);
  });

  it('POST /api/cart should reject non-integer or zero productId with 400', async () => {
    const resFloat = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: 1.5, quantity: 1 });
    expect(resFloat.status).toBe(400);

    const resZeroId = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: 0, quantity: 1 });
    expect(resZeroId.status).toBe(400);
  });
});
