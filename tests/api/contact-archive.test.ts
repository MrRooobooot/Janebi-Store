import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import { db } from '../../server/db/index.js';
import { users, contactMessages } from '../../server/db/schema.js';
import adminRoutes from '../../server/routes/admin.js';
import { eq, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';

const app = express();
app.use(json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

// Contact-messages archive policy (audit §3.12): API-level verification of the
// strict status validation and the ?status= filter on GET /contact-messages.
describe('Contact messages archive policy (API)', () => {
  const adminId = 'test-admin-arch-' + Date.now();
  const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });
  const msgIds = { old: '', unread: '' };

  beforeAll(async () => {
    await db.insert(users).values({
      id: adminId,
      name: 'مدیر بایگانی',
      phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
      password: 'hash',
      role: 'admin'
    });

    msgIds.old = `msg-arch-old-${Date.now()}`;
    msgIds.unread = `msg-arch-unread-${Date.now()}`;
    const suffix = Math.random().toString(36).slice(2, 6);
    await db.insert(contactMessages).values([
      {
        id: msgIds.old,
        name: 'کاربر قدیمی',
        email: `old-${suffix}@example.com`,
        subject: 'پیام قدیمی',
        message: 'این پیام برای بایگانی است',
        status: 'read',
        createdAt: '2020-01-01T00:00:00.000Z'
      },
      {
        id: msgIds.unread,
        name: 'کاربر تازه',
        email: `new-${suffix}@example.com`,
        subject: 'پیام تازه',
        message: 'این پیام تازه است',
        status: 'unread',
        createdAt: new Date().toISOString()
      }
    ]);
  });

  afterAll(async () => {
    await db.delete(contactMessages).where(inArray(contactMessages.id, [msgIds.old, msgIds.unread]));
    await db.delete(users).where(eq(users.id, adminId));
  });

  it('PUT :id/status accepts archived as a valid status', async () => {
    const res = await request(app)
      .put(`/api/admin/contact-messages/${msgIds.unread}/status`)
      .set(auth())
      .send({ status: 'archived' });
    expect(res.status).toBe(200);
  });

  it('PUT :id/status rejects forged statuses with 400', async () => {
    for (const bad of ['deleted', 'ARCHIVED', '__proto__', 123, undefined]) {
      const res = await request(app)
        .put(`/api/admin/contact-messages/${msgIds.old}/status`)
        .set(auth())
        .send({ status: bad });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid status');
    }
  });

  it('GET default hides archived messages', async () => {
    const res = await request(app)
      .get('/api/admin/contact-messages')
      .set(auth());
    expect(res.status).toBe(200);
    const archived = (res.body as { id: string }[]).filter((m) => m.id === msgIds.unread);
    expect(archived).toHaveLength(0);
  });

  it('GET ?status=archived returns only archived rows', async () => {
    const res = await request(app)
      .get('/api/admin/contact-messages?status=archived')
      .set(auth());
    expect(res.status).toBe(200);
    const list = res.body as { id: string; status: string }[];
    expect(list.every((m) => m.status === 'archived')).toBe(true);
    expect(list.some((m) => m.id === msgIds.unread)).toBe(true);
  });

  it('GET ?status=all includes archived rows', async () => {
    const res = await request(app)
      .get('/api/admin/contact-messages?status=all')
      .set(auth());
    expect(res.status).toBe(200);
    const list = res.body as { id: string }[];
    expect(list.some((m) => m.id === msgIds.unread)).toBe(true);
    expect(list.some((m) => m.id === msgIds.old)).toBe(true);
  });

  it('GET rejects invalid status filters with 400', async () => {
    const res = await request(app)
      .get('/api/admin/contact-messages?status=bogus')
      .set(auth());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid status filter');
  });
});
