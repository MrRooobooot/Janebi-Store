import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app.js';
import { AppError, BadRequestError, NotFoundError, UnauthorizedError } from '../../server/errors/AppError.js';
import { env } from '../../server/env.js';

describe('Phase 1 — Production Foundation Integration Tests', () => {
  // -------------------------------------------------------------
  // 1. Request ID Tracing
  // -------------------------------------------------------------
  it('generates a new UUID X-Request-ID when not provided by client', async () => {
    const res = await request(app).get('/api/products');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('preserves and echoes back client-supplied X-Request-ID', async () => {
    const customRequestId = 'client-trace-id-12345-abcdef';
    const res = await request(app)
      .get('/api/products')
      .set('X-Request-ID', customRequestId);

    expect(res.headers['x-request-id']).toBe(customRequestId);
  });

  // -------------------------------------------------------------
  // 2. Standardized Error Response Envelope
  // -------------------------------------------------------------
  it('returns standardized error format on 404 not found route', async () => {
    const res = await request(app).get('/api/non-existent-endpoint-404');
    expect(res.status).toBe(404);
    // Standardized envelope properties
    expect(res.body.status).toBe('error');
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBeDefined();
    expect(res.body.error.message).toBeDefined();
    expect(res.body.error.requestId).toBeDefined();
  });

  it('returns standardized error format on validation failure with details and requestId', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: 'invalid-phone-format' }); // missing password and invalid phone

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBeDefined();
    expect(res.body.error.requestId).toBeDefined();
    expect(res.body.error.details).toBeDefined();
  });

  it('returns standardized error format on invalid JSON body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ "phone": "09123456789", invalid_json }');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(res.body.error.requestId).toBeDefined();
  });

  // -------------------------------------------------------------
  // 3. Security Headers via Helmet
  // -------------------------------------------------------------
  it('sets essential Helmet security headers on all responses', async () => {
    const res = await request(app).get('/api/products');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-download-options']).toBe('noopen');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  // -------------------------------------------------------------
  // 4. CORS Behavior
  // -------------------------------------------------------------
  it('includes exposed headers in CORS response', async () => {
    const res = await request(app).get('/api/products');
    expect(res.headers['access-control-expose-headers']).toBeDefined();
    expect(res.headers['access-control-expose-headers']).toContain('X-Request-ID');
  });

  // -------------------------------------------------------------
  // 5. AppError Class Hierarchy
  // -------------------------------------------------------------
  it('AppError creates operational error with correct code and status', () => {
    const badReq = new BadRequestError('تست درخواست نامعتبر');
    expect(badReq.statusCode).toBe(400);
    expect(badReq.code).toBe('BAD_REQUEST');
    expect(badReq.isOperational).toBe(true);

    const notFound = new NotFoundError('محصول یافت نشد');
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');

    const unauth = new UnauthorizedError('توکن معتبر نیست');
    expect(unauth.statusCode).toBe(401);
    expect(unauth.code).toBe('UNAUTHORIZED');
  });

  // -------------------------------------------------------------
  // 6. Environment Allowed Origins Configuration
  // -------------------------------------------------------------
  it('correctly calculates allowed origins list from environment', () => {
    expect(env.allowedOrigins).toBeInstanceOf(Array);
    expect(env.allowedOrigins).toContain(env.APP_URL);
  });
});
