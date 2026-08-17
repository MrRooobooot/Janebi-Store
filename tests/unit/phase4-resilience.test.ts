import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app.js';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.js';

describe('Phase 4 — Concurrency & UX Resilience Verification', () => {
  it('verifies ErrorBoundary catches rendering exceptions', () => {
    const error = new Error('Test rendering fault');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it('handles high volume burst of simultaneous API requests gracefully', async () => {
    const requestCount = 20;
    const promises = Array.from({ length: requestCount }).map(() =>
      request(app).get('/api/products?page=1&limit=2')
    );

    const responses = await Promise.all(promises);
    expect(responses.length).toBe(requestCount);

    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.headers['x-request-id']).toBeDefined();
    }
  });

  it('handles unauthenticated protected route access with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/orders/my-orders');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Unauthorized');
  });
});
