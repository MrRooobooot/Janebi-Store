import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import paymentRoutes, { reapAbandonedOrders, PAYMENT_SESSION_TTL_MS } from '../../server/routes/payment.js';
import { env } from '../../server/env.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(json());
app.use('/api/payment', paymentRoutes);

const MIN = 60 * 1000;
const TTL = PAYMENT_SESSION_TTL_MS;

describe('payment session TTL (anchored on payment_requested_at)', () => {
  const userId = 'ttl-user-' + Date.now();
  const token = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  let productId: number;

  const mkOrder = async (
    suffix: string,
    fields: Partial<typeof orders.$inferInsert> = {},
    withItem = false,
  ) => {
    const id = `ORD-TTL-${suffix}`;
    await db.insert(orders).values({
      id,
      userId,
      date: '1404/01/01',
      status: 'pending_payment',
      statusText: 'در انتظار پرداخت',
      total: 150000,
      subtotal: 150000,
      shippingFee: 0,
      discountAmount: 0,
      paymentMethod: 'پرداخت آنلاین',
      shippingMethod: 'پست پیشتاز',
      recipientName: 'TTL User',
      recipientPhone: '09120000000',
      recipientAddress: 'Tehran',
      recipientPostalCode: '11111',
      ...fields,
    });
    if (withItem) {
      await db.insert(orderItems).values({
        orderId: id,
        productId,
        price: 150000,
        qty: 1,
        title: 'TTL Product',
        image: 't.jpg',
        brand: 'B',
      });
      await db
        .update(products)
        .set({ stockQuantity: 0 })
        .where(eq(products.id, productId));
    }
    return id;
  };

  const row = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0];
  const stock = async () => (await db.select().from(products).where(eq(products.id, productId)))[0].stockQuantity;

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, name: 'TTL User', phone: '09120000001', password: 'hash' });
    const p = await db
      .insert(products)
      .values({ title: 'TTL Product', category: 'test', price: 150000, image: 't.jpg', brand: 'B', stockQuantity: 0 })
      .returning({ id: products.id });
    productId = p[0].id;
  });

  afterAll(async () => {
    await db.delete(orderItems).where(eq(orderItems.productId, productId));
    await db.delete(orders).where(eq(orders.userId, userId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it('does not cancel an old order whose payment session was just started', async () => {
    const now = Date.now();
    // Created 4h ago — under the old createdAt anchor this was reaped at 60min
    // and the customer lost the order while its fresh session was still live.
    const id = await mkOrder('OLD-CREATED', {
      createdAt: new Date(now - 4 * 60 * MIN).toISOString(),
      paymentRequestedAt: new Date(now - 1 * MIN).toISOString(),
      authority: 'A000000000000000000000000000fresh1',
      paymentUrl: 'https://www.zarinpal.com/pg/StartPay/A000000000000000000000000000fresh1',
      paymentProvider: 'zarinpal',
      paymentAmount: 150000,
    });

    const reaped = await reapAbandonedOrders(now);
    expect(reaped).not.toContain(id);
    expect((await row(id)).status).toBe('pending_payment');
  });

  it('reaps on the 45min payment_requested_at window, not on createdAt', async () => {
    const now = Date.now();
    const live = await mkOrder('LIVE-44MIN', {
      createdAt: new Date(now - 5 * 60 * MIN).toISOString(),
      paymentRequestedAt: new Date(now - (TTL - MIN)).toISOString(),
      authority: 'A000000000000000000000000000live44',
      paymentUrl: 'https://www.zarinpal.com/pg/StartPay/A000000000000000000000000000live44',
    });
    const dead = await mkOrder(
      'DEAD-46MIN',
      {
        createdAt: new Date(now - 5 * 60 * MIN).toISOString(),
        paymentRequestedAt: new Date(now - (TTL + MIN)).toISOString(),
        authority: 'A000000000000000000000000000dead46',
        paymentUrl: 'https://www.zarinpal.com/pg/StartPay/A000000000000000000000000000dead46',
      },
      true,
    );

    const reaped = await reapAbandonedOrders(now);
    expect(reaped).not.toContain(live);
    expect((await row(live)).status).toBe('pending_payment');
    expect(reaped).toContain(dead);
    expect((await row(dead)).status).toBe('cancelled');
    expect(await stock()).toBe(1); // restocked exactly once
  });

  it('leaves an order that never reached a gateway alone for 24h (checkout window)', async () => {
    const now = Date.now();
    const fresh = await mkOrder('NO-CLICK-1H', { createdAt: new Date(now - 60 * MIN).toISOString() });
    const abandoned = await mkOrder('NO-CLICK-30H', { createdAt: new Date(now - 30 * 60 * MIN).toISOString() });

    const reaped = await reapAbandonedOrders(now);
    expect(reaped).not.toContain(fresh);
    expect((await row(fresh)).status).toBe('pending_payment');
    expect(reaped).toContain(abandoned);
    expect((await row(abandoned)).status).toBe('cancelled');
  });

  it('never reaps an order that was paid', async () => {
    const now = Date.now();
    const paid = await mkOrder('PAID', {
      status: 'processing',
      statusText: 'در حال پردازش (پرداخت موفق)',
      refId: 'REF-TTL-PAID-1',
      createdAt: new Date(now - 30 * 60 * MIN).toISOString(),
      paymentRequestedAt: new Date(now - 3 * 60 * MIN).toISOString(),
      authority: 'A000000000000000000000000000paid01',
    });
    // Defensive: a row that carries a refId is untouchable even if its status
    // still says pending_payment (mid-callback).
    const paidMidFlight = await mkOrder('PAID-PENDING', {
      status: 'pending_payment',
      refId: 'REF-TTL-PAID-2',
      paymentRequestedAt: new Date(now - 3 * 60 * MIN).toISOString(),
    });

    const reaped = await reapAbandonedOrders(now);
    expect(reaped).not.toContain(paid);
    expect(reaped).not.toContain(paidMidFlight);
    expect((await row(paid)).status).toBe('processing');
    expect((await row(paid)).refId).toBe('REF-TTL-PAID-1');
    expect((await row(paidMidFlight)).refId).toBe('REF-TTL-PAID-2');
  });

  it('refunds VIP points spent at checkout when it reaps an abandoned order', async () => {
    const now = Date.now();
    const id = await mkOrder('REAP-VIP', {
      paymentRequestedAt: new Date(now - (TTL + MIN)).toISOString(),
      authority: 'A000000000000000000000000000vipref1',
      vipPointsUsed: 1500,
    });
    const pointsBefore = (await db.select().from(users).where(eq(users.id, userId)))[0].vipPoints ?? 0;

    expect(await reapAbandonedOrders(now)).toContain(id);
    const after = await db.select().from(users).where(eq(users.id, userId));
    expect(after[0].vipPoints).toBe(pointsBefore + 1500);
    expect((await row(id)).vipPointsUsed).toBe(0);
  });

  it('does not double-restock or double-refund on a replayed reaper pass', async () => {
    const now = Date.now();
    const id = await mkOrder(
      'REAP-REPLAY',
      {
        paymentRequestedAt: new Date(now - (TTL + MIN)).toISOString(),
        authority: 'A000000000000000000000000000repla1',
        vipPointsUsed: 700,
      },
      true,
    );
    const pointsAfterFirstSweep = async () => (await db.select().from(users).where(eq(users.id, userId)))[0].vipPoints ?? 0;

    expect(await reapAbandonedOrders(now)).toContain(id);
    const stockAfter = await stock();
    const pointsAfter = await pointsAfterFirstSweep();

    expect(await reapAbandonedOrders(now)).not.toContain(id); // already cancelled
    expect(await stock()).toBe(stockAfter);
    expect(await pointsAfterFirstSweep()).toBe(pointsAfter);
  });

  it('reuses a session that is still inside its window', async () => {
    const id = await mkOrder('REUSE', {
      createdAt: new Date(Date.now() - 6 * 60 * MIN).toISOString(),
      paymentRequestedAt: new Date(Date.now() - 2 * MIN).toISOString(),
      authority: 'A000000000000000000000000000reuse01',
      paymentUrl: 'https://www.zarinpal.com/pg/StartPay/A000000000000000000000000000reuse01',
      paymentProvider: 'zarinpal',
      paymentAmount: 150000,
    });

    const res = await request(app).post('/api/payment/request').set('Authorization', `Bearer ${token}`).send({ orderId: id });
    expect(res.status).toBe(200);
    expect(res.body.reused).toBe(true);
    expect(res.body.url).toBe(`${env.APP_URL}/pay/A000000000000000000000000000reuse01`);
    expect((await row(id)).authority).toBe('A000000000000000000000000000reuse01');
  });

  it('replaces an expired authority with a fresh one on the next Pay click', async () => {
    const stale = 'A000000000000000000000000000expird';
    const id = await mkOrder('EXPIRED-RETRY', {
      createdAt: new Date(Date.now() - 6 * 60 * MIN).toISOString(),
      paymentRequestedAt: new Date(Date.now() - (TTL + 2 * MIN)).toISOString(),
      authority: stale,
      paymentUrl: `https://www.zarinpal.com/pg/StartPay/${stale}`,
      paymentProvider: 'zarinpal',
      paymentAmount: 150000,
    });

    const res = await request(app).post('/api/payment/request').set('Authorization', `Bearer ${token}`).send({ orderId: id });
    expect(res.status).toBe(200);
    expect(res.body.reused).toBeUndefined();

    const after = await row(id);
    expect(after.status).toBe('pending_payment');
    expect(after.authority).toBeTruthy();
    expect(after.authority).not.toBe(stale);
    // payment_requested_at is re-anchored atomically with the new authority.
    expect(Date.now() - Date.parse(after.paymentRequestedAt as string)).toBeLessThan(10_000);
    expect(after.paymentAmount).toBe(150000);
  });

  it('keeps the order payable when the callback reports the session expired', async () => {
    const stale = 'A000000000000000000000000000expird2';
    const id = await mkOrder('CALLBACK-EXPIRED', {
      paymentRequestedAt: new Date(Date.now() - (TTL + 5 * MIN)).toISOString(),
      authority: stale,
      paymentUrl: `https://www.zarinpal.com/pg/StartPay/${stale}`,
      paymentAmount: 150000,
    });

    const res = await request(app).get(`/api/payment/verify?Authority=${stale}&Status=NOK`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=expired');
    const after = await row(id);
    expect(after.status).toBe('pending_payment'); // retryable, not cancelled
    expect(after.authority).toBeNull(); // dead session cleared
    expect(after.paymentRequestedAt).toBeNull();
  });

  it('still cancels a declined payment on a live session', async () => {
    const auth = 'A000000000000000000000000000declin1';
    const id = await mkOrder('CALLBACK-DECLINED', {
      paymentRequestedAt: new Date(Date.now() - 3 * MIN).toISOString(),
      authority: auth,
      paymentUrl: `https://www.zarinpal.com/pg/StartPay/${auth}`,
      paymentAmount: 150000,
    });

    const res = await request(app).get(`/api/payment/verify?Authority=${auth}&Status=NOK`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=failed');
    expect((await row(id)).status).toBe('cancelled');
  });
});
