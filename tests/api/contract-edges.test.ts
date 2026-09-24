import { describe, it, expect, beforeAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { products, productFeatures } from '../../server/db/schema.js';

// Contract + edge battery for the public read-only API: the shape the storefront depends on, the
// headers it caches on, and the inputs an attacker or a broken client sends. Every expectation below
// was read out of the route source or measured against it — none of it is assumed.
const json = (res: any) => res.body;
const LEAK = /at .*\.ts:\d+|node_modules|SQLITE_|SqliteError|PRAGMA/;

describe('Public API contract and edges', () => {
  const stamp = Date.now();
  let id1: number;

  beforeAll(async () => {
    const [p1] = await db.insert(products).values({
      title: `قرارداد تست ${stamp}`,
      category: 'audio',
      price: 150000,
      originalPrice: 200000,
      discount: 25,
      brand: 'انکر',
      image: 'https://example.com/c.jpg',
      stockQuantity: 7,
      sku: `CONTRACT-1-${stamp}`,
      costPrice: 99999,
      barcode: 'BARCODE-INTERNAL',
    }).returning();
    id1 = p1.id;
    await db.insert(productFeatures).values([{ productId: id1, feature: 'ویژگی قرارداد' }]);
    await db.insert(products).values({
      title: `قرارداد تست ۲ ${stamp}`,
      category: 'cables',
      price: 50000,
      brand: 'باسئوس',
      image: 'https://example.com/c2.jpg',
      stockQuantity: 2,
      sku: `CONTRACT-2-${stamp}`,
    });
  });

  it('GET /api/health answers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/products: array + pagination and cache header contract', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(json(res))).toBe(true);
    expect(Number(res.headers['x-total-count'])).toBe(2);
    expect(Number(res.headers['x-current-page'])).toBe(1);
    expect(Number(res.headers['x-total-pages'])).toBe(1);
    expect(String(res.headers['cache-control'])).toContain('max-age=30');
    for (const p of json(res)) {
      expect(typeof p.id).toBe('number');
      expect(typeof p.title).toBe('string');
      expect(p.title.length).toBeGreaterThan(0);
      expect(typeof p.price).toBe('number');
      expect(p.price).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(p.features)).toBe(true);
    }
  });

  it('limit=1 respects the header count contract', async () => {
    const res = await request(app).get('/api/products?limit=1');
    expect(res.status).toBe(200);
    expect(json(res).length).toBe(1);
    expect(Number(res.headers['x-total-count'])).toBe(2);
    expect(Number(res.headers['x-total-pages'])).toBe(2);
  });

  it('GET /api/products/:id: features as strings, wholesale fields never exposed', async () => {
    const res = await request(app).get(`/api/products/${id1}`);
    expect(res.status).toBe(200);
    const p = json(res);
    expect(p.id).toBe(id1);
    expect(p.features).toEqual(['ویژگی قرارداد']);
    // costPrice is wholesale and barcode is a supplier-reconciliation field: public responses must
    // not carry them, nor the admin-only isActive flag.
    expect(p).not.toHaveProperty('costPrice');
    expect(p).not.toHaveProperty('barcode');
    expect(p).not.toHaveProperty('isActive');
    expect(String(res.headers['cache-control'])).toContain('max-age=60');
  });

  it('GET /api/products/:id unknown id → 404, no internals in the body', async () => {
    const res = await request(app).get('/api/products/999999');
    expect(res.status).toBe(404);
    expect(json(res).message).toBeDefined();
    expect(res.text).not.toMatch(LEAK);
  });

  it('non-numeric id → 400 VALIDATION_ERROR, never 500', async () => {
    const res = await request(app).get('/api/products/abc');
    expect(res.status).toBe(400);
    expect(json(res).error?.code).toBe('VALIDATION_ERROR');
    expect(json(res).error?.requestId).toBeDefined();
  });

  // The query schema rejects what it does not understand. Measured, not guessed: these were 400 and
  // these were 200 against the real handlers.
  it('invalid query inputs are refused with 400, never 500, never a stack leak', async () => {
    for (const qs of [
      'limit=abc', 'page=-1', 'page=abc', 'minPrice=abc', 'maxPrice=-5',
      'inStock=maybe', 'hasDiscount=1', 'limit=-5', 'page=1.5',
    ]) {
      const res = await request(app).get(`/api/products?${qs}`);
      expect(res.status, `${qs} → ${res.status}`).toBe(400);
      expect(json(res).error?.code, `${qs} code`).toBe('VALIDATION_ERROR');
      expect(res.text).not.toMatch(LEAK);
    }
  });

  it('hostile-but-parseable inputs are served safely (200, bounded, no leak)', async () => {
    for (const qs of [
      'limit=0',
      'limit=99999',
      'page=0',
      'sort=price-asc',
      'category=; DROP TABLE products;--',
      `search=${encodeURIComponent("' OR 1=1--")}`,
      `search=${encodeURIComponent('<script>alert(1)</script>')}`,
      `search=${'x'.repeat(2000)}`,
    ]) {
      const res = await request(app).get(`/api/products?${qs}`);
      expect(res.status, `${qs} → ${res.status}`).toBe(200);
      expect(Array.isArray(json(res)), `${qs} → non-array`).toBe(true);
      expect(json(res).length, `${qs} returned more than the catalogue`).toBeLessThanOrEqual(2);
      expect(res.text).not.toMatch(LEAK);
    }
    // limit=0 must return nothing, not everything.
    const zero = await request(app).get('/api/products?limit=0');
    expect(json(zero).length).toBe(0);
    // a huge limit must still be a superset request, not an error
    const huge = await request(app).get('/api/products?limit=99999');
    expect(json(huge).length).toBe(2);
  });

  it('/api/products/:id/reviews: paginated object when asked, array otherwise', async () => {
    const paged = await request(app).get(`/api/products/${id1}/reviews?page=1&limit=5`);
    expect(paged.status).toBe(200);
    expect(Array.isArray(json(paged).reviews)).toBe(true);
    expect(json(paged).page).toBe(1);
    const plain = await request(app).get(`/api/products/${id1}/reviews`);
    expect(plain.status).toBe(200);
    expect(Array.isArray(json(plain))).toBe(true);
  });

  it('the other public read endpoints keep their JSON contract', async () => {
    const cats = await request(app).get('/api/categories');
    expect(cats.status).toBe(200);
    expect(Array.isArray(json(cats))).toBe(true);

    const brands = await request(app).get('/api/brands');
    expect(brands.status).toBe(200);
    expect(Array.isArray(json(brands))).toBe(true);

    const blog = await request(app).get('/api/blog');
    expect(blog.status).toBe(200);
    expect(Array.isArray(json(blog))).toBe(true);
    // /api/blog rows carry `id`, not `slug` — consumers keyed on slug have broken before.
    for (const post of json(blog)) expect(post).toHaveProperty('id');

    const settings = await request(app).get('/api/settings');
    expect(settings.status).toBe(200);
    expect(typeof json(settings)).toBe('object');
    expect(Array.isArray(json(settings))).toBe(false);
  });

  it('hardening headers are on public responses', async () => {
    const res = await request(app).get('/api/products');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(String(res.headers['x-content-type-options'])).toBe('nosniff');
  });
});
