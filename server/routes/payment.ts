import { Router } from 'express';
import { db } from '../db/index.js';
import { orders, orderItems, products, users } from '../db/schema.js';
import { eq, sql, and, or, isNull, like, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { env } from '../env.js';
import { paymentRouter } from '../services/payment/PaymentFailoverRouter.js';
import { restockItemsAndRefundPoints } from '../lib/orderLifecycle.js';
import { storeEvents } from '../services/events.js';

const router = Router();

// F1 one-session-per-order lock. A claim token lives in `orders.authority` while
// the gateway call is in flight; the prefix makes it impossible to confuse with a
// real gateway authority (Zarinpal uses A…/DUMMY_AUTH_, Saman encodes SEP_).
const CLAIM_PREFIX = 'PENDING:';
const CLAIM_TTL_MS = 60_000; // older than this ⇒ the claiming process died
const CLAIM_WAIT_MS = 10_000; // duplicate request waits this long for the winner
const CLAIM_POLL_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Customer-facing payment link, on our own origin. Zarinpal renders StartPay only
// for a Referer from a registered merchant domain; a pasted / history / in-app
// entry carries none («دسترسی از این دامنه مجاز نمی باشد»), so `/pay/<authority>`
// (server/app.ts) hands the browser off from here and the gateway hop always has one.
// Only a real StartPay URL is rerouted — the dev/test self-verify shortcut
// (`/api/payment/verify?…`) and legacy rows must stay navigable as stored.
// `orders.paymentUrl` keeps the raw gateway URL; this is presentation only.
export const payLinkFor = (paymentUrl: string, authority: string) =>
  paymentUrl.startsWith('https://') && paymentUrl.includes('/pg/StartPay/')
    ? `${env.APP_URL}/pay/${authority}`
    : paymentUrl;

// Payment-session lifetime. The gateway forgets an unused authority after
// roughly 45–50 minutes (measured on live authorities), so the window is
// anchored on the last **Pay click** — `payment_requested_at`, written in the
// same statement that stores the authority — never on the order's creation:
// an order may sit pending for hours before anyone clicks Pay and that must
// not kill the order or its session.
export const PAYMENT_SESSION_TTL_MS = 45 * 60 * 1000;

router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id as string;
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Use configured APP_URL or fallback safely to trusted forwarded headers
    const baseUrl = env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
    const callbackUrl = `${baseUrl.replace(/\/+$/, "")}/api/payment/verify`;
    const deadline = Date.now() + CLAIM_WAIT_MS;
    let claimToken = '';
    let orderTotal = 0;
    let orderMobile = '';

    // R1-01 kept and extended (F1): only pending_payment orders may reach a
    // gateway, AND at most one live gateway session may ever exist per order.
    // The order row is the lock — a claim token is written into `authority` by a
    // conditional UPDATE before the gateway call, so a second (or concurrent)
    // request loses the race with 0 rows updated instead of minting a rival
    // authority. The customer paying the first authority can then always be
    // matched back to this order by the callback.
    for (;;) {
      const orderList = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (orderList.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderList[0];

      // Verify order ownership
      if (order.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized to pay for this order' });
      }

      if (order.status !== 'pending_payment') {
        return res.status(400).json({ error: 'این سفارش در وضعیت قابل پرداخت نیست' });
      }

      // A live session is already issued → return it unchanged. Re-minting here
      // is exactly what orphaned the first payment (pay A, callback looks up B).
      // "Live" means the session is still inside its window: past it the gateway
      // has dropped the authority, so this click must mint a fresh one instead of
      // handing the customer a dead link («شناسه پرداخت ... منقضی گردیده است»).
      if (order.authority && !order.authority.startsWith(CLAIM_PREFIX)) {
        const sessionAgeMs = order.paymentRequestedAt
          ? Date.now() - Date.parse(order.paymentRequestedAt)
          : Infinity;
        const expired = !(sessionAgeMs < PAYMENT_SESSION_TTL_MS);

        if (order.paymentUrl && !expired) {
          return res.status(200).json({
            url: payLinkFor(order.paymentUrl, order.authority),
            provider: order.paymentProvider || 'zarinpal',
            reused: true
          });
        }

        // Expired authority, or a session stored before `payment_url` existed:
        // clear it so the loop below claims and mints a fresh authority. Guarded
        // on the exact authority we just read, so a concurrent verify/reaper that
        // moved the order on is never overwritten — in that case stop instead of
        // looping (the customer re-reads a different state next click).
        const cleared = await db.update(orders)
          .set({ authority: null, paymentAmount: null, paymentProvider: null, paymentUrl: null, paymentRequestedAt: null })
          .where(and(
            eq(orders.id, orderId),
            eq(orders.status, 'pending_payment'),
            eq(orders.authority, order.authority)
          ))
          .returning({ id: orders.id });

        if (cleared.length === 0) {
          return res.status(409).json({
            error: 'وضعیت این سفارش هم‌زمان تغییر کرد. لطفاً صفحه را دوباره باز کنید.'
          });
        }
        continue;
      }

      claimToken = `${CLAIM_PREFIX}${randomUUID()}`;
      const staleBefore = new Date(Date.now() - CLAIM_TTL_MS).toISOString();
      const claimed = await db.update(orders)
        .set({ authority: claimToken, paymentRequestedAt: new Date().toISOString() })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.status, 'pending_payment'),
          or(
            isNull(orders.authority),
            and(like(orders.authority, `${CLAIM_PREFIX}%`), lt(orders.paymentRequestedAt, staleBefore))
          )
        ))
        .returning({ id: orders.id });

      if (claimed.length > 0) {
        orderTotal = order.total;
        orderMobile = order.recipientPhone || req.user.phone;
        break;
      }

      // Lost the race to a live claim: wait for the winner to publish its session,
      // then reuse it. Only a genuinely stuck claim (beyond the deadline) fails.
      if (Date.now() >= deadline) {
        return res.status(409).json({
          error: 'درخواست پرداخت دیگری برای این سفارش در جریان است. لطفاً چند لحظه بعد دوباره تلاش کنید.'
        });
      }
      await sleep(CLAIM_POLL_MS);
    }

    const paymentRequest = await paymentRouter.requestPaymentWithFailover({
      orderId,
      amountTomans: orderTotal,
      callbackUrl,
      description: `پرداخت سفارش ${orderId} - جانبی آرنا`,
      mobile: orderMobile,
      idempotencyKey: req.headers['idempotency-key'] as string
    });

    if (paymentRequest.success && paymentRequest.authority) {
      // F1/F3: persist the whole session in ONE conditional write. The claim
      // token must still be ours and the order still payable — otherwise the
      // reaper or a concurrent verify already took the order and this session
      // must not be handed to the customer.
      const stored = await db.update(orders)
        .set({
          authority: paymentRequest.authority,
          paymentAmount: orderTotal,
          paymentProvider: paymentRequest.provider,
          paymentUrl: paymentRequest.paymentUrl,
          paymentRequestedAt: new Date().toISOString()
        })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.status, 'pending_payment'),
          eq(orders.authority, claimToken)
        ))
        .returning({ id: orders.id });

      if (stored.length === 0) {
        console.warn(`[payment] order ${orderId} left pending_payment during the request — issued session discarded`);
        return res.status(409).json({ error: 'این سفارش دیگر قابل پرداخت نیست' });
      }

      return res.status(200).json({
        url: payLinkFor(paymentRequest.paymentUrl, paymentRequest.authority),
        provider: paymentRequest.provider
      });
    }

    // Gateway unreachable → release the claim so a retry can claim again.
    await db.update(orders)
      .set({ authority: null, paymentAmount: null, paymentProvider: null, paymentUrl: null, paymentRequestedAt: null })
      .where(and(eq(orders.id, orderId), eq(orders.authority, claimToken)));

    return res.status(503).json({
      error: paymentRequest.error || 'خطا در برقراری ارتباط با درگاه‌های پرداخت'
    });

  } catch (error) {
    console.error('Payment request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const authority = req.query.Authority as string;
    const status = req.query.Status as string;

    if (!authority || !status) {
      return res.redirect('/checkout/callback?status=failed&message=' + encodeURIComponent('پارامترهای بازگشتی تراکنش ناقص است'));
    }

    const orderList = await db.select().from(orders).where(eq(orders.authority, authority)).limit(1);
    if (orderList.length === 0) {
      return res.redirect('/checkout/callback?status=failed&message=' + encodeURIComponent('سفارش موردنظر یافت نشد'));
    }

    const order = orderList[0];
    
    // Idempotency check: if order is already processed, don't process again
    if (order.status !== 'pending_payment') {
      if (order.status === 'cancelled') {
        return res.redirect(`/checkout/callback?status=failed&orderId=${order.id}`);
      }
      return res.redirect(`/checkout/callback?status=success&orderId=${order.id}&ref_id=${order.refId || ''}`);
    }

    // Cancels the order, restocks items, and refunds any VIP points that were
    // spent at checkout so a failed payment never leaves the user out of pocket.
    // The status flip comes FIRST and is conditional: a concurrent successful
    // verify (which flips the same way) must win outright and can never be
    // followed by a restock of its items.
    const restockOrder = async (tx: any, orderId: string) => {
      // Read first: the flip below zeroes vip_points_used, and the refund needs
      // the amount that was actually spent at checkout.
      const failedOrderList = await tx.select().from(orders).where(eq(orders.id, orderId));
      const failedOrder = failedOrderList[0];
      const cancelledRows = await tx.update(orders)
        .set({ status: 'cancelled', statusText: 'لغو شده (پرداخت ناموفق)', vipPointsUsed: 0 })
        .where(and(eq(orders.id, orderId), eq(orders.status, 'pending_payment'), isNull(orders.refId)))
        .returning({ id: orders.id });
      if (!cancelledRows || cancelledRows.length === 0) return;
      await restockItemsAndRefundPoints(tx, orderId, failedOrder?.userId, failedOrder?.vipPointsUsed);
    };

    // A session the gateway (or our own TTL) has already dropped must not kill
    // the order: clear the dead session and keep the order payable, so the next
    // Pay click mints a fresh authority instead of forcing a new order.
    // Only positive evidence counts — a row carrying no `payment_requested_at`
    // (pre-migration, or a forged callback) keeps the old cancel path.
    const sessionAgeMs = order.paymentRequestedAt
      ? Date.now() - Date.parse(order.paymentRequestedAt)
      : null;
    const sessionExpired = sessionAgeMs !== null && sessionAgeMs >= PAYMENT_SESSION_TTL_MS;

    const invalidateSession = async () => {
      await db.update(orders)
        .set({ authority: null, paymentAmount: null, paymentProvider: null, paymentUrl: null, paymentRequestedAt: null })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'pending_payment'), isNull(orders.refId)));
    };

    // Zarinpal -54 = «authority نامعتبر»: the gateway has no such session, so the
    // order keeps its money path open. -51 (payment not found) is deliberately NOT
    // here — it is also what a plain cancelled attempt returns on a live session,
    // and that case stays a real failure (cancel + restock, pinned by phase1 tests).
    const expiredCodes = new Set(['-54']);

    const redirectExpired = () =>
      res.redirect(
        `/checkout/callback?status=expired&orderId=${order.id}&message=` +
          encodeURIComponent('نشست پرداخت قبلی منقضی شد؛ می‌توانید همین سفارش را دوباره پرداخت کنید')
      );

  // Shared success path: idempotency-guarded transition to `processing` +
  // VIP points earned by the order (single source of truth for both the
  // sandbox dummy path and the real verified-payment path).
  // The order row is written BEFORE any gateway is picked, so the payment label can
