import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import { db } from '../../server/db/index.js';
import { users, products, orders, coupons, productFeatures, cartItems, wishlistItems, reviews } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import adminRoutes from '../../server/routes/admin.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';

// Setup app
const app = express();
app.use(json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

describe('Admin API', () => {
  const adminId = 'test-admin-' + Date.now();
  const userId = 'test-regular-user-' + Date.now();
  const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const userToken = jwt.sign({ userId: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  let createdProductId: number;
  let cascadeProductId: number;
  let testOrderId: string;

  beforeAll(async () => {
    // Insert test admin
    await db.insert(users).values({
      id: adminId,
      name: 'مدیر تست',
      phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
      password: 'hash',
      role: 'admin'
    });

    // Insert regular user
    await db.insert(users).values({
      id: userId,
      name: 'کاربر تست',
      phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
      password: 'hash',
      role: 'user'
    });

    // Insert test order for status updates
    testOrderId = `ORD-ADM-${Date.now()}`;
    await db.insert(orders).values({
      id: testOrderId,
      userId: userId,
      date: '1403/05/25',
      status: 'pending_payment',
      statusText: 'در انتظار پرداخت',
      total: 100000,
      subtotal: 100000,
      paymentMethod: 'online',
      shippingMethod: 'standard',
      recipientName: 'کاربر تست',
      recipientPhone: '09120000000',
      recipientAddress: 'تهران'
    });
  });

  afterAll(async () => {
    // Cleanup
    if (createdProductId) {
      await db.delete(products).where(eq(products.id, createdProductId));
    }
    if (cascadeProductId) {
      await db.delete(products).where(eq(products.id, cascadeProductId));
    }
    await db.delete(orders).where(eq(orders.id, testOrderId));
    await db.delete(users).where(eq(users.id, adminId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it('should strictly block non-admin users with 403 on ALL admin endpoints', async () => {
    // 1. Stats
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);
    expect(statsRes.status).toBe(403);

    // 2. Users list & role update
    const usersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(usersRes.status).toBe(403);

    const roleRes = await request(app)
      .put(`/api/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: 'admin' });
    expect(roleRes.status).toBe(403);

    // 3. Orders list & status update
    const ordersRes = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${userToken}`);
    expect(ordersRes.status).toBe(403);

    const orderStatusRes = await request(app)
      .put(`/api/admin/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'shipped' });
    expect(orderStatusRes.status).toBe(403);

    // 4. Products CRUD
    const createProdRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'T', category: 'c', price: 100 });
    expect(createProdRes.status).toBe(403);

    const updateProdRes = await request(app)
      .put('/api/admin/products/1')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Updated' });
    expect(updateProdRes.status).toBe(403);

    const deleteProdRes = await request(app)
      .delete('/api/admin/products/1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(deleteProdRes.status).toBe(403);

    // 5. Coupons CRUD
    const couponsRes = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${userToken}`);
    expect(couponsRes.status).toBe(403);

    const createCouponRes = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: 'FAIL', label: 'Fail' });
    expect(createCouponRes.status).toBe(403);

    const deleteCouponRes = await request(app)
      .delete('/api/admin/coupons/FAIL')
      .set('Authorization', `Bearer ${userToken}`);
    expect(deleteCouponRes.status).toBe(403);
  });

  it('should return 401 for unauthenticated requests on admin endpoints', async () => {
    const res1 = await request(app).get('/api/admin/stats');
    expect(res1.status).toBe(401);

    const res2 = await request(app).get('/api/admin/users');
    expect(res2.status).toBe(401);

    const res3 = await request(app).get('/api/admin/orders');
    expect(res3.status).toBe(401);

    const res4 = await request(app).get('/api/admin/coupons');
    expect(res4.status).toBe(401);
  });

  it('GET /api/admin/users should return safe user list without passwords for admin', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const foundAdmin = res.body.find((u: any) => u.id === adminId);
    expect(foundAdmin).toBeDefined();
    expect(foundAdmin.password).toBeUndefined();
  });

  it('POST /api/admin/products should return 400 when missing required fields', async () => {
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // missing title, category, price
        description: 'Just description'
      });

    expect(res.status).toBe(400);
  });

  it('POST /api/admin/coupons should return 400 when missing code or label', async () => {
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        percent: 10
      });

    expect(res.status).toBe(400);
  });

  it('GET /api/admin/stats should return metrics for admin', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(typeof res.body.metrics.totalProducts).toBe('number');
    // Sidebar badge counters (unread contact messages / pending review moderation)
    expect(typeof res.body.metrics.unreadMessages).toBe('number');
    expect(typeof res.body.metrics.pendingReviews).toBe('number');
  });

  it('POST /api/admin/products should create product with stockQuantity', async () => {
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'کابل شارژ تست ادمین',
        category: 'accessories',
        price: 150000,
        originalPrice: 200000,
        discount: 25,
        brand: 'انکر',
        image: 'https://example.com/cable.jpg',
        stockQuantity: 25,
        sku: 'ANK-TEST-01'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.stockQuantity).toBe(25);
    createdProductId = res.body.id;
  });

  it('PUT /api/admin/products/:id should update product stockQuantity', async () => {
    const res = await request(app)
      .put(`/api/admin/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stockQuantity: 40,
        price: 160000
      });

    expect(res.status).toBe(200);
    expect(res.body.stockQuantity).toBe(40);
    expect(res.body.price).toBe(160000);
  });

  it('PUT /api/admin/products/:id should return 404 for non-existent product', async () => {
    const res = await request(app)
      .put('/api/admin/products/9999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'محصول ناموجود'
      });

    expect(res.status).toBe(404);
  });

  it('DELETE /api/admin/products/:id should delete product safely', async () => {
    const res = await request(app)
      .delete(`/api/admin/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('حذف');
    createdProductId = 0; // deleted
  });

  it('DELETE /api/admin/products/:id should return 404 for non-existent product', async () => {
    const res = await request(app)
      .delete('/api/admin/products/9999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('DELETE /api/admin/products/:id should cascade delete productFeatures, cartItems, wishlistItems, reviews', async () => {
    // 1. Create a product with associated features, cart, wishlist, and reviews
    const [prod] = await db.insert(products).values({
      title: 'محصول با اتصالات وابسته',
      category: 'accessories',
      price: 100000,
      image: '/test.jpg',
      brand: 'تست',
      stockQuantity: 10,
      sku: `SKU-CASCADE-${Date.now()}`
    }).returning();
    cascadeProductId = prod.id;

    // 2. Insert associated records
    await db.insert(productFeatures).values({
      productId: cascadeProductId,
      feature: 'ویژگی تستی'
    });
    await db.insert(cartItems).values({
      id: `cart-cascade-${Date.now()}`,
      userId,
      productId: cascadeProductId,
      quantity: 1,
      addedAt: Date.now()
    });
    await db.insert(wishlistItems).values({
      id: `wish-cascade-${Date.now()}`,
      userId,
      productId: cascadeProductId,
      addedAt: Date.now()
    });
    await db.insert(reviews).values({
      id: `rev-cascade-${Date.now()}`,
      productId: cascadeProductId,
      userId,
      userName: 'کاربر تست',
      rating: 5,
      title: 'عالی',
      comment: 'محصول عالی بود',
      date: '1403/05/25'
    });

    // 3. Perform cascading delete
    const res = await request(app)
      .delete(`/api/admin/products/${cascadeProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // 4. Verify all dependent records are deleted
    const features = await db.query.productFeatures.findMany({ where: eq(productFeatures.productId, cascadeProductId) });
    const cart = await db.query.cartItems.findMany({ where: eq(cartItems.productId, cascadeProductId) });
    const wishlist = await db.query.wishlistItems.findMany({ where: eq(wishlistItems.productId, cascadeProductId) });
    const revs = await db.query.reviews.findMany({ where: eq(reviews.productId, cascadeProductId) });
    const deletedProduct = await db.query.products.findFirst({ where: eq(products.id, cascadeProductId) });

    expect(features.length).toBe(0);
    expect(cart.length).toBe(0);
    expect(wishlist.length).toBe(0);
    expect(revs.length).toBe(0);
    expect(deletedProduct).toBeUndefined();

    cascadeProductId = 0;
  });

  it('DELETE /api/admin/coupons/:code should return 404 for non-existent coupon', async () => {
    const res = await request(app)
      .delete('/api/admin/coupons/NONEXISTENT')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('DELETE /api/admin/coupons/:code should delete existing coupon successfully', async () => {
    const code = `ADMTEST_${Date.now()}`;
    await db.insert(coupons).values({
      code,
      percent: 15,
      minTotal: 100000,
      label: 'تست ادمین',
      active: true
    });

    const res = await request(app)
      .delete(`/api/admin/coupons/${code.toLowerCase()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const inDb = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
    expect(inDb).toBeUndefined();
  });

  it('PUT /api/admin/orders/:id/status should return 400 for invalid status', async () => {
    const res = await request(app)
      .put(`/api/admin/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
  });

  it('PUT /api/admin/orders/:id/status should return 404 for non-existent order', async () => {
    const res = await request(app)
      .put('/api/admin/orders/ORD-NONEXISTENT/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped' });

    expect(res.status).toBe(404);
  });

  it('PUT /api/admin/orders/:id/status should update status successfully', async () => {
    const res = await request(app)
      .put(`/api/admin/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('shipped');
    expect(res.body.statusText).toBe('ارسال شده');
  });

  it('PUT /api/admin/users/:id/role should return 400 for invalid role', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superadmin' });

    expect(res.status).toBe(400);
  });

  it('PUT /api/admin/users/:id/role should return 404 for non-existent user', async () => {
    const res = await request(app)
      .put('/api/admin/users/usr-nonexistent/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(404);
  });

  it('PUT /api/admin/users/:id/role should update role successfully', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    const updated = await db.query.users.findFirst({ where: eq(users.id, userId) });
    expect(updated?.role).toBe('admin');

    // Revert role back to user
    await db.update(users).set({ role: 'user' }).where(eq(users.id, userId));
  });

  it('POST /api/admin/coupons should create fixed amount coupon with 201', async () => {
    const fixedCode = `ADMFIX_${Date.now()}`;
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: fixedCode,
        amount: 30000,
        minTotal: 150000,
        label: 'تخفیف ۳۰ هزار تومانی ادمین',
        active: true
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(fixedCode);
    expect(res.body.amount).toBe(30000);

    await db.delete(coupons).where(eq(coupons.code, fixedCode));
  });

  it('DELETE /api/admin/products/:id returns 400 for non-numeric product ID', async () => {
    const res = await request(app)
      .delete('/api/admin/products/not-a-number')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('PUT /api/admin/orders/:id/status successfully transitions across all valid status states', async () => {
    const statuses: Array<'processing' | 'shipped' | 'delivered'> = [
      'processing',
      'shipped',
      'delivered'
    ];

    for (const st of statuses) {
      const res = await request(app)
        .put(`/api/admin/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: st });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(st);
    }

    // Business rule (data integrity): a DELIVERED order can no longer be
    // cancelled from the panel — restocking sold goods and clawing back
    // earned points on a completed sale would corrupt inventory/loyalty.
    const cancelDelivered = await request(app)
      .put(`/api/admin/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });
    expect(cancelDelivered.status).toBe(400);
    expect(cancelDelivered.body.status ?? cancelDelivered.body.message).toBeDefined();
  });
});
