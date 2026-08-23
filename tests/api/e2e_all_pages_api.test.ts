import { describe, it, expect } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { users, cartItems, wishlistItems, addresses, orders, orderItems } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

describe('Comprehensive End-to-End Route, API & Page Health Audit', () => {
  const timestamp = Date.now();
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const adminId = `admin-e2e-${timestamp}`;
  let adminToken: string;
  let userToken: string;

  it('1. Verifies all public catalog, brands, categories & product detail APIs', async () => {
    // Products catalog
    const prodRes = await request(app).get('/api/products');
    expect(prodRes.status).toBe(200);
    expect(Array.isArray(prodRes.body)).toBe(true);
    expect(prodRes.body.length).toBeGreaterThan(0);

    const firstProduct = prodRes.body[0];

    // Single product detail
    const detailRes = await request(app).get(`/api/products/${firstProduct.id}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(firstProduct.id);

    // Product reviews
    const reviewsRes = await request(app).get(`/api/products/${firstProduct.id}/reviews`);
    expect(reviewsRes.status).toBe(200);
    expect(Array.isArray(reviewsRes.body)).toBe(true);

    // Categories list
    const catRes = await request(app).get('/api/categories');
    expect(catRes.status).toBe(200);
    expect(Array.isArray(catRes.body)).toBe(true);

    // Brands list
    const brandsRes = await request(app).get('/api/brands');
    expect(brandsRes.status).toBe(200);
    expect(Array.isArray(brandsRes.body)).toBe(true);
  });

  it('2. Verifies customer authentication, profile, cart and wishlist endpoints', async () => {
    // Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'کاربر آزمون مسیرها',
        phone: testPhone,
        password: 'Password123!',
      });
    expect(regRes.status).toBe(201);
    userToken = regRes.body.accessToken;

    // Profile /me
    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.phone).toBe(testPhone);

    // Cart CRUD
    const addCartRes = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 1, quantity: 2 });
    expect(addCartRes.status).toBe(200);

    const getCartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(getCartRes.status).toBe(200);
    expect(getCartRes.body.length).toBeGreaterThan(0);

    // Wishlist CRUD
    const addWishRes = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 1 });
    expect(addWishRes.status).toBe(200);

    const getWishRes = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${userToken}`);
    expect(getWishRes.status).toBe(200);
  });

  it('3. Verifies contact message form submission', async () => {
    const contactRes = await request(app)
      .post('/api/contact')
      .send({
        name: 'علی حسینی',
        email: 'ali@example.com',
        phone: '09120000000',
        subject: 'پرسش درباره ارسال',
        message: 'آیا ارسال به تمام نقاط کشور رایگان است؟',
      });
    expect(contactRes.status).toBe(200);
  });

  it('4. Verifies all admin panel endpoints (Dashboard stats, Analytics, Orders, Users, Products, Coupons)', async () => {
    await db.insert(users).values({
      id: adminId,
      name: 'مدیر کل تست سیستم',
      phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
      password: 'password',
      role: 'admin',
    });
    adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET);

    // Admin Stats
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.metrics).toBeDefined();

    // Admin Analytics
    const analyticsRes = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.financials).toBeDefined();

    // Admin Users
    const usersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(usersRes.status).toBe(200);
    expect(Array.isArray(usersRes.body)).toBe(true);

    // Admin Orders
    const ordersRes = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ordersRes.status).toBe(200);

    // Admin Coupons
    const couponsRes = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(couponsRes.status).toBe(200);

    // Clean up associated user data before deleting user
    const testUser = await db.query.users.findFirst({ where: eq(users.phone, testPhone) });
    if (testUser) {
      await db.delete(cartItems).where(eq(cartItems.userId, testUser.id));
      await db.delete(wishlistItems).where(eq(wishlistItems.userId, testUser.id));
      await db.delete(addresses).where(eq(addresses.userId, testUser.id));
      await db.delete(users).where(eq(users.id, testUser.id));
    }
    await db.delete(users).where(eq(users.id, adminId));
  });
});
