import { describe, it, expect, beforeAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import { db } from '../../server/db/index.js';
import { users, coupons } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import adminRoutes from '../../server/routes/admin.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';

const app = express();
app.use(json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

describe('Admin hardening: self-role guard, audit coverage, coupon edit', () => {
  const suffix = Date.now();
  const adminId = 'hl-admin-' + suffix;
  const targetId = 'hl-user-' + suffix;
  const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const targetToken = jwt.sign({ userId: targetId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const code = 'HL-TEST-' + suffix;

  beforeAll(async () => {
    await db.insert(users).values({
      id: adminId, name: 'ادمین لاگ', phone: '09' + Math.floor(1e8 + Math.random() * 9e8), password: 'hash', role: 'admin'
    });
    await db.insert(users).values({
      id: targetId, name: 'کاربر لاگ', phone: '09' + Math.floor(1e8 + Math.random() * 9e8), password: 'hash', role: 'user'
    });
  });

  it('blocks an admin from demoting their own account (self-lockout guard)', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' });
    expect(res.status).toBe(400);
    // role unchanged in db
    const row = await db.query.users.findFirst({ where: eq(users.id, adminId) });
    expect(row?.role).toBe('admin');
  });

  it('still allows changing another user role', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${targetId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
  });

  it('audit-logs the password reset (user.password.reset)', async () => {
    const { auditLogs } = await import('../../server/db/schema.js');
    const res = await request(app)
      .put(`/api/admin/users/${targetId}/password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'newpass123' });
    expect(res.status).toBe(200);
    // logAudit is fire-and-forget; allow the write to land
    await new Promise((r) => setTimeout(r, 150));
    const logs = await db.select().from(auditLogs);
    const found = logs.find((l) => l.action === 'user.password.reset' && l.entityId === targetId);
    expect(found).toBeDefined();
  });

  it('creates a coupon and rejects duplicate code with 409', async () => {
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code, percent: 15, minTotal: 100000, label: 'تست لاگ', active: true, usageLimit: 50 });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(code);

    const dup = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code, percent: 10, label: 'دوباره' });
    expect(dup.status).toBe(409);
  });

  it('edits a coupon via PUT /coupons/:code (amount, active, expiresAt, usageLimit)', async () => {
    const res = await request(app)
      .put(`/api/admin/coupons/${code}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false, usageLimit: 5, minTotal: 200000 });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
    expect(res.body.usageLimit).toBe(5);
    expect(res.body.minTotal).toBe(200000);
    expect(res.body.percent).toBe(15); // untouched field preserved
  });

  it('PUT returns 404 for unknown coupon and rejects percent+amount together', async () => {
    const nf = await request(app)
      .put('/api/admin/coupons/NOPE-404')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true });
    expect(nf.status).toBe(404);

    const bad = await request(app)
      .put(`/api/admin/coupons/${code}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ percent: 10, amount: 50000 });
    expect(bad.status).toBe(400);
  });

  it('audit-logs coupon.create and coupon.update', async () => {
    const { auditLogs } = await import('../../server/db/schema.js');
    await new Promise((r) => setTimeout(r, 150));
    const logs = await db.select().from(auditLogs);
    expect(logs.find((l) => l.action === 'coupon.create' && l.entityId === code)).toBeDefined();
    expect(logs.find((l) => l.action === 'coupon.update' && l.entityId === code)).toBeDefined();
  });

  it('cleans up test coupon', async () => {
    await db.delete(coupons).where(eq(coupons.code, code));
  });
});
