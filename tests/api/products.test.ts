import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { products, productFeatures, reviews } from '../../server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';

describe('Products & Reviews API Integration Tests', () => {
  const timestamp = Date.now();
  let prodId1: number;
  let prodId2: number;
  let prodId3: number;
  let createdReviewId: string;

  beforeAll(async () => {
    // Seed 3 distinct products for filtering, sorting, pagination, and reviews
    const [p1] = await db.insert(products).values({
      title: `هندزفری بلوتوثی تست فیلتر ${timestamp}`,
      category: 'audio',
      price: 200000,
      originalPrice: 250000,
      discount: 20,
      brand: 'انکر',
      image: 'https://example.com/anker.jpg',
      stockQuantity: 15,
      sku: `PROD-TEST-1-${timestamp}`
    }).returning();
    prodId1 = p1.id;

    await db.insert(productFeatures).values([
      { productId: prodId1, feature: 'بلوتوث نسخه 5.3' },
      { productId: prodId1, feature: 'باتری ۲۰ ساعته' }
    ]);

    const [p2] = await db.insert(products).values({
      title: `کابل تبدیل تایپ سی ${timestamp}`,
      category: 'cables',
      price: 80000,
      originalPrice: null,
      discount: 0,
      brand: 'باسئوس',
      image: 'https://example.com/baseus.jpg',
      stockQuantity: 0, // Out of stock
      sku: `PROD-TEST-2-${timestamp}`
    }).returning();
    prodId2 = p2.id;

    const [p3] = await db.insert(products).values({
      title: `پاوربانک ۲۰۰۰۰ میلی‌آمپر ${timestamp}`,
      category: 'powerbank',
      price: 850000,
      originalPrice: 1000000,
      discount: 15,
      brand: 'شیائومی',
      image: 'https://example.com/xiaomi.jpg',
      stockQuantity: 5,
      sku: `PROD-TEST-3-${timestamp}`
    }).returning();
    prodId3 = p3.id;
  });

  afterAll(async () => {
    const testIds = [prodId1, prodId2, prodId3].filter(Boolean);
    if (testIds.length > 0) {
      await db.delete(productFeatures).where(inArray(productFeatures.productId, testIds));
      await db.delete(reviews).where(inArray(reviews.productId, testIds));
      await db.delete(products).where(inArray(products.id, testIds));
    }
  });

  // -------------------------------------------------------------
  // Basic Endpoints (Categories, Brands, Total Count)
  // -------------------------------------------------------------
  it('GET /api/categories returns category list', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/brands returns brand list', async () => {
    const res = await request(app).get('/api/brands');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/products returns product list with total count headers', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.headers['x-total-count']).toBeDefined();
    expect(res.headers['x-total-pages']).toBeDefined();
    expect(res.headers['x-current-page']).toBeDefined();
  });

  // -------------------------------------------------------------
  // Filters: Category, Brand, Min/Max Price, inStock, hasDiscount, Search
  // -------------------------------------------------------------
  it('GET /api/products?category=audio filters by category', async () => {
    const res = await request(app).get('/api/products?category=audio');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((p: any) => p.category === 'audio')).toBe(true);
    expect(res.body.some((p: any) => p.id === prodId1)).toBe(true);
  });

  it('GET /api/products?brands=انکر filters by brand', async () => {
    const res = await request(app).get('/api/products?brands=انکر');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((p: any) => p.brand === 'انکر')).toBe(true);
  });

  it('GET /api/products?minPrice=100000&maxPrice=500000 filters by price range', async () => {
    const res = await request(app).get('/api/products?minPrice=100000&maxPrice=500000');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((p: any) => p.price >= 100000 && p.price <= 500000)).toBe(true);
    expect(res.body.some((p: any) => p.id === prodId1)).toBe(true); // 200,000
    expect(res.body.some((p: any) => p.id === prodId2)).toBe(false); // 80,000
  });

  it('GET /api/products?inStock=true filters out of stock items', async () => {
    const res = await request(app).get('/api/products?inStock=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((p: any) => p.stockQuantity > 0)).toBe(true);
    expect(res.body.some((p: any) => p.id === prodId2)).toBe(false); // prodId2 has stock 0
  });

  it('GET /api/products?hasDiscount=true filters items with discount', async () => {
    const res = await request(app).get('/api/products?hasDiscount=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((p: any) => p.discount > 0)).toBe(true);
    expect(res.body.some((p: any) => p.id === prodId1)).toBe(true); // 20%
    expect(res.body.some((p: any) => p.id === prodId2)).toBe(false); // 0%
  });

  it('GET /api/products?search=... searches by title query', async () => {
    const res = await request(app).get(`/api/products?search=پاوربانک`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((p: any) => p.id === prodId3)).toBe(true);
  });

  // -------------------------------------------------------------
  // Sorting & Pagination
  // -------------------------------------------------------------
  it('GET /api/products?sort=price-asc sorts products by ascending price', async () => {
    const res = await request(app).get('/api/products?sort=price-asc&limit=10');
    expect(res.status).toBe(200);
    const prices = res.body.map((p: any) => p.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('GET /api/products?sort=price-desc sorts products by descending price', async () => {
    const res = await request(app).get('/api/products?sort=price-desc&limit=10');
    expect(res.status).toBe(200);
    const prices = res.body.map((p: any) => p.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  it('GET /api/products?page=1&limit=2 handles pagination properly', async () => {
    const res1 = await request(app).get('/api/products?page=1&limit=2');
    expect(res1.status).toBe(200);
    expect(res1.body.length).toBeLessThanOrEqual(2);
    expect(res1.headers['x-current-page']).toBe('1');

    const res2 = await request(app).get('/api/products?page=2&limit=2');
    expect(res2.status).toBe(200);
    expect(res2.headers['x-current-page']).toBe('2');
  });

  // -------------------------------------------------------------
  // Product Details (200, 404)
  // -------------------------------------------------------------
  it('GET /api/products/:id returns product details with features formatted', async () => {
    const res = await request(app).get(`/api/products/${prodId1}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(prodId1);
    expect(res.body.title).toContain('هندزفری بلوتوثی');
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features).toContain('بلوتوث نسخه 5.3');
  });

  it('GET /api/products/:id returns 404 for non-existent product', async () => {
    const res = await request(app).get('/api/products/9999999');
    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------
  // Product Reviews (200, 201, 400, 404)
  // -------------------------------------------------------------
  it('GET /api/products/:id/reviews returns reviews list', async () => {
    const res = await request(app).get(`/api/products/${prodId1}/reviews`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/products/:id/reviews successfully creates review with 201', async () => {
    const res = await request(app)
      .post(`/api/products/${prodId1}/reviews`)
      .send({
        userName: 'علی رضایی',
        rating: 5,
        title: 'کیفیت عالی',
        comment: 'صدای بیس فوق‌العاده و شارژدهی عالی است',
        recommend: true
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.productId).toBe(prodId1);
    expect(res.body.rating).toBe(5);
    expect(res.body.title).toBe('کیفیت عالی');
    createdReviewId = res.body.id;

    // Verify it appears in GET /api/products/:id/reviews
    const getRes = await request(app).get(`/api/products/${prodId1}/reviews`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.some((r: any) => r.id === createdReviewId)).toBe(true);
  });

  it('POST /api/products/:id/reviews returns 400 when rating is less than 1 or greater than 5', async () => {
    const lowRatingRes = await request(app)
      .post(`/api/products/${prodId1}/reviews`)
      .send({
        userName: 'کاربر تست',
        rating: 0,
        title: 'ضعیف',
        comment: 'امتیاز نامعتبر'
      });
    expect(lowRatingRes.status).toBe(400);

    const highRatingRes = await request(app)
      .post(`/api/products/${prodId1}/reviews`)
      .send({
        userName: 'کاربر تست',
        rating: 6,
        title: 'خیلی عالی',
        comment: 'امتیاز بالای سقف'
      });
    expect(highRatingRes.status).toBe(400);
  });

  it('POST /api/products/:id/reviews returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(`/api/products/${prodId1}/reviews`)
      .send({
        rating: 4
        // missing userName, title, comment
      });
    expect(res.status).toBe(400);
  });

  it('POST /api/products/:id/reviews returns 404 for non-existent product ID', async () => {
    const res = await request(app)
      .post('/api/products/9999999/reviews')
      .send({
        userName: 'کاربر تست',
        rating: 4,
        title: 'نظر برای محصول ناموجود',
        comment: 'این محصول در دیتابیس وجود ندارد'
      });
    expect(res.status).toBe(404);
  });
  // -------------------------------------------------------------
  // Query Validation Negative Tests (400s)
  // -------------------------------------------------------------
  it('GET /api/products returns 400 for non-numeric minPrice or maxPrice', async () => {
    const resMin = await request(app).get('/api/products?minPrice=notanumber');
    expect(resMin.status).toBe(400);

    const resMax = await request(app).get('/api/products?maxPrice=invalid');
    expect(resMax.status).toBe(400);
  });

  it('GET /api/products returns 400 for non-numeric page or limit', async () => {
    const resPage = await request(app).get('/api/products?page=abc');
    expect(resPage.status).toBe(400);

    const resLimit = await request(app).get('/api/products?limit=xyz');
    expect(resLimit.status).toBe(400);
  });

  it('GET /api/products returns 400 for invalid inStock or hasDiscount enum value', async () => {
    const resStock = await request(app).get('/api/products?inStock=yes');
    expect(resStock.status).toBe(400);

    const resDiscount = await request(app).get('/api/products?hasDiscount=1');
    expect(resDiscount.status).toBe(400);
  });

  it('GET /api/products?category=همه returns all categories', async () => {
    const res = await request(app).get('/api/products?category=همه');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/products?sort=popular sorts by rating', async () => {
    const res = await request(app).get('/api/products?sort=popular');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
