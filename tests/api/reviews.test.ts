import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { products, reviews } from '../../server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';

describe('Reviews API Integration Tests', () => {
  const timestamp = Date.now();
  let testProductId: number;
  let emptyProductId: number;
  const createdReviewIds: string[] = [];

  beforeAll(async () => {
    // 1. Create product with initial reviews
    const [p1] = await db.insert(products).values({
      title: `محصول نقد و بررسی ${timestamp}`,
      category: 'audio',
      price: 300000,
      image: '/rev1.jpg',
      brand: 'انکر',
      stockQuantity: 10,
      sku: `SKU-REV-1-${timestamp}`
    }).returning();
    testProductId = p1.id;

    // 2. Create product with no reviews
    const [p2] = await db.insert(products).values({
      title: `محصول بدون بررسی ${timestamp}`,
      category: 'cables',
      price: 50000,
      image: '/rev2.jpg',
      brand: 'باسئوس',
      stockQuantity: 5,
      sku: `SKU-REV-2-${timestamp}`
    }).returning();
    emptyProductId = p2.id;

    // 3. Pre-populate a review
    const revId = `rev-seed-${timestamp}`;
    await db.insert(reviews).values({
      id: revId,
      productId: testProductId,
      userName: 'سارا محمدی',
      rating: 4,
      title: 'کیفیت مناسب',
      comment: 'نسبت به قیمت ارزش خرید دارد',
      recommend: true,
      date: '1403/05/25'
    });
    createdReviewIds.push(revId);
  });

  afterAll(async () => {
    const pids = [testProductId, emptyProductId].filter(Boolean);
    if (pids.length > 0) {
      await db.delete(reviews).where(inArray(reviews.productId, pids));
      await db.delete(products).where(inArray(products.id, pids));
    }
  });

  it('GET /api/products/:id/reviews returns reviews for product with reviews', async () => {
    const res = await request(app).get(`/api/products/${testProductId}/reviews`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].productId).toBe(testProductId);
    expect(res.body[0].userName).toBe('سارا محمدی');
    expect(res.body[0].rating).toBe(4);
  });

  it('GET /api/products/:id/reviews returns empty array for product without reviews', async () => {
    const res = await request(app).get(`/api/products/${emptyProductId}/reviews`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('POST /api/products/:id/reviews creates new review with 201', async () => {
    const payload = {
      userName: 'امیر رضایی',
      rating: 5,
      title: 'عالی و بی‌نقص',
      comment: 'صدای فوق‌العاده شفاف و تفکیک عالی دارد',
      recommend: true
    };

    const res = await request(app)
      .post(`/api/products/${testProductId}/reviews`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.productId).toBe(testProductId);
    expect(res.body.rating).toBe(5);
    expect(res.body.userName).toBe('امیر رضایی');
    createdReviewIds.push(res.body.id);

    // Verify it is returned in GET
    const getRes = await request(app).get(`/api/products/${testProductId}/reviews`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.some((r: any) => r.id === res.body.id)).toBe(true);
  });

  it('POST /api/products/:id/reviews accepts lower rating boundary (rating = 1)', async () => {
    const res = await request(app)
      .post(`/api/products/${testProductId}/reviews`)
      .send({
        userName: 'مشتری ناراضی',
        rating: 1,
        title: 'ضعیف',
        comment: 'کیفیت ساخت پایین بود',
        recommend: false
      });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(1);
    createdReviewIds.push(res.body.id);
  });

  it('POST /api/products/:id/reviews rejects rating out of bounds (rating < 1 or rating > 5)', async () => {
    // rating = 0
    const resZero = await request(app)
      .post(`/api/products/${testProductId}/reviews`)
      .send({
        userName: 'کاربر تست',
        rating: 0,
        title: 'امتیاز صفر',
        comment: 'نامعتبر'
      });
    expect(resZero.status).toBe(400);

    // rating = -1
    const resNegative = await request(app)
      .post(`/api/products/${testProductId}/reviews`)
      .send({
        userName: 'کاربر تست',
        rating: -1,
        title: 'امتیاز منفی',
        comment: 'نامعتبر'
      });
    expect(resNegative.status).toBe(400);

    // rating = 6
    const resSix = await request(app)
      .post(`/api/products/${testProductId}/reviews`)
      .send({
        userName: 'کاربر تست',
        rating: 6,
        title: 'امتیاز شش',
        comment: 'نامعتبر'
      });
    expect(resSix.status).toBe(400);
  });

  it('POST /api/products/:id/reviews rejects missing required fields with 400', async () => {
    // Missing title and comment
    const res = await request(app)
      .post(`/api/products/${testProductId}/reviews`)
      .send({
        userName: 'کاربر تست',
        rating: 3
      });
    expect(res.status).toBe(400);
  });

  it('POST /api/products/:id/reviews returns 404 for non-existent product ID', async () => {
    const res = await request(app)
      .post('/api/products/9999999/reviews')
      .send({
        userName: 'کاربر تست',
        rating: 4,
        title: 'محصول ناموجود',
        comment: 'این محصول در پایگاه داده وجود ندارد'
      });
    expect(res.status).toBe(404);
  });

  it('POST /api/products/:id/reviews returns 400 for invalid product ID parameter', async () => {
    const res = await request(app)
      .post('/api/products/invalid-id/reviews')
      .send({
        userName: 'کاربر تست',
        rating: 4,
        title: 'شناسه نامعتبر',
        comment: 'شناسه متنی'
      });
    expect(res.status).toBe(400);
  });
});
