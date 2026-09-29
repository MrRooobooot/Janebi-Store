/**
 * Phase-1 money-path hardening — regression suite for F1 and F3.
 *
 * F1 (High): a second POST /api/payment/request on an order that already holds a
 *   gateway authority overwrote `orders.authority`. The first StartPay session
 *   then became unreachable: the customer pays authority A, the callback looks up
 *   by the *stored* authority B, finds no order, and the money is captured while
 *   the order stays `pending_payment` with `refId = null`.
 *
 * F3 (Medium/conditional): /api/payment/verify sent `orders.total` — read at
 *   callback time — as the gateway verify amount instead of the amount that was
 *   actually requested. A total mutated between request and callback would be
 *   verified against the wrong (mutable) number.
 *
 * Network-free: the real routes and the real failover router run; only the
 * gateway HTTP calls (adapter methods / global fetch) are stubbed.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from '../setup/request.js';
import express, { json } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db/index.js';
import { products, users, orders, orderItems } from '../../server/db/schema.js';
import paymentRoutes from '../../server/routes/payment.js';
import { errorHandler } from '../../server/middleware/errorHandler.js';
import { env } from '../../server/env.js';
import { ZarinpalAdapter } from '../../server/services/payment/ZarinpalAdapter.js';
import { SamanAdapter } from '../../server/services/payment/SamanAdapter.js';

const app = express();
app.use(json());
app.use('/api/payment', paymentRoutes);
app.use(errorHandler);

const origZarinpalRequest = ZarinpalAdapter.prototype.requestPayment;
const origSamanRequest = SamanAdapter.prototype.requestPayment;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stub the gateway HTTP call, recording the JSON bodies the server sent. */
function stubGatewayFetch(responder: (body: any) => any) {
  const sent: any[] = [];
  const impl = async (_url: string, init: { body: string }) => {
    sent.push(JSON.parse(init.body));
    return { ok: true, json: async () => responder(sent[sent.length - 1]) };
  };
  vi.stubGlobal('fetch', impl as unknown as typeof fetch);
  return sent;
}

