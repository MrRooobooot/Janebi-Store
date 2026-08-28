import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app';
import { db } from '../../server/db';
import { users } from '../../server/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env';

describe('Frontend-Backend End-to-End Contract & Parity Verification', () => {
  let userToken: string;
  let adminToken: string;
  let normalUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    // 1. Create or retrieve regular user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.phone, '09121111111')
    });
    if (existingUser) {
      normalUserId = existingUser.id;
    } else {
      const [u] = await db.insert(users).values({
        id: 'usr_contract_test_' + Date.now(),
        name: 'کاربر تستی کانترکت',
        phone: '09121111111',
        password: '$2b$10$hashedpasswordfore2econtracttestingonly123456',
        role: 'user',
        vipPoints: 10
      }).returning();
      normalUserId = u.id;
    }

    // 2. Create or retrieve admin user
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.phone, '09129999999')
    });
    if (existingAdmin) {
      adminUserId = existingAdmin.id;
    } else {
      const [a] = await db.insert(users).values({
        id: 'adm_contract_test_' + Date.now(),
        name: 'مدیر تستی کانترکت',
        phone: '09129999999',
        password: '$2b$10$hashedpasswordfore2econtracttestingonly123456',
        role: 'admin',
        vipPoints: 0
      }).returning();
      adminUserId = a.id;
    }

    userToken = jwt.sign({ userId: normalUserId, role: 'user' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ userId: adminUserId, role: 'admin' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  });

  it('verifies public catalogue API contracts (/api/products, /api/categories, /api/brands, /api/settings)', async () => {
    const productsRes = await request(app).get('/api/products').expect(200);
    expect(Array.isArray(productsRes.body)).toBe(true);

    const categoriesRes = await request(app).get('/api/categories').expect(200);
    expect(Array.isArray(categoriesRes.body)).toBe(true);

    const brandsRes = await request(app).get('/api/brands').expect(200);
    expect(Array.isArray(brandsRes.body)).toBe(true);

    const settingsRes = await request(app).get('/api/settings').expect(200);
    expect(settingsRes.body).toHaveProperty('storeName');
  });

  it('verifies user authenticated flow contracts (profile, wishlist, cart, orders)', async () => {
    // 1. Auth Me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(meRes.body.user.phone).toBe('09121111111');

    // 2. Wishlist
    const wishlistRes = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(Array.isArray(wishlistRes.body)).toBe(true);

    // 3. Cart
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(Array.isArray(cartRes.body)).toBe(true);

    // 4. Orders
    const ordersRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(Array.isArray(ordersRes.body)).toBe(true);
  });

  it('verifies admin management contracts (stats, analytics, users)', async () => {
    // 1. Stats
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(statsRes.body).toHaveProperty('metrics');
    expect(statsRes.body.metrics).toHaveProperty('totalRevenue');
    expect(statsRes.body.metrics).toHaveProperty('totalOrders');

    // 2. Analytics
    const analyticsRes = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(analyticsRes.body).toHaveProperty('financials');
    expect(analyticsRes.body).toHaveProperty('categoryPerformance');

    // 3. Users List
    const usersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(usersRes.body)).toBe(true);
  });
});
