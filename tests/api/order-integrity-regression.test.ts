import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems, coupons } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import orderRoutes from '../../server/routes/orders.js';
import adminOrdersRoutes from '../../server/routes/admin/orders.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../../server/env.js';

/**
 * Order integrity regression — cancellation idempotency and the financial
 * invariants of the real POST /api/orders + POST /api/orders/:id/cancel
 * handlers on a real database. No mocked algorithms: the router, the auth
 * middleware, the transaction wrapper and SQLite are the production ones.
 */

const app = express();
app.use(json());
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

describe('Order integrity — cancellation idempotency & financial invariants', () => {
  const ts = Date.now();
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const userId = `oi-user-${ts}`;
  const otherUserId = `oi-other-${ts}`;
  const token = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const otherToken = jwt.sign({ userId: otherUserId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const adminToken = jwt.sign({ userId: `oi-admin-${ts}`, role: 'admin' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const couponCode = `OI${ts}`;

  let productId = 0;
  const createdOrderIds: string[] = [];

  const cancel = (orderId: string, t = token) =>
    request(app).post(`/api/orders/${orderId}/cancel`).set('Authorization', `Bearer ${t}`);

  const adminStatus = (orderId: string, body: Record<string, unknown>) => {
    const adminApp = express();
    adminApp.use(json());
    adminApp.use('/api/admin', adminOrdersRoutes);
    adminApp.use(errorHandler);
    return request(adminApp)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
  };

  const stock = async () => (await db.query.products.findFirst({ where: eq(products.id, productId) }))?.stockQuantity;
  const points = async (id = userId) => (await db.query.users.findFirst({ where: eq(users.id, id) }))?.vipPoints;
  const orderRow = async (id: string) => db.query.orders.findFirst({ where: eq(orders.id, id) });
  const couponUsed = async () => (await db.query.coupons.findFirst({ where: eq(coupons.code, couponCode) }))?.usedCount;

  /** Seed an order as if checkout had already run: stock decremented, order + item rows present. */
  async function seedOrder(opts: {
    id: string;
    qty: number;
    stockBefore: number;
    vipUsed?: number;
    vipEarned?: number;
    status?: string;
  }) {
    createdOrderIds.push(opts.id);
    await db.update(products).set({ stockQuantity: opts.stockBefore }).where(eq(products.id, productId));
    await db.insert(orders).values({
      id: opts.id,
      userId,
      date: 'test',
      status: opts.status ?? 'processing',
      statusText: 'در حال پردازش',
      total: 0,
      subtotal: 0,
      vipPointsUsed: opts.vipUsed ?? 0,
      vipPointsEarned: opts.vipEarned ?? 0,
      paymentMethod: 'پرداخت در محل',
      shippingMethod: 'پست سفارشی (معمولی)',
      recipientName: 'OI',
      recipientPhone: phone,
      recipientAddress: 'تهران',
    });
    await db.insert(orderItems).values({
      orderId: opts.id,
      productId,
      price: 100000,
      qty: opts.qty,
      title: 'OI Product',
      image: 'oi.jpg',
      brand: 'OI',
    });
    await db.update(products).set({ stockQuantity: opts.stockBefore - opts.qty }).where(eq(products.id, productId));
  }

  beforeAll(async () => {
    await db.insert(users).values([
      { id: userId, name: 'OI Customer', phone, password: 'hash', vipPoints: 0 },
      {
        id: otherUserId,
        name: 'OI Other',
        phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
        password: 'hash',
        vipPoints: 0,
      },
    ]);

    const [p] = await db.insert(products).values({
      title: `OI Product ${ts}`,
      category: 'test',
      price: 250000,
      image: 'oi.jpg',
      brand: 'OI',
      stockQuantity: 100,
      sku: `SKU-OI-${ts}`,
    }).returning({ id: products.id });
    productId = p.id;

    await db.insert(coupons).values({
      code: couponCode,
      percent: 10,
      minTotal: 1000,
      label: 'کد تست یکپارچگی',
      active: true,
      usageLimit: 5,
      usedCount: 0,
    });
  });

  afterAll(async () => {
    await db.delete(orderItems).where(eq(orderItems.productId, productId));
    await db.delete(orders).where(eq(orders.userId, userId));
    await db.delete(coupons).where(eq(coupons.code, couponCode));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, otherUserId));
  });

  it('concurrent double-cancel succeeds exactly once — stock and points are restocked once', async () => {
    const orderId = `OI-CONC-${ts}`;
    await db.update(users).set({ vipPoints: 200 }).where(eq(users.id, userId));
    await seedOrder({ id: orderId, qty: 2, stockBefore: 5, vipUsed: 200 });
    expect(await stock()).toBe(3);

    const [r1, r2] = await Promise.all([cancel(orderId), cancel(orderId)]);

    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 400]);

    // Exactly one restock of 2 units, exactly one refund of 200 points.
    expect(await stock()).toBe(5);
    expect(await points()).toBe(400);

    const row = await orderRow(orderId);
    expect(row?.status).toBe('cancelled');

    // Order items survive the cancel (history is not destroyed).
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
  });

  it('repeated cancellation is a complete no-op on stock, points and order status', async () => {
    const orderId = `OI-REPEAT-${ts}`;
    await db.update(users).set({ vipPoints: 300 }).where(eq(users.id, userId));
    await seedOrder({ id: orderId, qty: 3, stockBefore: 9, vipUsed: 300, vipEarned: 0 });

    const first = await cancel(orderId);
    expect(first.status).toBe(200);
    expect(await stock()).toBe(9);
    expect(await points()).toBe(600);

    const snapshot = {
      stock: await stock(),
      points: await points(),
      status: (await orderRow(orderId))?.status,
      total: (await orderRow(orderId))?.total,
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      const again = await cancel(orderId);
      expect(again.status).toBe(400);
      expect(again.body.message).toContain('امکان لغو');
    }

    expect({
      stock: await stock(),
      points: await points(),
      status: (await orderRow(orderId))?.status,
      total: (await orderRow(orderId))?.total,
    }).toEqual(snapshot);
  });

  it('claws back earned points only down to zero — the balance can never go negative', async () => {
    const orderId = `OI-CLAW-${ts}`;
    // Balance is already empty; the order still claims 50 earned points.
    await db.update(users).set({ vipPoints: 0 }).where(eq(users.id, userId));
    await seedOrder({ id: orderId, qty: 1, stockBefore: 4, vipUsed: 0, vipEarned: 50 });

    const res = await cancel(orderId);
    expect(res.status).toBe(200);
    expect(await points()).toBe(0);
    expect(await stock()).toBe(4);
  });

  it('rejects cancelling a shipped order and mutates nothing', async () => {
    const orderId = `OI-SHIPPED-${ts}`;
    await db.update(users).set({ vipPoints: 150 }).where(eq(users.id, userId));
    await seedOrder({ id: orderId, qty: 2, stockBefore: 7, vipUsed: 150, status: 'shipped' });
    const stockBefore = await stock();

    const res = await cancel(orderId);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('امکان لغو');

    expect(await stock()).toBe(stockBefore);
    expect(await points()).toBe(150);
    expect((await orderRow(orderId))?.status).toBe('shipped');
  });

  it('rejects cancelling another user\'s order with 403 and mutates nothing', async () => {
    const orderId = `OI-FOREIGN-${ts}`;
    await db.update(users).set({ vipPoints: 120 }).where(eq(users.id, userId));
    await seedOrder({ id: orderId, qty: 1, stockBefore: 6, vipUsed: 120 });
    const stockBefore = await stock();

    const res = await cancel(orderId, otherToken);
    expect(res.status).toBe(403);

    expect(await stock()).toBe(stockBefore);
    expect(await points()).toBe(120);
    expect((await orderRow(orderId))?.status).toBe('processing');
  });

  it('order → cancel round trip keeps the financial identity and never refunds a coupon redemption', async () => {
    await db.update(users).set({ vipPoints: 50 }).where(eq(users.id, userId));
    await db.update(products).set({ stockQuantity: 10 }).where(eq(products.id, productId));

    // price 250,000 × 2 = 500,000 subtotal; 10% coupon = 50,000;
    // 50 VIP points = 50,000; standard shipping 35,000 → 435,000.
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ id: productId, quantity: 2 }],
        recipient: { name: 'OI', phone, address: 'تهران' },
        couponCode,
        useVipPoints: true,
        paymentMethod: 'online',
        shippingMethod: 'standard',
      });

    expect(created.status).toBe(201);
    const orderId = created.body.order.id as string;
    createdOrderIds.push(orderId);

    const placed = await orderRow(orderId);
    expect(placed).toBeDefined();
    expect(placed!.subtotal).toBe(500000);
    expect(placed!.shippingFee).toBe(35000);
    expect(placed!.vipPointsUsed).toBe(50);
    // total = subtotal + shipping − discount, and discount = coupon + VIP redemption.
    expect(placed!.total).toBe(placed!.subtotal + (placed!.shippingFee ?? 0) - (placed!.discountAmount ?? 0));
    expect(placed!.total).toBe(435000);
    expect(placed!.discountAmount).toBe((placed!.vipPointsUsed ?? 0) * 1000 + 50000);
    expect(placed!.total).toBeGreaterThanOrEqual(0);

    // Checkout side effects: stock down 2, points spent, coupon consumed once.
    expect(await stock()).toBe(8);
    expect(await points()).toBe(0);
    expect(await couponUsed()).toBe(1);

    const cancelled = await cancel(orderId);
    expect(cancelled.status).toBe(200);

    // Cancel unwinds stock and the spent points, but the financial record and
    // the consumed coupon redemption are immutable.
    expect(await stock()).toBe(10);
    expect(await points()).toBe(50);
    expect(await couponUsed()).toBe(1);

    const after = await orderRow(orderId);
    expect(after?.status).toBe('cancelled');
    expect(after?.total).toBe(placed!.total);
    expect(after?.subtotal).toBe(placed!.subtotal);
    expect(after?.discountAmount).toBe(placed!.discountAmount);
  });

  /**
   * The single end-to-end financial regression: real checkout route, real
   * SQLite, real seeded product/coupon/user, hardcoded expected totals.
   *
   * Inputs:  product price 250,000 × qty 2, coupon OI<ts> = 10% (minTotal 1,000),
   *          useVipPoints with a 50-point balance, shippingMethod "standard"
   *          (subtotal 500,000 < 2,000,000 free-shipping threshold),
   *          paymentMethod "online".
   * Expected: subtotal 500,000 | coupon discount 50,000 | VIP redemption 50,000
   *           (50 pts × 1,000) | discountAmount 100,000 | shippingFee 35,000
   *           | total 435,000 | vipPointsEarned 4 | status pending_payment
   *           | stock 8 | VIP balance 0 | coupon usedCount 1.
   */
  it('real checkout route persists the exact expected financial totals (hardcoded)', async () => {
    await db.update(users).set({ vipPoints: 50 }).where(eq(users.id, userId));
    await db.update(products).set({ stockQuantity: 10 }).where(eq(products.id, productId));
    await db.update(coupons).set({ usedCount: 0 }).where(eq(coupons.code, couponCode));

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ id: productId, quantity: 2 }],
        recipient: { name: 'OI Totals', phone, address: 'تهران، خیابان آزادی' },
        couponCode,
        useVipPoints: true,
        paymentMethod: 'online',
        shippingMethod: 'standard',
      });

    expect(res.status).toBe(201);
    const orderId = res.body.order.id as string;
    createdOrderIds.push(orderId);

    // Response contract — every figure hardcoded, no derived arithmetic.
    expect(res.body.order.subtotal).toBe(500000);
    expect(res.body.order.shippingFee).toBe(35000);
    expect(res.body.order.discountAmount).toBe(100000);
    expect(res.body.order.total).toBe(435000);
    expect(res.body.order.vipPointsUsed).toBe(50);
    expect(res.body.order.vipPointsEarned).toBe(4);
    expect(res.body.order.status).toBe('pending_payment');
    expect(res.body.order.statusText).toBe('در انتظار پرداخت');

    // Persisted row must match the response exactly.
    const persisted = await orderRow(orderId);
    expect(persisted).toBeDefined();
    expect(persisted!.subtotal).toBe(500000);
    expect(persisted!.shippingFee).toBe(35000);
    expect(persisted!.discountAmount).toBe(100000);
    expect(persisted!.total).toBe(435000);
    expect(persisted!.vipPointsUsed).toBe(50);
    expect(persisted!.vipPointsEarned).toBe(4);
    expect(persisted!.status).toBe('pending_payment');

    // Persisted line item carries the catalogue price, not a client-sent one.
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    expect(items).toHaveLength(1);
    expect(items[0].price).toBe(250000);
    expect(items[0].qty).toBe(2);

    // Side effects: stock 10 − 2, VIP 50 − 50, coupon consumed once.
    expect(await stock()).toBe(8);
    expect(await points()).toBe(0);
    expect(await couponUsed()).toBe(1);
  });

  it('admin status transition persists the exact requested status (covers the E2E :694-696 visibility-only gap)', async () => {
    const orderId = `OI-ADMIN-${ts}`;
    await db.update(users).set({ vipPoints: 0 }).where(eq(users.id, userId));
    await seedOrder({ id: orderId, qty: 1, stockBefore: 5 });

    const res = await adminStatus(orderId, { status: 'processing', statusText: 'در حال پردازش' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processing');
    expect(res.body.statusText).toBe('در حال پردازش');
    // The value that matters is the persisted one, not just a 2xx response.
    expect((await orderRow(orderId))?.status).toBe('processing');

    // Transition guard: shipped orders can no longer be cancelled.
    const toShipped = await adminStatus(orderId, { status: 'shipped', statusText: 'ارسال شده' });
    expect(toShipped.status).toBe(200);
    const reject = await adminStatus(orderId, { status: 'cancelled', statusText: 'لغو شده' });
    expect(reject.status).toBe(400);
    expect(reject.body.message).toContain('قابل لغو');
    expect((await orderRow(orderId))?.status).toBe('shipped');
    expect(await stock()).toBe(4); // 5 − 1 seeded; no phantom restock from the rejected cancel
  });
});