describe('Phase-1 money-path hardening (F1 duplicate request, F3 amount immutability)', () => {
  const ts = Date.now();
  const userId = `phase1-user-${ts}`;
  const phone = '09' + Math.floor(100000000 + Math.random() * 900000000);
  const token = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  let productId = 0;
  let seq = 0;

  const orderRow = async (id: string) =>
    (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0];
  const stockOf = async () =>
    (await db.query.products.findFirst({ where: eq(products.id, productId) }))?.stockQuantity;

  /** Pending order with one order item; stock is decremented like checkout does. */
  async function seedOrder(total: number, opts: { status?: string; extra?: Record<string, unknown> } = {}) {
    const id = `ORD-P1-${ts}-${++seq}`;
    await db.insert(orders).values({
      id,
      userId,
      date: 'test',
      status: opts.status || 'pending_payment',
      statusText: 'در انتظار پرداخت',
      total,
      subtotal: total,
      shippingFee: 0,
      discountAmount: 0,
      paymentMethod: 'پرداخت آنلاین',
      shippingMethod: 'پست پیشتاز',
      recipientName: 'PHASE1',
      recipientPhone: phone,
      recipientAddress: 'تهران',
      ...(opts.extra || {}),
    });
    await db.insert(orderItems).values({
      orderId: id,
      productId,
      price: total,
      qty: 1,
      title: 'PHASE1 Product',
      image: 'p1.jpg',
      brand: 'P1',
    });
    return id;
  }

  const postRequest = (orderId: string) =>
    request(app).post('/api/payment/request').set('Authorization', `Bearer ${token}`).send({ orderId });

  const getVerify = (authority: string, status = 'OK') =>
    request(app).get(`/api/payment/verify?Authority=${encodeURIComponent(authority)}&Status=${status}`);

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, name: 'PHASE1', phone, password: 'hash' });
    const p = await db
      .insert(products)
      .values({
        title: 'PHASE1 Product',
        category: 'test',
        price: 100000,
        image: 'p1.jpg',
        brand: 'P1',
        stockQuantity: 1000,
      })
      .returning({ id: products.id });
    productId = p[0].id;
  });

  afterAll(async () => {
    await db.delete(orderItems).where(eq(orderItems.title, 'PHASE1 Product'));
    await db.delete(orders).where(eq(orders.userId, userId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(users).where(eq(users.id, userId));
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'test';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------- F1 ------

  it('F1: a second request for the same pending order must not orphan the first authority', async () => {
    const orderId = await seedOrder(250000);
    const gw = vi.spyOn(ZarinpalAdapter.prototype, 'requestPayment');

    const first = await postRequest(orderId);
    expect(first.status).toBe(200);
    const firstAuthority = (await orderRow(orderId)).authority;
    expect(firstAuthority).toBeTruthy();

    const second = await postRequest(orderId);
    expect(second.status).toBe(200);

    // Exactly one gateway session may ever exist for one pending payment.
    expect(gw).toHaveBeenCalledTimes(1);
    expect(second.body.url).toBe(first.body.url);
    expect((await orderRow(orderId)).authority).toBe(firstAuthority);

    // The customer paid the FIRST authority — its callback must still settle the order.
    const verify = await getVerify(firstAuthority!);
    expect(verify.status).toBe(302);
    expect(verify.header.location).toContain('status=success');
    const settled = await orderRow(orderId);
    expect(settled.status).toBe('processing');
    expect(settled.refId).toBeTruthy();
  });

  it('F1: concurrent duplicate requests mint exactly one authority', async () => {
    const orderId = await seedOrder(250000);
    vi.spyOn(ZarinpalAdapter.prototype, 'requestPayment').mockImplementation(async function (
      this: unknown,
      opts: never,
    ) {
      await sleep(30); // keep request #1 in flight while #2 arrives
      return origZarinpalRequest.call(this as never, opts);
    });

    const [a, b] = await Promise.all([postRequest(orderId), postRequest(orderId)]);
    const row = await orderRow(orderId);

    const ok = [a, b].filter((r) => r.status === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of ok) expect(r.body.url).toBe(row.paymentUrl);
    // no second session and no orphan: the stored authority is the only one issued
    expect(row.authority).toBeTruthy();
    expect(row.paymentUrl).toContain(row.authority!);

    const verify = await getVerify(row.authority!);
    expect(verify.header.location).toContain('status=success');
  });

  it('F1: a failed gateway attempt releases the claim so the customer can retry', async () => {
    const orderId = await seedOrder(250000);
    vi.spyOn(ZarinpalAdapter.prototype, 'requestPayment').mockRejectedValue(new Error('gateway timeout'));
    vi.spyOn(SamanAdapter.prototype, 'requestPayment').mockRejectedValue(new Error('samman timeout'));

    const failed = await postRequest(orderId);
    expect(failed.status).toBe(503);
    const after = await orderRow(orderId);
    expect(after.authority).toBeNull();
    expect(after.paymentAmount).toBeNull();

    vi.restoreAllMocks();
    const retry = await postRequest(orderId);
    expect(retry.status).toBe(200);
    expect(retry.body.url).toBeTruthy();
    const retried = await orderRow(orderId);
    expect(retried.authority).toBeTruthy();
    expect(retried.paymentUrl).toBe(retry.body.url);
  });

  it('F1: request persists the amount, provider, url and request time it issued', async () => {
    const orderId = await seedOrder(335000);
    const res = await postRequest(orderId);
    expect(res.status).toBe(200);
    const row = await orderRow(orderId);
    expect(row.total).toBe(335000);
    expect(row.paymentAmount).toBe(335000);
    expect(row.paymentProvider).toBe('zarinpal');
    expect(row.paymentUrl).toBe(res.body.url);
    expect(row.paymentRequestedAt).toBeTruthy();
  });

  it('F1: an already-paid/processing order is refused (no gateway call)', async () => {
    const orderId = await seedOrder(250000, { status: 'processing' });
    const gw = vi.spyOn(ZarinpalAdapter.prototype, 'requestPayment');
    const res = await postRequest(orderId);
    expect(res.status).toBe(400);
    expect(gw).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- F3 ------

  it('F3: verify sends the amount requested at payment time, not the total read at callback time', async () => {
    const orderId = await seedOrder(335000);
    vi.spyOn(ZarinpalAdapter.prototype, 'requestPayment').mockResolvedValue({
      success: true,
      authority: 'A0000000000000000000000000000000007',
      paymentUrl: 'https://www.zarinpal.com/pg/StartPay/A0000000000000000000000000000000007',
      provider: 'zarinpal',
    });

    const requested = await postRequest(orderId); // real request → real record of X
    expect(requested.status).toBe(200);

    // The order total is mutated between the payment request and the callback.
    await db.update(orders).set({ total: 435000 }).where(eq(orders.id, orderId));

    const sent = stubGatewayFetch(() => ({ data: { code: 100, ref_id: '99112233' } }));

    const res = await getVerify('A0000000000000000000000000000000007');
    expect(res.status).toBe(302);
    expect(sent).toHaveLength(1);
    expect(sent[0].amount).toBe(335000); // immutable request-time amount, NOT 435000
  });

  it('F3: verify of a stored request-time amount is immutable across callbacks', async () => {
    const orderId = await seedOrder(335000, {
      extra: {
        authority: 'A0000000000000000000000000000000001',
        paymentAmount: 335000,
        paymentProvider: 'zarinpal',
        paymentUrl: 'https://www.zarinpal.com/pg/StartPay/A0000000000000000000000000000000001',
        paymentRequestedAt: new Date().toISOString(),
      },
    });
    // Attacker/ops mutate the order total after the payment request was issued.
    await db.update(orders).set({ total: 435000 }).where(eq(orders.id, orderId));

    const sent = stubGatewayFetch(() => ({ data: { code: 100, ref_id: '99112233', card_pan: '6037****' } }));

    const res = await getVerify('A0000000000000000000000000000000001');
    expect(res.status).toBe(302);
    expect(sent).toHaveLength(1);
    expect(sent[0].amount).toBe(335000); // immutable request-time amount, NOT 435000
    expect(res.header.location).toContain('status=success');
    expect((await orderRow(orderId)).status).toBe('processing');
  });

  it('F3: a total changed after the payment request is logged as a reconciliation alert', async () => {
    const orderId = await seedOrder(335000, {
      extra: {
        authority: 'A0000000000000000000000000000000002',
        paymentAmount: 335000,
        paymentProvider: 'zarinpal',
        paymentRequestedAt: new Date().toISOString(),
      },
    });
    await db.update(orders).set({ total: 435000 }).where(eq(orders.id, orderId));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubGatewayFetch(() => ({ data: { code: 100, ref_id: '7' } }));

    await getVerify('A0000000000000000000000000000000002');
    expect(warn.mock.calls.some((c) => String(c[0]).includes('reconcile'))).toBe(true);
  });

  it('F3: unchanged total verifies against the request-time amount', async () => {
    const orderId = await seedOrder(150000, {
      extra: {
        authority: 'A0000000000000000000000000000000003',
        paymentAmount: 150000,
        paymentProvider: 'zarinpal',
        paymentRequestedAt: new Date().toISOString(),
      },
    });
    const sent = stubGatewayFetch(() => ({ data: { code: 100, ref_id: '5' } }));

    const res = await getVerify('A0000000000000000000000000000000003');
    expect(sent[0].amount).toBe(150000);
    expect(res.header.location).toContain('status=success');
  });

  it('F3: legacy row without a request-time amount falls back to order.total', async () => {
    const orderId = await seedOrder(200000, {
      extra: { authority: 'A0000000000000000000000000000000004' },
    });
    const sent = stubGatewayFetch(() => ({ data: { code: 100, ref_id: '6' } }));

    await getVerify('A0000000000000000000000000000000004');
    expect(sent[0].amount).toBe(200000);
    expect(await orderRow(orderId)).toBeTruthy();
  });

  it('F3: mismatched/failed verification cancels the order and restocks once', async () => {
    const orderId = await seedOrder(250000, {
      extra: {
        authority: 'A0000000000000000000000000000000005',
        paymentAmount: 250000,
        paymentProvider: 'zarinpal',
        paymentRequestedAt: new Date().toISOString(),
      },
    });
    const before = (await stockOf())!;
    stubGatewayFetch(() => ({ data: { code: -51 }, errors: { code: -51, message: 'amount mismatch' } }));

    const res = await getVerify('A0000000000000000000000000000000005');
    expect(res.status).toBe(302);
    expect(res.header.location).toContain('status=failed');
    const row = await orderRow(orderId);
    expect(row.status).toBe('cancelled');
    expect(row.refId).toBeNull();
    expect(await stockOf()).toBe(before + 1);

    // replay of the same failed callback must not restock a second time
    const again = await getVerify('A0000000000000000000000000000000005');
    expect(again.status).toBe(302);
    expect(again.header.location).toContain('status=failed');
    expect(await stockOf()).toBe(before + 1);
  });

  it('F3: a repeated callback after success does not re-verify against the gateway', async () => {
    const orderId = await seedOrder(120000, {
      extra: {
        authority: 'A0000000000000000000000000000000006',
        paymentAmount: 120000,
        paymentProvider: 'zarinpal',
        paymentRequestedAt: new Date().toISOString(),
      },
    });
    let calls = 0;
    stubGatewayFetch(() => {
      calls++;
      return { data: { code: 100, ref_id: '42' } };
    });

    const first = await getVerify('A0000000000000000000000000000000006');
    expect(first.header.location).toContain('status=success');
    const rowAfter = await orderRow(orderId);
    const replay = await getVerify('A0000000000000000000000000000000006');
    expect(replay.header.location).toContain('status=success');
    expect(replay.header.location).toContain(String(rowAfter.refId));
    expect(calls).toBe(1);
  });
});
