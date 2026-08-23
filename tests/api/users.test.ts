import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import { db } from '../../server/db/index.js';
import { users, addresses } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import userRoutes from '../../server/routes/users.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';
import bcrypt from 'bcrypt';
import { errorHandler } from '../../server/middleware/errorHandler.js';

// Setup app
const app = express();
app.use(json());
app.use('/api/users', userRoutes);
app.use(errorHandler);

describe('Users & Addresses API', () => {
  const testUserId = 'test-user-prof-' + Date.now();
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testToken = jwt.sign({ userId: testUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  let createdAddressId1: string;
  let createdAddressId2: string;

  beforeAll(async () => {
    // Insert test user with valid bcrypt hash
    const initialHashedPassword = await bcrypt.hash('secret123', 10);
    await db.insert(users).values({
      id: testUserId,
      name: 'پروفایل تست',
      phone: testPhone,
      password: initialHashedPassword,
      email: 'test@example.com'
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(addresses).where(eq(addresses.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('GET /api/users/me should return current user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testUserId);
    expect(res.body.name).toBe('پروفایل تست');
    expect(res.body.password).toBeUndefined();
  });

  it('PUT /api/users/me should update profile details', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'علی رضایی تست',
        email: 'ali_updated@example.com'
      });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('علی رضایی تست');
    expect(res.body.user.email).toBe('ali_updated@example.com');
  });

  it('PUT /api/users/me/password should fail if current password is wrong', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        currentPassword: 'wrong_password',
        newPassword: 'newSecretPassword123'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('کلمه عبور فعلی نادرست است');
  });

  it('PUT /api/users/me/password should fail if new password is too short', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        currentPassword: 'secret123',
        newPassword: '123'
      });

    expect(res.status).toBe(400);
  });

  it('PUT /api/users/me/password should successfully update password', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        currentPassword: 'secret123',
        newPassword: 'brandNewPassword999'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('موفقیت');

    // Verify user password hash was updated
    const updatedUser = await db.query.users.findFirst({ where: eq(users.id, testUserId) });
    expect(updatedUser).toBeDefined();
    const isNewMatch = await bcrypt.compare('brandNewPassword999', updatedUser!.password);
    expect(isNewMatch).toBe(true);
  });

  it('POST /api/users/me/addresses should add first address as default', async () => {
    const res = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'منزل اول',
        name: 'علی رضایی',
        phone: testPhone,
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان آزادی، کوچه اول، پلاک ۱۰',
        postalCode: '1234567890'
      });

    expect(res.status).toBe(201);
    expect(res.body.address).toBeDefined();
    expect(res.body.address.title).toBe('منزل اول');
    expect(res.body.address.isDefault).toBe(true); // First address is default
    createdAddressId1 = res.body.address.id;
  });

  it('POST /api/users/me/addresses should add second address as non-default', async () => {
    const res = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'محل کار',
        name: 'علی رضایی',
        phone: testPhone,
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان انقلاب، پلاک ۲۰',
        postalCode: '9876543210'
      });

    expect(res.status).toBe(201);
    expect(res.body.address.title).toBe('محل کار');
    expect(res.body.address.isDefault).toBe(false);
    createdAddressId2 = res.body.address.id;
  });

  it('GET /api/users/me/addresses should list all user addresses', async () => {
    const res = await request(app)
      .get('/api/users/me/addresses')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('PUT /api/users/me/addresses/:id should update existing address', async () => {
    const res = await request(app)
      .put(`/api/users/me/addresses/${createdAddressId1}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'منزل تغییر یافته',
        name: 'علی رضایی',
        phone: testPhone,
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان آزادی، پلاک ۱۵',
        postalCode: '1234567890'
      });

    expect(res.status).toBe(200);
    expect(res.body.address.title).toBe('منزل تغییر یافته');
    expect(res.body.address.address).toBe('خیابان آزادی، پلاک ۱۵');
  });

  it('PUT /api/users/me/addresses/:id should return 404 for non-existent address', async () => {
    const res = await request(app)
      .put('/api/users/me/addresses/addr-nonexistent')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'آدرس نامعتبر',
        name: 'علی رضایی',
        phone: testPhone,
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان ناموجود',
        postalCode: '1234567890'
      });

    expect(res.status).toBe(404);
  });

  it('PUT /api/users/me/addresses/:id/default should return 404 for non-existent address', async () => {
    const res = await request(app)
      .put('/api/users/me/addresses/addr-nonexistent/default')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(404);
  });

  it('PUT /api/users/me/addresses/:id/default should switch default address atomically', async () => {
    const res = await request(app)
      .put(`/api/users/me/addresses/${createdAddressId2}/default`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('پیش‌فرض');

    const addr1 = await db.query.addresses.findFirst({ where: eq(addresses.id, createdAddressId1) });
    const addr2 = await db.query.addresses.findFirst({ where: eq(addresses.id, createdAddressId2) });
    expect(addr1?.isDefault).toBe(false);
    expect(addr2?.isDefault).toBe(true);
  });

  it('DELETE /api/users/me/addresses/:id should return 404 for non-existent address', async () => {
    const res = await request(app)
      .delete('/api/users/me/addresses/addr-nonexistent')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(404);
  });

  it('DELETE /api/users/me/addresses/:id should delete default address and fallback to remaining address', async () => {
    // createdAddressId2 is currently the default
    const res = await request(app)
      .delete(`/api/users/me/addresses/${createdAddressId2}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('حذف');

    // Verify remaining address createdAddressId1 was automatically promoted to default
    const remaining = await db.query.addresses.findFirst({ where: eq(addresses.id, createdAddressId1) });
    expect(remaining).toBeDefined();
    expect(remaining?.isDefault).toBe(true);
  });

  it('PUT /api/users/me should reject invalid email with 400', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ email: 'not_a_valid_email' });
    expect(res.status).toBe(400);
  });

  it('POST /api/users/me/addresses should reject invalid phone format or short address with 400', async () => {
    // Invalid phone
    const resBadPhone = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'خانه',
        name: 'علی',
        phone: '12345',
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان آزادی'
      });
    expect(resBadPhone.status).toBe(400);

    // Address too short (< 5 chars)
    const resShortAddr = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'خانه',
        name: 'علی',
        phone: testPhone,
        province: 'تهران',
        city: 'تهران',
        address: 'کو'
      });
    expect(resShortAddr.status).toBe(400);
  });

  it('should return 401 for unauthenticated requests on user endpoints', async () => {
    const getMe = await request(app).get('/api/users/me');
    expect(getMe.status).toBe(401);

    const putMe = await request(app).put('/api/users/me').send({});
    expect(putMe.status).toBe(401);

    const putPass = await request(app).put('/api/users/me/password').send({});
    expect(putPass.status).toBe(401);

    const getAddrs = await request(app).get('/api/users/me/addresses');
    expect(getAddrs.status).toBe(401);
  });
});
