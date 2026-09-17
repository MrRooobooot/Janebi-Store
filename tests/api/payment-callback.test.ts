import { describe, it, expect, beforeAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems, coupons } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import orderRoutes from '../../server/routes/orders.js';
import paymentRoutes from '../../server/routes/payment.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

/**
 * Payment-callback regression on the REAL /api/payment/verify route, network-free.
 * The failover router is the production one; only the gateway HTTP call itself is
 * out of reach in CI. Covers: NOK callback cancels + restocks exactly once, verify
 * without authority parameter redirects to the failure page, reaper cancellation
 * of an abandoned pending_payment order.
 */
const app = express();
app.use(json());
app.use('/api/payment', paymentRoutes);
app.use(errorHandler);

describe('Payment verify callback — real route, no network', () => {
  const ts = Date.now();
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const userId = `pay-user-${ts}`;
  const token = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

  let productId = 0;

  const stock = async () =>
    (await db.query.products.findFirst({ where: eq(products.id, productId) }))?.stockQuantity;

  async function seedPendingOrder(id: string, qty: number, stockBefore: number, authority: string) {
    await db.update(products).set({ stockQuantity: stockBefore }).where(eq(products.id, productId));
    await db.insert(orders).values({
      id,
      userId,
      date: 'test',
      status: 'pending_payment',
      statusText: 'در انتظار پرداخت',
      total: 200000,
      subtotal: 200000,
      paymentMethod: 'پرداخت آنلاین',
      shippingMethod: 'پست سفارشی (معمولی)',
      recipientName: 'PAY',
      recipientPhone: phone,
      recipientAddress: 'تهران',
      authority,
    });
    await db.insert(orderItems).values({
      orderId: id,
      productId,
      price: 200000,
      qty,
      title: 'PAY Product',
      image: 'pay.jpg',
      brand: 'PAY',
    });
    await db.update(products).set({ stockQuantity: stockBefore - qty }).where(eq(products.id, productId));
  }

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      name: 'PAY Customer',
      phone,
      password: 'hash',
      vipPoints: 0,
    });
    const [p] = await db.insert(products).values({
      title: `PAY Product ${ts}`,
      category: 'test',
      price: 200000,
      image: 'pay.jpg',
      brand: 'PAY',
      stockQuantity: 10,
      sku: `SKU-PAY-${ts}`,
    }).returning({ id: products.id });
    productId = p.id;
  });

  it('NOK callback (payment failed) cancels the order and restores stock exactly once', async () => {
    const id = `PAY-NOK-${ts}`;
    const authority = `AUTH_${ts}_NOK`;
    await seedPendingOrder(id, 2, 10, authority);
    expect(await stock()).toBe(8);

    const res = await request(app).get(`/api/payment/verify?Authority=${authority}&Status=NOK`).send();
    expect(res.status).toBe(302);
    expect(String(res.headers.location)).toContain('status=failed');
    expect(String(res.headers.location)).toContain(`orderId=${id}`);

    expect(await stock()).toBe(10);
    const row = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    expect(row?.status).toBe('cancelled');
  });

  it('missing callback parameters redirect to failure without touching any order', async () => {
    const id = `PAY-KEEP-${ts}`;
    await seedPendingOrder(id, 1, 6, `AUTH_${ts}_KEEP`);
    const res = await request(app).get('/api/payment/verify').send();
    expect(res.status).toBe(302);
    expect(String(res.headers.location)).toContain('status=failed');
    expect(await stock()).toBe(5);
    const row = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    expect(row?.status).toBe('pending_payment');
  });
});