// only be finalised once a gateway has settled the payment — hardcoding «زرین‌پال»
// there lied whenever the failover router used سامان.
const ONLINE_LABEL: Record<string, string> = {
  zarinpal: 'پرداخت آنلاین زرین‌پال',
  saman: 'پرداخت آنلاین سامان',
  dummy: 'پرداخت آنلاین (آزمایشی)'
};

const markOrderPaid = async (tx: any, orderId: string, refId: string, provider: string = 'zarinpal'): Promise<boolean> => {
    // R1-02: atomic predicate — the read-then-write pattern was TOCTOU-racy.
    // The status flip only lands if the row is still pending_payment; the
    // .returning() row count is the arbiter (0 rows => another transaction
    // already won, e.g. a concurrent verify or the reaper).
    const updatedRows = await tx.update(orders)
      .set({
        status: 'processing',
        statusText: 'در حال پردازش (پرداخت موفق)',
        refId: refId,
        paymentMethod: ONLINE_LABEL[provider] || 'پرداخت آنلاین'
      })
      .where(and(
        eq(orders.id, orderId),
        eq(orders.status, 'pending_payment')
      ))
      .returning({ id: orders.id });
    if (!updatedRows || updatedRows.length === 0) return false;
    if (order.vipPointsEarned && order.vipPointsEarned > 0 && order.userId) {
      await tx.update(users).set({ vipPoints: sql`${users.vipPoints} + ${order.vipPointsEarned}` }).where(eq(users.id, order.userId));
    }
    return true;
  };

  const emitOrderPaid = async (orderId: string) => {
    try {
      const oList = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      const o = oList[0];
      if (!o) return;
      const oItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      storeEvents.emit('order:paid', {
        orderId: o.id,
        total: o.total,
        recipientName: o.recipientName,
        recipientPhone: o.recipientPhone,
        recipientAddress: o.recipientAddress,
        paymentMethod: o.paymentMethod,
        items: oItems.map((i) => ({ title: i.title, qty: i.qty, price: i.price })),
      });
    } catch (err) {
      console.error('[payment] Error emitting order:paid:', err);
    }
  };

    if (status !== 'OK') {
      // Expired session → the order stays payable (a fresh Pay click re-mints).
      // A genuine decline on a live session keeps the old behaviour: cancel + restock.
      if (sessionExpired) {
        await invalidateSession();
        return redirectExpired();
      }

      await db.transaction(async (tx) => {
        const currentOrderList = await tx.select().from(orders).where(eq(orders.id, order.id));
        const currentOrder = currentOrderList[0];
        if (!currentOrder || currentOrder.status !== 'pending_payment') return;
        await restockOrder(tx, order.id);
      });
      
      return res.redirect(`/checkout/callback?status=failed&orderId=${order.id}`);
    }

    // Dummy merchant / test authority handling for testing & failover simulation (Non-production sandbox only)
    if (
      env.NODE_ENV !== "production" &&
      (authority.startsWith('DUMMY_AUTH_') || authority.startsWith('ZP_DEV_') || authority.startsWith('SEP_DEV_'))
    ) {
      const dummyRefId = `REF-${Math.floor(Math.random() * 1000000)}`;
      const flipped = await db.transaction(async (tx) => {
        return await markOrderPaid(tx, order.id, dummyRefId, 'dummy');
      });
      // Only a real status flip may emit: a concurrent callback that lost the
      // pending_payment race must not send a second receipt SMS / bot alert.
      if (flipped) emitOrderPaid(order.id);
      
      return res.redirect(`/checkout/callback?status=success&orderId=${order.id}&ref_id=${dummyRefId}`);
    }

    // Verify transaction through PaymentFailoverRouter.
    // R3-07: route by authority prefix ONLY — req.query.provider is
    // attacker-controlled and must never pick the gateway.
    //
    // F3: verify the amount that was actually requested. `orders.total` is
    // mutable (admin edit) and must never be the number a callback is checked
    // against — the payment request freezes it in `payment_amount`.
    const requestedAmount = order.paymentAmount ?? order.total;
    if (order.paymentAmount != null && order.paymentAmount !== order.total) {
      console.warn(
        `[payment] reconcile: order ${order.id} total changed after the payment request — requested=${order.paymentAmount} current=${order.total}`
      );
    }

    const verifyResult = await paymentRouter.verifyPayment({
      authority,
      status,
      amountTomans: requestedAmount,
      orderId: order.id
    });

    if (verifyResult.success) {
      const refId = verifyResult.refId || `REF-${Math.floor(Math.random() * 1000000)}`;
      
      const flipped = await db.transaction(async (tx) => {
        return await markOrderPaid(tx, order.id, refId, verifyResult.provider);
      });
      // Idempotent emit: the loser of a concurrent-verify race must stay silent.
      if (flipped) emitOrderPaid(order.id);

      return res.redirect(`/checkout/callback?status=success&orderId=${order.id}&ref_id=${refId}`);
    } else {
      console.error('Payment Verification Error:', verifyResult);

      // The gateway does not know this authority (or our window already closed):
      // the session is dead, not the order — clear it and stay payable.
      if (sessionExpired || expiredCodes.has(String(verifyResult.code))) {
        await invalidateSession();
        return redirectExpired();
      }

      await db.transaction(async (tx) => {
        const currentOrderList = await tx.select().from(orders).where(eq(orders.id, order.id));
        const currentOrder = currentOrderList[0];
        if (!currentOrder || currentOrder.status !== 'pending_payment') return;
        await restockOrder(tx, order.id);
      });

      return res.redirect(`/checkout/callback?status=failed&orderId=${order.id}&error=${encodeURIComponent(verifyResult.error || 'تراکنش ناموفق بود')}`);
    }

  } catch (error) {
    console.error('Payment verify error:', error);
    res.redirect('/checkout/callback?status=failed&message=' + encodeURIComponent('خطای داخلی در تأیید پرداخت'));
  }
});

