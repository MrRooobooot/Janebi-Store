import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import { db } from '../../server/db/index.js';
import { contactMessages, newsletterSubscribers } from '../../server/db/schema.js';
import { eq, like } from 'drizzle-orm';
import contactRoutes from '../../server/routes/contact.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';

/**
 * Regression tests: the public contact form must persist messages so they
 * surface in the admin Messages page, and the footer newsletter signup
 * (POST /api/contact/newsletter) must actually store subscribers.
 */

const app = express();
app.use(json());
app.use('/api/contact', contactRoutes);
app.use(errorHandler);

describe('Contact & Newsletter persistence (admin-visible)', () => {
  const marker = Date.now();

  afterAll(async () => {
    await db.delete(contactMessages).where(like(contactMessages.email, `e2e-${marker}-%`));
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, `e2e-${marker}@test.ir`));
  });

  it('persists a contact message with status unread', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({
        name: 'E2E Tester',
        email: `e2e-${marker}@test.ir`,
        phone: '09121234567',
        subject: 'Launch readiness',
        message: 'This message must appear in the admin panel.',
      });
    expect(res.status).toBe(200);

    const stored = await db.query.contactMessages.findFirst({
      where: eq(contactMessages.email, `e2e-${marker}@test.ir`),
    });
    expect(stored).toBeDefined();
    expect(stored?.status).toBe('unread');
    expect(stored?.message).toContain('must appear in the admin panel');
  });

  it('rejects a contact message missing required fields', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'X', email: `e2e-${marker}-bad@test.ir` });
    expect(res.status).toBe(400);
  });

  it('stores newsletter subscribers (footer flow) and is idempotent', async () => {
    const email = `e2e-${marker}@test.ir`;
    const first = await request(app).post('/api/contact/newsletter').send({ email });
    expect(first.status).toBe(200);

    const second = await request(app).post('/api/contact/newsletter').send({ email: email.toUpperCase() });
    expect(second.status).toBe(200);

    const rows = await db.query.newsletterSubscribers.findMany({
      where: eq(newsletterSubscribers.email, email),
    });
    expect(rows.length).toBe(1);
  });

  it('rejects invalid newsletter emails', async () => {
    const res = await request(app)
      .post('/api/contact/newsletter')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
