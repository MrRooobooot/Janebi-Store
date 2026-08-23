import { Router } from 'express';
import { db } from '../db/index.js';
import { orders, orderItems, products, users } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { env } from '../env.js';

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

    // Fallback for demo/testing/sandbox when real ZarinPal gateway is not configured or in test mode
    const isDummyMerchant = !env.ZARINPAL_MERCHANT_ID || 
      MERCHANT_ID === 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' || 
      MERCHANT_ID.startsWith('00000000') ||
      env.ZARINPAL_SANDBOX ||
      env.NODE_ENV === 'test';

    if (isDummyMerchant) {
      const dummyAuthority = `DUMMY_AUTH_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await db.update(orders)
        .set({ authority: dummyAuthority })
        .where(eq(orders.id, orderId));
        
      return res.status(200).json({
        url: `/api/payment/verify?Status=OK&Authority=${dummyAuthority}`,
      });
    }

    const payload = {
      merchant_id: MERCHANT_ID,
      amount: amountInRials,
      description: `سفارش شماره ${orderId}`,
      callback_url: callbackUrl,
    };

    const response = await fetch(ZARINPAL_REQUEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (responseData.data && responseData.data.code === 100) {
      const authority = responseData.data.authority;
      
      // Save authority to the order
      await db.update(orders)
        .set({ authority })
        .where(eq(orders.id, orderId));

      return res.status(200).json({
        url: `${ZARINPAL_STARTPAY_URL}${authority}`,
      });
    } else {
      console.error('ZarinPal Request Error:', responseData);
      return res.status(400).json({ error: 'Payment request failed', details: responseData });
    }

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
    const restockOrder = async (tx: any, orderId: string) => {
      const itemsToRestock = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of itemsToRestock) {
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${item.qty}` })
          .where(eq(products.id, item.productId));
      }
      await tx.update(orders)
        .set({ status: 'cancelled', statusText: 'لغو شده (پرداخت ناموفق)' })
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

    // Dummy merchant handling for testing
    if (authority.startsWith('DUMMY_AUTH_')) {
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

    const amountInRials = order.total * 10;
    
    const payload = {
      merchant_id: MERCHANT_ID,
      amount: amountInRials,
      authority: authority,
    };

    const response = await fetch(ZARINPAL_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (responseData.data && (responseData.data.code === 100 || responseData.data.code === 101)) {
      const refId = responseData.data.ref_id.toString();
      
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
      });
      
      return res.redirect(`/checkout/callback?status=success&orderId=${order.id}&ref_id=${refId}`);
    } else {
      console.error('ZarinPal Verify Error:', responseData);
      await db.transaction(async (tx) => {
        const currentOrderList = await tx.select().from(orders).where(eq(orders.id, order.id));
        const currentOrder = currentOrderList[0];
        if (!currentOrder || currentOrder.status !== 'pending_payment') return;
        await restockOrder(tx, order.id);
      });
      
      return res.redirect(`/checkout/callback?status=failed&orderId=${order.id}`);
    }

  } catch (error) {
    console.error('Payment verify error:', error);
    res.redirect('/checkout/callback?status=failed&message=Internal error');
  }
});

export default router;
