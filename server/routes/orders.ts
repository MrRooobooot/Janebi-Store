import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { orderSubmitSchema } from '../validators/index.js';
import { db } from '../db/index.js';
import { orders, orderItems, products, cartItems, coupons } from '../db/schema.js';
import { desc, eq, and, gte, inArray, sql } from 'drizzle-orm';

import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get(['/', '/my-orders'], async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const allOrders = await db.query.orders.findMany({
    where: eq(orders.userId, userId),
    with: {
      items: true
    },
    orderBy: [desc(orders.date)]
  });
  
  const formatted = allOrders.map(o => ({
    id: o.id,
    date: o.date,
    status: o.status,
    statusText: o.statusText,
    total: o.total,
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    discountAmount: o.discountAmount,
    paymentMethod: o.paymentMethod,
    shippingMethod: o.shippingMethod,
    recipient: {
      name: o.recipientName,
      phone: o.recipientPhone,
      address: o.recipientAddress,
      postalCode: o.recipientPostalCode,
    },
    items: o.items.map(i => ({
      id: i.productId,
      price: i.price,
      quantity: i.qty,
      title: i.title,
      image: i.image,
      brand: i.brand
    }))
  }));

  res.json(formatted);
});

router.post('/', validate(orderSubmitSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const { items, recipient, shippingMethod, paymentMethod, couponCode } = req.body;

  try {
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const today = new Date();
    const dateStr = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(today);
    
    // We will do everything in a single transaction
    const newOrder = await db.transaction(async (tx) => {
      // Aggregate duplicate items by productId
      const itemMap = new Map<number, number>();
      for (const item of items) {
        const pid = Number(item.id || item.productId);
        const qty = Math.max(1, Number(item.quantity || item.qty || 1));
        if (isNaN(pid)) continue;
        itemMap.set(pid, (itemMap.get(pid) || 0) + qty);
      }

      const aggregatedItems = Array.from(itemMap.entries()).map(([productId, quantity]) => ({
        id: productId,
        quantity
      }));

      const productIds = aggregatedItems.map(i => i.id);
      if (productIds.length === 0) {
        throw new Error('سبد خرید خالی است');
      }

      const dbProducts = await tx.select().from(products).where(inArray(products.id, productIds));

      let realSubtotal = 0;
      const finalItems: any[] = [];

      for (const item of aggregatedItems) {
        const dbProduct = dbProducts.find(p => p.id === item.id);
        if (!dbProduct) {
          throw new Error(`محصول با شناسه ${item.id} یافت نشد`);
        }
        
        const itemPrice = dbProduct.price;
        const quantity = item.quantity;
        
        if (dbProduct.stockQuantity < quantity) {
          throw new Error(`موجودی محصول ${dbProduct.title} کافی نیست`);
        }

        realSubtotal += itemPrice * quantity;

        finalItems.push({
          id: dbProduct.id,
          price: itemPrice,
          quantity,
          title: dbProduct.title,
          image: dbProduct.image,
          brand: dbProduct.brand
        });
      }

      // Handle Coupon
      let realDiscount = 0;
      if (couponCode) {
        const couponList = await tx.select().from(coupons).where(eq(coupons.code, couponCode.toUpperCase())).limit(1);
        const coupon = couponList[0];
        
        if (!coupon || !coupon.active) {
          throw new Error('کد تخفیف نامعتبر است یا منقضی شده است');
        }
        
        if (realSubtotal < coupon.minTotal) {
          throw new Error(`حداقل مبلغ خرید برای این کد ${coupon.minTotal.toLocaleString()} تومان است`);
        }
        
        if (coupon.percent) {
          realDiscount = Math.round(realSubtotal * (coupon.percent / 100));
        } else if (coupon.amount) {
          realDiscount = coupon.amount;
        }

        realDiscount = Math.min(realDiscount, realSubtotal);
      }

      const realShippingFee = shippingMethod === 'express' ? 50000 : 35000;
      const realTotal = Math.max(0, realSubtotal + realShippingFee - realDiscount);

      const orderData = {
        id: orderId,
        userId: userId,
        date: dateStr,
        status: paymentMethod === "online" ? "pending_payment" : "processing",
        statusText: paymentMethod === "online" ? "در انتظار پرداخت" : "در حال پردازش",
        total: realTotal,
        subtotal: realSubtotal,
        shippingFee: realShippingFee,
        discountAmount: realDiscount,
        paymentMethod: paymentMethod === "online" ? "پرداخت آنلاین" : "پرداخت در محل",
        shippingMethod: shippingMethod === "express" ? "ارسال اکسپرس" : "پست پیشتاز",
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        recipientAddress: recipient.address,
        recipientPostalCode: recipient.postalCode
      };

      await tx.insert(orders).values(orderData);

      for (const item of finalItems) {
        await tx.insert(orderItems).values({
          orderId,
          productId: item.id,
          price: item.price,
          qty: item.quantity,
          title: item.title,
          image: item.image,
          brand: item.brand || 'نامشخص'
        });
        
        // Decrement stock atomically with constraint
        const updated = await tx.update(products)
          .set({ stockQuantity: sql`stockQuantity - ${item.quantity}` })
          .where(and(eq(products.id, item.id), gte(products.stockQuantity, item.quantity)))
          .returning({ id: products.id, stockQuantity: products.stockQuantity });

        if (!updated || updated.length === 0) {
          throw new Error(`موجودی محصول ${item.title} کافی نیست`);
        }
      }
      
      await tx.delete(cartItems).where(eq(cartItems.userId, userId));

      return {
        ...orderData,
        recipient,
        items: finalItems
      };
    });

    res.status(201).json({
      success: true,
      message: `سفارش شما با موفقیت ثبت شد`,
      order: newOrder
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'خطای سرور در ثبت سفارش' });
  }
});

