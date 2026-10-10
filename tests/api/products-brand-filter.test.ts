import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { products } from '../../server/db/schema.js';
import { inArray } from 'drizzle-orm';

/**
 * Regression: the catalogue API must filter by brand under BOTH spellings.
 *
 * The brand directory links with `?brand=` (src/pages/static/Brands.tsx) while
 * the catalogue hook sends `?brands=`; before this test the singular form was
 * silently ignored and `?brand=MCdodo` returned the WHOLE catalogue (prod:
 * x-total-count 45 instead of 7). One concept, two spellings — both must filter.
 */
describe('catalog brand filter — ?brand= and ?brands= are equivalent', () => {
  const stamp = Date.now();
  const brandA = `BRAND-UNIQUE-${stamp}`;
  const brandB = `BRAND-OTHER-${stamp}`;

  beforeAll(async () => {
    await db.insert(products).values([
      {
        title: `محصول تست برند الف ${stamp}`,
        category: 'cables',
        price: 100000,
        brand: brandA,
        image: '/images/test-a.webp',
        stockQuantity: 5,
        sku: `BR-A-${stamp}`,
      },
      {
        title: `محصول تست برند ب ${stamp}`,
        category: 'cables',
        price: 120000,
        brand: brandB,
        image: '/images/test-b.webp',
        stockQuantity: 5,
        sku: `BR-B-${stamp}`,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(products).where(inArray(products.brand, [brandA, brandB]));
  });

  it('filters identically for brand= (singular) and brands= (plural)', async () => {
    const singular = await request(app).get(`/api/products?brand=${encodeURIComponent(brandA)}`);
    const plural = await request(app).get(`/api/products?brands=${encodeURIComponent(brandA)}`);

    expect(singular.status).toBe(200);
    expect(plural.status).toBe(200);
    expect(Number(singular.headers['x-total-count'])).toBe(1);
    expect(Number(plural.headers['x-total-count'])).toBe(1);
    expect(singular.body).toHaveLength(1);
    expect(singular.body[0].brand).toBe(brandA);
    expect(singular.body[0].title).toContain(`${stamp}`);
  });

  it('comma-separated brand= lists exactly the named brands', async () => {
    const res = await request(app).get(
      `/api/products?brand=${encodeURIComponent(`${brandA},${brandB}`)}`,
    );
    expect(res.status).toBe(200);
    expect(Number(res.headers['x-total-count'])).toBe(2);
    expect(new Set(res.body.map((p: { brand: string }) => p.brand))).toEqual(
      new Set([brandA, brandB]),
    );
  });

  it('never falls back to the unfiltered catalogue for an unknown brand', async () => {
    const res = await request(app).get('/api/products?brand=NO-SUCH-BRAND-XYZ');
    expect(res.status).toBe(200);
    expect(Number(res.headers['x-total-count'])).toBe(0);
    expect(res.body).toHaveLength(0);
  });
});
