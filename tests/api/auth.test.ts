import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { users } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

describe('Auth API & JWT Security Integration Tests', () => {
  const timestamp = Date.now();
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testPassword = 'validPassword123';
  const testName = 'کاربر آزمایشی احراز هویت';
  let createdUserId: string;

  afterAll(async () => {
    if (createdUserId) {
      await db.delete(users).where(eq(users.id, createdUserId));
    }
  });

  // -------------------------------------------------------------
  // JWT & Authorization Security (401s)
  // -------------------------------------------------------------
  it('GET /api/auth/me returns 401 when missing authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Unauthorized');
  });

  it('GET /api/auth/me returns 401 when authorization header is not Bearer format', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Basic 123456');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns 401 for malformed / garbage token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt.token');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Unauthorized');
  });

  it('GET /api/auth/me returns 401 for token signed with invalid secret key', async () => {
    const invalidSignatureToken = jwt.sign(
      { userId: 'usr-fake-id' },
      'wrong-secret-key-that-does-not-match-env-secret-12345'
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${invalidSignatureToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Unauthorized');
  });

  it('GET /api/auth/me returns 401 for expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: 'usr-fake-id' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Unauthorized');
  });

  it('GET /api/auth/me returns 401 for valid token of non-existent user in DB', async () => {
    const nonExistentUserToken = jwt.sign(
      { userId: 'usr-does-not-exist-in-db-99999' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${nonExistentUserToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('User not found');
  });

  // -------------------------------------------------------------
  // Registration Negative & Positive Tests (400, 201)
  // -------------------------------------------------------------
  it('POST /api/auth/register fails with 400 when phone number format is invalid', async () => {
    const invalidPhones = ['12345', '08123456789', '0912345', '091234567890', 'invalid_phone'];
    
    for (const phone of invalidPhones) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: testName,
          phone,
          password: testPassword
        });
      expect(res.status).toBe(400);
    }
  });

  it('POST /api/auth/register fails with 400 when password is shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: testName,
        phone: testPhone,
        password: '123'
      });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/register fails with 400 when name is missing or too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'A',
        phone: testPhone,
        password: testPassword
      });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/register succeeds with 201 for valid registration payload', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: testName,
        phone: testPhone,
        password: testPassword
      });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.phone).toBe(testPhone);
    expect(res.body.user.name).toBe(testName);
    createdUserId = res.body.user.id;
  });

  it('POST /api/auth/register fails with 400 when phone number is duplicate', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'کاربر تکراری',
        phone: testPhone, // already registered in previous test
        password: 'anotherPassword123'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('قبلا ثبت نام کرده است');
  });

  // -------------------------------------------------------------
  // Login Negative & Positive Tests (400, 401, 200)
  // -------------------------------------------------------------
  it('POST /api/auth/login fails with 400 on invalid phone format or missing password', async () => {
    const badPhone = await request(app)
      .post('/api/auth/login')
      .send({ phone: 'bad-phone', password: 'somepassword' });
    expect(badPhone.status).toBe(400);

    const emptyPass = await request(app)
      .post('/api/auth/login')
      .send({ phone: testPhone, password: '' });
    expect(emptyPass.status).toBe(400);
  });

  it('POST /api/auth/login fails with 401 for non-existent user phone', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '09129998877',
        password: 'anyPassword123'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('اشتباه است');
  });

  it('POST /api/auth/login fails with 401 for incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: testPhone,
        password: 'incorrectPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('اشتباه است');
  });

  it('POST /api/auth/login succeeds with 200 for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: testPhone,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.phone).toBe(testPhone);
    expect(res.body.user.password).toBeUndefined();
    expect(Array.isArray(res.body.user.addresses)).toBe(true);
  });

  it('GET /api/auth/me returns 200 with user profile and addresses when authenticated', async () => {
    const validToken = jwt.sign({ userId: createdUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(createdUserId);
    expect(res.body.user.phone).toBe(testPhone);
    expect(res.body.user.password).toBeUndefined();
  });

  it('GET /api/auth/me returns 401 for valid JWT token lacking userId in payload', async () => {
    const noUserIdToken = jwt.sign({ email: 'nouserid@example.com' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${noUserIdToken}`);

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns 401 for whitespace or empty Bearer token', async () => {
    const resEmpty = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer ');
    expect(resEmpty.status).toBe(401);

    const resWhitespace = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer    ');
    expect(resWhitespace.status).toBe(401);
  });

  it('POST /api/auth/register fails with 400 when body is completely empty', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login fails with 400 when body is completely empty', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
  });
});