router.post('/:id/cancel', async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const orderId = req.params.id as string;

  try {
    const cancelledOrder = await db.transaction(async (tx) => {
      const orderList = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      const order = orderList[0];
      if (!order) {
        throw { status: 404, message: 'سفارش یافت نشد' };
      }

      if (order.userId !== userId) {
        throw { status: 403, message: 'شما دسترسی به این سفارش ندارید' };
      }

      if (order.status !== 'pending_payment' && order.status !== 'processing') {
        throw { status: 400, message: 'امکان لغو این سفارش وجود ندارد' };
      }

      const itemsToRestock = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of itemsToRestock) {
        await tx.update(products)
          .set({ stockQuantity: sql`stockQuantity + ${item.qty}` })
          .where(eq(products.id, item.productId));
      }

      await tx.update(orders)
        .set({
          status: 'cancelled',
          statusText: 'لغو شده توسط کاربر'
        })
        .where(eq(orders.id, orderId));

      const updatedList = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      return updatedList[0];
    });

    res.json({
      message: 'سفارش با موفقیت لغو شد',
      order: cancelledOrder
    });
  } catch (error: any) {
    if (error && error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'خطای سرور در لغو سفارش' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const orderId = req.params.id as string;
  
  try {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
      with: { items: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'سفارش یافت نشد' });
    }

    const formatted = {
      id: order.id,
      date: order.date,
      status: order.status,
      statusText: order.statusText,
      total: order.total,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      paymentMethod: order.paymentMethod,
      shippingMethod: order.shippingMethod,
      recipient: {
        name: order.recipientName,
        phone: order.recipientPhone,
        address: order.recipientAddress,
        postalCode: order.recipientPostalCode,
      },
      items: order.items.map(i => ({
        id: i.productId,
        price: i.price,
        quantity: i.qty,
        title: i.title,
        image: i.image,
        brand: i.brand
      }))
    };

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

export default router;
