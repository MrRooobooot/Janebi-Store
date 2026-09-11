import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app.js';
import { db } from '../../server/db/index.js';
import { users, coupons, blogPosts } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';
import fs from 'fs';
import path from 'path';

/**
 * Round8 QA coverage: admin upload (R4-01), coupons-active (R4-02), blog API (R4-03).
 * Isolated inserts with unique codes/ids; every inserted row is deleted in afterAll.
 */
describe('Round8 QA coverage — upload / coupons-active / blog', () => {
  const stamp = Date.now();
  const adminId = `user-r8qa-${stamp}`;
  const adminPhone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const userToken = jwt.sign({ userId: `user-r8qa-plain-${stamp}` }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const activeCode = `R8QA-${stamp}`;
  const inactiveCode = `R8QA-OFF-${stamp}`;
  const postId = `post-r8qa-${stamp}`;

  beforeAll(async () => {
    // admin + plain user rows (auth middleware resolves the token against users)
    await db.insert(users).values([
      { id: adminId, name: 'ادمین راند ۸', phone: adminPhone, password: 'hash', role: 'admin' },
      { id: `user-r8qa-plain-${stamp}`, name: 'کاربر ساده', phone: '09' + Math.floor(100000000 + Math.random() * 900000000), password: 'hash' },
    ]);
    await db.insert(coupons).values([
      { code: activeCode, percent: 10, minTotal: 0, label: 'راند ۸ فعال', active: true },
      { code: inactiveCode, percent: 99, minTotal: 0, label: 'راند ۸ غیرفعال', active: false },
    ]);
    await db.insert(blogPosts).values({
      id: postId,
      title: 'مقاله تستی راند ۸',
      excerpt: 'خلاصه تستی',
      body: 'پاراگراف اول\n\nپاراگراف دوم',
      published: true,
      createdAt: new Date().toISOString(),
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, adminId));
    await db.delete(users).where(eq(users.id, `user-r8qa-plain-${stamp}`));
    await db.delete(coupons).where(eq(coupons.code, activeCode));
    await db.delete(coupons).where(eq(coupons.code, inactiveCode));
    await db.delete(blogPosts).where(eq(blogPosts.id, postId));
  });

  // ---------------- R4-01: admin upload ----------------
  describe('POST /api/admin/upload/product-image', () => {
    // 1×1 PNG (67 bytes) — passes multer mimetype + server magic-byte checks.
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
      'hex'
    );

    it('401 unauthenticated', async () => {
      const res = await request(app).post('/api/admin/upload/product-image');
      expect(res.status).toBe(401);
    });

    it('403 non-admin token', async () => {
      const res = await request(app)
        .post('/api/admin/upload/product-image')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('image', png, { filename: 't.png', contentType: 'image/png' });
      expect(res.status).toBe(403);
    });

    it('400 when admin sends no file', async () => {
      const res = await request(app)
        .post('/api/admin/upload/product-image')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([400, 500]).toContain(res.status);
      if (res.status === 500) throw new Error('no-file case crashed instead of 4xx');
    });

    it('200 for a real PNG; file exists under public/images/products; cleaned up', async () => {
      const res = await request(app)
        .post('/api/admin/upload/product-image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', png, { filename: 't.png', contentType: 'image/png' });
      expect([200, 201]).toContain(res.status); // supertest reports 201 for created uploads
      expect(res.body.url).toMatch(/^\/images\/products\//);
      const onDisk = path.join(process.cwd(), 'public', res.body.url.replace(/^\//, ''));
      expect(fs.existsSync(onDisk)).toBe(true);
      fs.rmSync(onDisk, { force: true }); // CLEAN UP the created file
    });
  });

  // ---------------- R4-02: coupons-active ----------------
  describe('GET /api/coupons-active', () => {
    it('200 + array shape + only active coupons exposed', async () => {
      const res = await request(app).get('/api/coupons-active');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const codes = res.body.map((c: { code: string }) => c.code);
      expect(codes).toContain(activeCode);
      expect(codes).not.toContain(inactiveCode); // inactive coupon MUST NOT appear
      for (const c of res.body) {
        expect(c).toHaveProperty('code');
        expect(c).not.toHaveProperty('usedCount'); // internal usage data never leaks
        expect(c).not.toHaveProperty('usageLimit');
      }
    });
  });

  // ---------------- R4-03: blog API ----------------
  describe('GET /api/blog', () => {
    it('200 + array containing the seeded published post', async () => {
      const res = await request(app).get('/api/blog');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((p: { id: string }) => p.id);
      expect(ids).toContain(postId);
    });

    it('only published posts are public', async () => {
      const [draft] = await db
        .insert(blogPosts)
        .values({
          id: `${postId}-draft`,
          title: 'پیش‌نویس تستی',
          excerpt: 'خلاصه',
          body: 'متن',
          published: false,
          createdAt: new Date().toISOString(),
        })
        .returning();
      const res = await request(app).get('/api/blog');
      const ids = res.body.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(draft.id);
      await db.delete(blogPosts).where(eq(blogPosts.id, draft.id));
    });
  });
});
