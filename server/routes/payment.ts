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

      // A real session is already issued → return it unchanged. Re-minting here
      // is exactly what orphaned the first payment (pay A, callback looks up B).
      if (order.authority && !order.authority.startsWith(CLAIM_PREFIX)) {
        if (order.paymentUrl) {
          return res.status(200).json({
            url: payLinkFor(order.paymentUrl, order.authority),
            provider: order.paymentProvider || 'zarinpal',
            reused: true
          });
        }
        // Session issued before payment_url existed: the URL cannot be rebuilt
        // safely, so refuse rather than orphan it. The reaper releases the order.
        // ponytail: no URL backfill for pre-migration rows — ceiling is "that
        // customer waits for the 60min reap"; upgrade path is a resume helper on
        // the adapter (authority → StartPay URL) once a legacy row actually bites.
        return res.status(409).json({
          error: 'برای این سفارش یک پرداخت در حال انجام است. لطفاً صفحه پرداخت بازشده را تکمیل کنید.'
        });
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

    // Portable async transaction helper: works on both dialects.
    // Cancels the order, restocks items, and refunds any VIP points that were
    // spent at checkout so a failed payment never leaves the user out of pocket.
    const restockOrder = async (tx: any, orderId: string) => {
      const failedOrderList = await tx.select().from(orders).where(eq(orders.id, orderId));
      const failedOrder = failedOrderList[0];
      await restockItemsAndRefundPoints(tx, orderId, failedOrder?.userId, failedOrder?.vipPointsUsed);
      await tx.update(orders)
        .set({ status: 'cancelled', statusText: 'لغو شده (پرداخت ناموفق)', vipPointsUsed: 0 })
        .where(eq(orders.id, orderId));
    };

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

// Reaper: cancel abandoned pending_payment orders and restock their items.
// If a user never returns from the gateway, stock would stay deducted forever.
// Interval 5min; orders older than 60min are cancelled. Runs in-process; the
// transaction guard (`status === 'pending_payment'` re-check) makes it idempotent
// against a concurrent real verify.
const ABANDON_AFTER_MS = 60 * 60 * 1000;
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - ABANDON_AFTER_MS).toISOString();
    // Legacy rows may lack created_at (column added 2026-08-31); treat NULL as
    // "older than cutoff" only for orders whose id timestamp also predates the
    // cutoff — ORD ids embed base36 creation time.
    const stale = await db.select({ id: orders.id, createdAt: orders.createdAt }).from(orders)
      .where(sql`${orders.status} = 'pending_payment' AND (${orders.createdAt} IS NULL OR ${orders.createdAt} < ${cutoff})`);
    for (const { id, createdAt } of stale) {
      if (!createdAt) {
        const embeddedMs = parseInt(id.replace('ORD-', ''), 36);
        if (!Number.isFinite(embeddedMs) || (Date.now() - embeddedMs) < ABANDON_AFTER_MS) continue;
      }
      await db.transaction(async (tx: any) => {
        const current = await tx.select().from(orders).where(eq(orders.id, id));
        if (!current[0] || current[0].status !== 'pending_payment') return;
        await restockItemsAndRefundPoints(tx, id, current[0].userId, current[0].vipPointsUsed);
        await tx.update(orders)
          .set({ status: 'cancelled', statusText: 'لغو شده (انصراف از پرداخت)' })
          .where(eq(orders.id, id));
      });
      console.log(`[payment-reaper] cancelled abandoned order ${id}`);
    }
  } catch (err) {
    console.error('[payment-reaper] error:', err);
  }
}, 5 * 60 * 1000).unref();

export default router;
