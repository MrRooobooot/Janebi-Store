import { Router } from 'express';
import { db } from '../db/index.js';
import { orders, orderItems, products, users } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { env } from '../env.js';
import { paymentRouter } from '../services/payment/PaymentFailoverRouter.js';

const router = Router();

const MERCHANT_ID = env.ZARINPAL_MERCHANT_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; 
const ZARINPAL_REQUEST_URL = 'https://api.zarinpal.com/pg/v4/payment/request.json';
const ZARINPAL_VERIFY_URL = 'https://api.zarinpal.com/pg/v4/payment/verify.json';
const ZARINPAL_STARTPAY_URL = 'https://www.zarinpal.com/pg/StartPay/';

router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id as string;
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const orderList = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (orderList.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderList[0];

    // Verify order ownership
    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to pay for this order' });
    }
    
    // Convert Tomans to Rials for ZarinPal (multiply by 10)
    const amountInRials = order.total * 10;

    // Use configured APP_URL or fallback safely to trusted forwarded headers
    const baseUrl = env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
    const callbackUrl = `${baseUrl.replace(/\/+$/, "")}/api/payment/verify`;

    const paymentRequest = await paymentRouter.requestPaymentWithFailover({
      orderId,
      amountTomans: order.total,
      callbackUrl,
      description: `پرداخت سفارش ${orderId} - جانبی آرنا`,
      mobile: order.recipientPhone || req.user.phone,
      idempotencyKey: req.headers['idempotency-key'] as string
    });

    if (paymentRequest.success && paymentRequest.authority) {
      await db.update(orders)
        .set({ authority: paymentRequest.authority })
        .where(eq(orders.id, orderId));

      return res.status(200).json({
        url: paymentRequest.paymentUrl,
        provider: paymentRequest.provider
      });
    }

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
      return res.redirect('/checkout/callback?status=failed&message=Invalid parameters');
    }

    const orderList = await db.select().from(orders).where(eq(orders.authority, authority)).limit(1);
    if (orderList.length === 0) {
      return res.redirect('/checkout/callback?status=failed&message=Order not found');
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
      const pointsToRefund = Number(failedOrder?.vipPointsUsed) || 0;
      const itemsToRestock = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of itemsToRestock) {
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${item.qty}` })
          .where(eq(products.id, item.productId));
      }
      if (pointsToRefund > 0 && failedOrder?.userId) {
        await tx.update(users)
          .set({ vipPoints: sql`${users.vipPoints} + ${pointsToRefund}` })
          .where(eq(users.id, failedOrder.userId));
      }
      await tx.update(orders)
        .set({ status: 'cancelled', statusText: 'لغو شده (پرداخت ناموفق)', vipPointsUsed: 0 })
        .where(eq(orders.id, orderId));
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
      await db.transaction(async (tx) => {
        const currentOrderList = await tx.select().from(orders).where(eq(orders.id, order.id));
        const currentOrder = currentOrderList[0];
        if (!currentOrder || currentOrder.status !== 'pending_payment') return;
        await tx.update(orders)
          .set({ 
            status: 'processing', 
            statusText: 'در حال پردازش (پرداخت موفق)',
            refId: dummyRefId
          })
          .where(eq(orders.id, order.id));
        if (order.vipPointsEarned && order.vipPointsEarned > 0 && order.userId) {
          await tx.update(users).set({ vipPoints: sql`${users.vipPoints} + ${order.vipPointsEarned}` }).where(eq(users.id, order.userId));
        }
      });
      
      return res.redirect(`/checkout/callback?status=success&orderId=${order.id}&ref_id=${dummyRefId}`);
    }

    // Verify transaction through PaymentFailoverRouter
    const explicitProvider = req.query.provider as any;
    const verifyResult = await paymentRouter.verifyPayment({
      authority,
      status,
      amountTomans: order.total,
      orderId: order.id
    }, explicitProvider);

    if (verifyResult.success) {
      const refId = verifyResult.refId || `REF-${Math.floor(Math.random() * 1000000)}`;
      
      await db.transaction(async (tx) => {
        const currentOrderList = await tx.select().from(orders).where(eq(orders.id, order.id));
        const currentOrder = currentOrderList[0];
        if (!currentOrder || currentOrder.status !== 'pending_payment') return;
        await tx.update(orders)
          .set({ 
            status: 'processing', 
            statusText: 'در حال پردازش (پرداخت موفق)',
            refId: refId
          })
          .where(eq(orders.id, order.id));
        // Award earned VIP points on successful verified payment
        if (order.vipPointsEarned && order.vipPointsEarned > 0 && order.userId) {
          await tx.update(users).set({ vipPoints: sql`${users.vipPoints} + ${order.vipPointsEarned}` }).where(eq(users.id, order.userId));
        }
      });

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
    res.redirect('/checkout/callback?status=failed&message=Internal error');
  }
});

export default router;
