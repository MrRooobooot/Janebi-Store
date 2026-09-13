import { describe, it, expect, beforeAll } from 'vitest';
import request from '../setup/request.js';
import express from 'express';
import { json } from 'express';
import { db } from '../../server/db/index.js';
import { users, coupons, products, orders, orderItems, reviews } from '../../server/db/schema.js';
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


// ---------------------------------------------------------
// Regression: admin mutations that must keep derived state honest
// (proven broken on sandbox 2026-09-13; ledger docs/UI-AUDIT-LOG.md §admin review)
// ---------------------------------------------------------
describe('Admin derived-state invariants: review delete, product delete, bulk-delete unwind', () => {
  const suffix = Date.now();
  const adminId = 'di-admin-' + suffix;
  const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  beforeAll(async () => {
    await db.insert(users).values({
      id: adminId, name: 'ادمین حالت مشتق', phone: '09' + Math.floor(1e8 + Math.random() * 9e8), password: 'hash', role: 'admin'
    });
  });

  async function seedProduct(stock = 50) {
    const [prod] = await db.insert(products).values({
      title: 'کالای تست مشتق',
      category: 'accessories',
      price: 100000,
      image: '/images/products/test-derived.jpg',
      brand: 'تست',
      stockQuantity: stock,
      sku: 'DI-SKU-' + suffix + '-' + Math.floor(Math.random() * 1e6),
    }).returning();
    return prod;
  }

  it('deleting an approved review recomputes the product rating/count', async () => {
    const prod = await seedProduct();
    const five = 'di-rev5-' + suffix;
    const one = 'di-rev1-' + suffix;
    await db.insert(reviews).values([
      { id: five, productId: prod.id, userId: adminId, userName: 'کاربر الف', rating: 5, title: 'خوب', comment: 'خوب بود', date: '1405/06/20' },
      { id: one, productId: prod.id, userId: adminId, userName: 'کاربر ب', rating: 1, title: 'بد', comment: 'بد بود', date: '1405/06/20' },
    ]);

    for (const id of [five, one]) {
      const res = await request(app)
        .put(`/api/admin/reviews/${id}/approved`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true });
      expect(res.status).toBe(200);
    }
    let row = await db.query.products.findFirst({ where: eq(products.id, prod.id) });
    expect(row?.rating).toBe(3);
    expect(row?.reviewsCount).toBe(2);

    const del = await request(app)
      .delete(`/api/admin/reviews/${one}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    row = await db.query.products.findFirst({ where: eq(products.id, prod.id) });
    // the deleted review must not keep counting toward the storefront aggregate
    expect(row?.rating).toBe(5);
    expect(row?.reviewsCount).toBe(1);
  });

  it('refuses to hard-delete a product that appears in an order (409, no FK crash)', async () => {
    const prod = await seedProduct();
    const orderId = 'ORD-DI-' + suffix;
    await db.insert(orders).values({
      id: orderId, userId: adminId, date: '1405/06/20', status: 'processing', statusText: 'در حال پردازش',
      total: 100000, subtotal: 100000, shippingFee: 0, discountAmount: 0,
      paymentMethod: 'پرداخت در محل', shippingMethod: 'پست پیشتاز',
      recipientName: 'تست', recipientPhone: '09120000000', recipientAddress: 'تهران',
      vipPointsUsed: 0, vipPointsEarned: 0, createdAt: new Date().toISOString(),
    });
    await db.insert(orderItems).values({
      orderId, productId: prod.id, price: 100000, qty: 1, title: 'کالای تست مشتق', image: '/x.jpg', brand: 'تست',
    });

    const res = await request(app)
      .delete(`/api/admin/products/${prod.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRODUCT_IN_ORDERS');
    const still = await db.query.products.findFirst({ where: eq(products.id, prod.id) });
    expect(still?.id).toBe(prod.id);
  });

  it('bulk-deleting an active order restocks its items (parity with single cancel)', async () => {
    const prod = await seedProduct(50);
    const orderId = 'ORD-DIB-' + suffix;
    await db.insert(orders).values({
      id: orderId, userId: adminId, date: '1405/06/20', status: 'processing', statusText: 'در حال پردازش',
      total: 200000, subtotal: 200000, shippingFee: 0, discountAmount: 0,
      paymentMethod: 'پرداخت در محل', shippingMethod: 'پست پیشتاز',
      recipientName: 'تست', recipientPhone: '09120000000', recipientAddress: 'تهران',
      vipPointsUsed: 0, vipPointsEarned: 0, createdAt: new Date().toISOString(),
    });
    await db.insert(orderItems).values({
      orderId, productId: prod.id, price: 100000, qty: 2, title: 'کالای تست مشتق', image: '/x.jpg', brand: 'تست',
    });

    const res = await request(app)
      .post('/api/admin/orders/bulk-delete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [orderId] });

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
    const row = await db.query.products.findFirst({ where: eq(products.id, prod.id) });
    expect(row?.stockQuantity).toBe(52); // 50 + qty 2 — a plain DELETE used to lose this
    const gone = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    expect(gone).toBeUndefined();
  });
});


// ---------------------------------------------------------
// R1/R2: owner-account protection + admin list pagination
// ---------------------------------------------------------
describe('Admin owner protection + list pagination', () => {
  const suffix = Date.now();
  const ownerId = 'own-owner-' + suffix;
  const otherAdminId = 'own-admin-' + suffix;
  const otherAdminToken = jwt.sign({ userId: otherAdminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const ownerToken = jwt.sign({ userId: ownerId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  beforeAll(async () => {
    // joinedDate is set so these fixtures sort to the TOP of the paged admin list
    // (the shared test DB accumulates thousands of legacy NULL-joined rows).
    await db.insert(users).values([
      { id: ownerId, name: 'مالک فروشگاه', phone: '09' + Math.floor(1e8 + Math.random() * 9e8), password: 'hash', role: 'admin', joinedDate: new Date().toISOString() },
      { id: otherAdminId, name: 'ادمین دیگر', phone: '09' + Math.floor(1e8 + Math.random() * 9e8), password: 'hash', role: 'admin', joinedDate: new Date().toISOString() },
    ]);
    process.env.OWNER_USER_ID = ownerId;
  });

  it('rejects role / password / points mutations on the owner account (403 OWNER_PROTECTED)', async () => {
    const role = await request(app)
      .put(`/api/admin/users/${ownerId}/role`)
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({ role: 'user' });
    expect(role.status).toBe(403);
    expect(role.body.code).toBe('OWNER_PROTECTED');

    const pw = await request(app)
      .put(`/api/admin/users/${ownerId}/password`)
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({ newPassword: 'hijacked123' });
    expect(pw.status).toBe(403);

    const pts = await request(app)
      .put(`/api/admin/users/${ownerId}/points`)
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({ vipPoints: 999 });
    expect(pts.status).toBe(403);

    const row = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
    expect(row?.role).toBe('admin');
    expect(row?.vipPoints).not.toBe(999);
  });

  // Walk every page: the shared test DB carries ~2k legacy rows and joined_date is
  // heterogeneous (Persian display text + ISO), so a single page's membership is
  // not a reliable oracle — the whole result set is.
  async function allUserIds(token: string): Promise<string[]> {
    const ids: string[] = [];
    for (let page = 1; page <= 8; page++) {
      const res = await request(app)
        .get(`/api/admin/users?page=${page}&limit=500`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const rows: { id: string }[] = res.body;
      ids.push(...rows.map((u) => u.id));
      if (rows.length < 500) break;
    }
    return ids;
  }

  it('hides the owner row from other admins but shows it to the owner', async () => {
    const asOther = await allUserIds(otherAdminToken);
    expect(asOther).not.toContain(ownerId);
    expect(asOther).toContain(otherAdminId);

    const asOwner = await allUserIds(ownerToken);
    expect(asOwner).toContain(ownerId);
  });

  it('paginates admin lists and reports X-Total-Count', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=1')
      .set('Authorization', `Bearer ${otherAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(Number(res.headers['x-total-count'])).toBeGreaterThan(0);

    // junk params must not crash and must fall back to the capped default
    const junk = await request(app)
      .get('/api/admin/users?page=abc&limit=-5')
      .set('Authorization', `Bearer ${otherAdminToken}`);
    expect(junk.status).toBe(200);
    expect(Array.isArray(junk.body)).toBe(true);
  });

  // A cloaked viewer must not be able to tell (via the count header or a short
  // page) that a hidden account exists: the filter has to run in SQL, before the
  // LIMIT/OFFSET slice and before the count.
  it('keeps X-Total-Count and page sizes honest under owner cloaking', async () => {
    const asOther = await request(app)
      .get('/api/admin/users?page=1&limit=500')
      .set('Authorization', `Bearer ${otherAdminToken}`);
    const enumerated = await allUserIds(otherAdminToken);
    expect(asOther.body.length).toBe(Math.min(500, enumerated.length));
    expect(Number(asOther.headers['x-total-count'])).toBe(enumerated.length);

    const asOwner = await request(app)
      .get('/api/admin/users?page=1&limit=500')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(Number(asOwner.headers['x-total-count'])).toBe(enumerated.length + 1);
  });
});

// R3 — the admin user list must be chronological. joined_date holds Persian *display*
// text, so ordering on it puts «۱۴۰۵/۱۲/۲۹» before «۱۴۰۵/۱/۱»; created_at (epoch ms)
// is the chronology, and rows without it sort oldest instead of masquerading as newest.
describe('Admin users list chronology (R3)', () => {
  const suffix = 'r3-' + Date.now();
  const base = Date.now() - 3600_000;
  const adminId = 'r3-admin-' + suffix;
  const newestId = 'r3-newest-' + suffix;
  const middleId = 'r3-middle-' + suffix;
  const oldestId = 'r3-oldest-' + suffix;
  const legacyId = 'r3-legacy-' + suffix;
  const adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const phone = () => '09' + Math.floor(1e8 + Math.random() * 9e8);
  const today = new Intl.DateTimeFormat('fa-IR').format(new Date());

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminId, name: 'ادمین ترتیب', phone: phone(), password: 'hash', role: 'admin', joinedDate: today },
      // display dates deliberately scrambled against real chronology
      { id: newestId, name: 'تازه', phone: phone(), password: 'hash', role: 'user', createdAt: base + 3000, joinedDate: '۱۴۰۴/۱/۱' },
      { id: middleId, name: 'میانه', phone: phone(), password: 'hash', role: 'user', createdAt: base + 2000, joinedDate: '۱۴۰۵/۹/۹' },
      { id: oldestId, name: 'قدیمی', phone: phone(), password: 'hash', role: 'user', createdAt: base + 1000, joinedDate: '۱۴۰۵/۱۲/۲۹' },
      // legacy row: no created_at, and a display date that would sort FIRST under the old query
      { id: legacyId, name: 'بازمانده', phone: phone(), password: 'hash', role: 'user', joinedDate: '۱۴۰۵/۱۲/۲۹' },
    ]);
  });

  it('orders newest-first by created_at even when joined_date text disagrees', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids: string[] = res.body.map((u: { id: string }) => u.id);
    const at = (id: string) => ids.indexOf(id);
    expect(at(newestId)).toBeLessThan(at(middleId));
    expect(at(middleId)).toBeLessThan(at(oldestId));
    // unresolved chronology must not be presented as the most recent account
    expect(at(legacyId)).toBeGreaterThan(at(oldestId));
  });

  it('fills created_at from the epoch embedded in generated ids and exposes it to the panel', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    const row = res.body.find((u: { id: string }) => u.id === newestId);
    expect(row.createdAt).toBe(base + 3000);
  });
});
