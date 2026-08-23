import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { users, products, wishlistItems } from '../../server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

describe('Wishlist API Integration Tests', () => {
  const timestamp = Date.now();
  const testUserId = `user-wishlist-${timestamp}`;
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let testProductId1: number;
  let testProductId2: number;

  beforeAll(async () => {
    // 1. Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'کاربر علاقه‌مندی‌ها',
      phone: testPhone,
      password: 'hash'
    });

    // 2. Create test products
    const [p1] = await db.insert(products).values({
      title: `محصول علاقه‌مندی ۱ ${timestamp}`,
      category: 'audio',
      price: 350000,
      image: '/w1.jpg',
      brand: 'تست',
      stockQuantity: 10,
      sku: `SKU-WISH-1-${timestamp}`
    }).returning();
    testProductId1 = p1.id;

    const [p2] = await db.insert(products).values({
      title: `محصول علاقه‌مندی ۲ ${timestamp}`,
      category: 'powerbank',
      price: 550000,
      image: '/w2.jpg',
      brand: 'تست',
      stockQuantity: 5,
      sku: `SKU-WISH-2-${timestamp}`
    }).returning();
    testProductId2 = p2.id;
  });

  afterAll(async () => {
    await db.delete(wishlistItems).where(eq(wishlistItems.userId, testUserId));
    const testProductIds = [testProductId1, testProductId2].filter(Boolean);
    if (testProductIds.length > 0) {
      await db.delete(products).where(inArray(products.id, testProductIds));
    }
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('should return 401 for unauthenticated requests on all wishlist endpoints', async () => {
    const getRes = await request(app).get('/api/wishlist');
    expect(getRes.status).toBe(401);

    const postRes = await request(app).post('/api/wishlist').send({ productId: testProductId1 });
    expect(postRes.status).toBe(401);

    const deleteRes = await request(app).delete(`/api/wishlist/${testProductId1}`);
    expect(deleteRes.status).toBe(401);
  });

  it('POST /api/wishlist should return 400 for invalid productId', async () => {
    const stringIdRes = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: 'invalid_id' });
    expect(stringIdRes.status).toBe(400);

    const negativeIdRes = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: -10 });
    expect(negativeIdRes.status).toBe(400);
  });

  it('POST /api/wishlist should add product to wishlist with 200', async () => {
    const res = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId1 });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('اضافه شد');
  });

  it('POST /api/wishlist should be idempotent when adding already-existing item', async () => {
    const res = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId1 });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('وجود دارد');
  });

  it('GET /api/wishlist should return user wishlist products', async () => {
    // Add second product
    await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: testProductId2 });

    const res = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body.some((p: any) => p.id === testProductId1)).toBe(true);
    expect(res.body.some((p: any) => p.id === testProductId2)).toBe(true);
  });

  it('DELETE /api/wishlist/:id should remove item from wishlist with 200', async () => {
    const res = await request(app)
      .delete(`/api/wishlist/${testProductId1}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('حذف شد');

    const getRes = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.length).toBe(1);
    expect(getRes.body[0].id).toBe(testProductId2);
  });

  it('POST /api/wishlist should reject zero or floating point productId with 400', async () => {
    const resZero = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: 0 });
    expect(resZero.status).toBe(400);

    const resFloat = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ productId: 2.7 });
    expect(resFloat.status).toBe(400);
  });

  it('GET /api/wishlist enforces tenant isolation between separate users', async () => {
    const otherUserId = `user-other-wish-${timestamp}`;
    const otherToken = jwt.sign({ userId: otherUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    await db.insert(users).values({
      id: otherUserId,
      name: 'کاربر دیگر',
      phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
      password: 'hash'
    });

    const res = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // Should NOT see testUserId's wishlist!

    await db.delete(users).where(eq(users.id, otherUserId));
  });
});