// Reaper: release stock from orders nobody is going to pay for.
//
// Two independent windows, and an order's creation time NEVER bounds its
// payment session:
//   • session window  — 45min from the last Pay click (`payment_requested_at`),
//     the moment a fresh gateway authority was minted;
//   • checkout window — 24h for an order that never reached a gateway at all
//     (`payment_requested_at` still NULL), i.e. an abandoned cart that would
//     otherwise hold stock forever.
//
// Both paths flip the status conditionally FIRST and restock only on a won flip,
// on the same predicate a real verify flips on — so a payment that lands while
// the reaper runs either wins the row (reaper backs off, no restock) or finds a
// cancelled order (verify refuses to settle it). A paid order is untouchable:
// the predicate requires status='pending_payment' AND ref_id IS NULL.
const ABANDONED_CHECKOUT_MS = 24 * 60 * 60 * 1000;

export const reapAbandonedOrders = async (now: number = Date.now()): Promise<string[]> => {
  const candidates = await db
    .select({ id: orders.id, createdAt: orders.createdAt, paymentRequestedAt: orders.paymentRequestedAt })
    .from(orders)
    .where(and(eq(orders.status, 'pending_payment'), isNull(orders.refId)));

  const isStale = (row: (typeof candidates)[number]) => {
    if (row.paymentRequestedAt) {
      return now - Date.parse(row.paymentRequestedAt) >= PAYMENT_SESSION_TTL_MS;
    }
    // Legacy rows may lack created_at (column added 2026-08-31); ORD ids embed
    // base36 creation time.
    const createdMs = row.createdAt
      ? Date.parse(row.createdAt)
      : parseInt(String(row.id).replace('ORD-', ''), 36);
    return Number.isFinite(createdMs) && now - createdMs >= ABANDONED_CHECKOUT_MS;
  };

  const cancelled: string[] = [];
  for (const row of candidates) {
    if (!isStale(row)) continue;
    await db.transaction(async (tx: any) => {
      // Read before flipping: the flip zeroes vip_points_used.
      const current = (await tx.select().from(orders).where(eq(orders.id, row.id)))[0];
      const won = await tx.update(orders)
        .set({ status: 'cancelled', statusText: 'لغو شده (انصراف از پرداخت)', vipPointsUsed: 0 })
        .where(and(eq(orders.id, row.id), eq(orders.status, 'pending_payment'), isNull(orders.refId)))
        .returning({ id: orders.id });
      if (!won || won.length === 0) return; // a verify/reaper got there first
      await restockItemsAndRefundPoints(tx, row.id, current?.userId, current?.vipPointsUsed);
    });
    cancelled.push(row.id);
  }
  return cancelled;
};

setInterval(async () => {
  try {
    for (const id of await reapAbandonedOrders()) {
      console.log(`[payment-reaper] cancelled abandoned order ${id}`);
    }
  } catch (err) {
    console.error('[payment-reaper] error:', err);
  }
}, 5 * 60 * 1000).unref();

export default router;
