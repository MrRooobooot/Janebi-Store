import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import { app } from '../../server/app.js';
import jwt from 'jsonwebtoken';
import { db } from '../../server/db/index.js';
import { users, products, orders, orderItems } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../../server/env.js';

/**
 * Forensic fix regression: admin cancelling an order from the panel must
 * restock items and unwind VIP points exactly like user-initiated cancel.
 */

describe('Admin cancel — restock + VIP unwind parity', () => {
  const ts = Date.now();
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const userId = 'ac-user-' + ts;
  const adminId = 'ac-admin-' + ts;
  let adminToken: string;
  let productId: number;
  let orderId: string;

  beforeAll(async () => {
    await db.insert(users).values([
      {
        id: userId,
        name: 'AC Customer',
        phone,
        password: 'hash',
        role: 'user',
        vipPoints: 1000,
      },
      {
        id: adminId,
        name: 'AC Admin',
        phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
        password: 'hash',
        role: 'admin',
        vipPoints: 0,
      },
    ]);
    adminToken = jwt.sign({ userId: adminId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    const p = await db.insert(products).values({
      title: 'AC Product',
      category: 'test',
      price: 800000,
      image: 'ac.jpg',
      brand: 'AC',
      stockQuantity: 3,
    }).returning({ id: products.id });
    productId = p[0].id;

    // Simulate a COD processing order that used 500 pts and earned 8.
    orderId = `AC-${ts}`;
    await db.insert(orders).values({
      id: orderId,
      userId,
      date: 'test',
      status: 'processing',
      statusText: 'در حال پردازش',
      total: 1335000,
      subtotal: 800000,
      shippingFee: 35000,
      discountAmount: 500000,
      vipPointsUsed: 500,
      vipPointsEarned: 8,
      paymentMethod: 'پرداخت در محل',
      shippingMethod: 'پست سفارشی (معمولی)',
      recipientName: 'AC',
      recipientPhone: phone,
      recipientAddress: 'Tehran',
    });
    await db.insert(orderItems).values({
      orderId,
      productId,
      price: 800000,
      qty: 2,
      title: 'AC Product',
      image: 'ac.jpg',
      brand: 'AC',
    });
    await db.update(products).set({ stockQuantity: 1 }).where(eq(products.id, productId)); // 3-2
    await db.update(users).set({ vipPoints: 580 }).where(eq(users.id, userId)); // 1000-500+8... keep simple: set exact post-order balance
  });

  afterAll(async () => {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(users).where(eq(users.id, adminId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it('admin cancel restocks items and unwinds VIP points', async () => {
    const res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');

    // Stock restored: 1 + 2 = 3
    const p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(p?.stockQuantity).toBe(3);

    // Points unwound: refund used (+500), claw back earned (-8)
    // balance was set to 580 post-order; cancel → 580 + 500 - 8 = 1072
    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    expect(u?.vipPoints).toBe(1072);

    // Idempotent: second cancel does not double-restock
    const again = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });
    expect(again.status).toBe(200);
    const p2 = await db.query.products.findFirst({ where: eq(products.id, productId) });
    expect(p2?.stockQuantity).toBe(3);
  });

  it('rejects cancelling a shipped order', async () => {
    await db.update(orders).set({ status: 'shipped' }).where(eq(orders.id, orderId));
    const res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(400);
  });
});
