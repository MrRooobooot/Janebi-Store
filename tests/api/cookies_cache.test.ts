import { describe, it, expect } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { appCache } from '../../server/utils/cache.js';

describe('HttpOnly Cookies & In-Memory Caching Verification', () => {
  const timestamp = Date.now();
  const testPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const testPassword = 'Password123!';
  const testName = 'کاربر کوکی و کش';
  let accessToken: string;
  let refreshToken: string;

  it('sets HttpOnly Set-Cookie headers on user registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: testName,
        phone: testPhone,
        password: testPassword,
      });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;

    const setCookie = res.headers['set-cookie'] || '';
    expect(setCookie).toContain('accessToken=');
    expect(setCookie).toContain('refreshToken=');
    expect(setCookie).toContain('HttpOnly');
  });

  it('authenticates successfully using HttpOnly cookie without Authorization header', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe(testPhone);
  });

  it('refreshes tokens via /api/auth/refresh using refreshToken cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('serves cached responses with X-Cache HIT for products and categories', async () => {
    appCache.invalidate();

    // First request - MISS
    const missRes = await request(app).get('/api/products?page=1&limit=5');
    expect(missRes.status).toBe(200);
    expect(missRes.headers['x-cache']).toBe('MISS');

    // Second request - HIT
    const hitRes = await request(app).get('/api/products?page=1&limit=5');
    expect(hitRes.status).toBe(200);
    expect(hitRes.headers['x-cache']).toBe('HIT');
  });

  it('clears cookies on logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'] || '';
    expect(setCookie).toContain('Max-Age=0');
  });
});
