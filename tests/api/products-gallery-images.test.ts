import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { products, productImages, users } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Extra gallery photos: the cover stays in products.image, extras live in
// product_images; the public detail merges them (cover first, deduped) and the
// admin PUT replaces the whole set.
describe('Product gallery images', () => {
  const tag = `GAL${Date.now()}`;
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const adminId = `usr-test-gal-${Date.now()}`;
  let token = '';
  let productId = 0;

  beforeAll(async () => {
    await db.insert(users).values({
      id: adminId, name: 'ادمین گالری', phone,
      password: await bcrypt.hash('1234', 10), role: 'admin',
    });
    const login = await request(app).post('/api/auth/login').send({ phone, password: '1234' });
    token = login.body.accessToken;
    const [row] = await db.insert(products).values({
      title: `کالای گالری ${tag}`, category: 'هولدر و نگهدارنده', price: 1000000,
      image: '/images/products/cover.webp', brand: 'ارلدام', stockQuantity: 5, sku: `TST-GAL-${tag}`,
    }).returning();
    productId = row.id;
  });

  afterAll(async () => {
    await db.delete(productImages).where(eq(productImages.productId, productId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(users).where(eq(users.id, adminId));
  });

  it('single-photo product serves just the cover', async () => {
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.images).toEqual(['/images/products/cover.webp']);
  });

  it('admin PUT stores extras in order, deduping the cover', async () => {
    const put = await request(app)
      .put(`/api/admin/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ images: ['/images/products/b.webp', '/images/products/cover.webp', '/images/products/c.webp'] });
    expect(put.status).toBe(200);
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.body.images).toEqual([
      '/images/products/cover.webp', '/images/products/b.webp', '/images/products/c.webp',
    ]);
  });

  it('PUT with an empty array clears extras; omitting images leaves them alone', async () => {
    await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`)
      .send({ images: ['/images/products/b.webp'] });
    await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`)
      .send({ stockQuantity: 6 });
    let res = await request(app).get(`/api/products/${productId}`);
    expect(res.body.images).toHaveLength(2);
    await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`)
      .send({ images: [] });
    res = await request(app).get(`/api/products/${productId}`);
    expect(res.body.images).toEqual(['/images/products/cover.webp']);
  });

  it('rejects more than 8 extras', async () => {
    const many = Array.from({ length: 9 }, (_, i) => `/images/products/x${i}.webp`);
    const put = await request(app).put(`/api/admin/products/${productId}`)
      .set('Authorization', `Bearer ${token}`).send({ images: many });
    expect(put.status).toBe(400);
  });
});
