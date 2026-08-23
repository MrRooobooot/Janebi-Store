import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { orderSubmitSchema } from "../validators/index.js";
import { db } from "../db/index.js";
import { orders, orderItems, products, cartItems, coupons, users } from "../db/schema.js";
import { desc, eq, and, inArray, sql } from "drizzle-orm";
import { appCache } from "../utils/cache.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get(["/", "/my-orders"], async (req: AuthRequest, res) => {
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
    vipPointsUsed: o.vipPointsUsed || 0,
    vipPointsEarned: o.vipPointsEarned || 0,
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

router.post("/", validate(orderSubmitSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const { items, recipient, shippingMethod, paymentMethod, couponCode, useVipPoints } = req.body;

  try {
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const today = new Date();
    const dateStr = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(today);
    
    const newOrder = db.transaction((tx) => {
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
        throw new Error("سبد خرید خالی است");
      }

      const dbProducts = tx.select().from(products).where(inArray(products.id, productIds)).all();

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
      let couponDiscount = 0;
      if (couponCode) {
        const coupon = tx.select().from(coupons).where(eq(coupons.code, couponCode.toUpperCase())).get();
        
        if (!coupon || !coupon.active) {
          throw new Error("کد تخفیف نامعتبر است یا منقضی شده است");
        }
        
        if (realSubtotal < coupon.minTotal) {
          throw new Error(`حداقل مبلغ خرید برای این کد ${coupon.minTotal.toLocaleString()} تومان است`);
        }
        
        if (coupon.percent) {
          couponDiscount = Math.round(realSubtotal * (coupon.percent / 100));
        } else if (coupon.amount) {
          couponDiscount = coupon.amount;
        }

        couponDiscount = Math.min(couponDiscount, realSubtotal);
      }

      // Handle VIP Points Redemption (1 VIP Point = 1000 Tomans discount)
      let vipDiscount = 0;
      let pointsToDeduct = 0;
      const currentUser = tx.select().from(users).where(eq(users.id, userId)).get();
      const currentVipPoints = currentUser?.vipPoints || 0;

      if (useVipPoints && currentVipPoints > 0) {
        const remainingPayable = Math.max(0, realSubtotal - couponDiscount);
        // Max points usable up to remaining payable amount
        const maxPointsUsable = Math.min(currentVipPoints, Math.floor(remainingPayable / 1000));
        if (maxPointsUsable > 0) {
          pointsToDeduct = maxPointsUsable;
          vipDiscount = pointsToDeduct * 1000;
          tx.update(users)
            .set({ vipPoints: sql`vip_points - ${pointsToDeduct}` })
            .where(eq(users.id, userId))
            .run();
        }
      }

      const totalDiscount = couponDiscount + vipDiscount;
      const realShippingFee = shippingMethod === "express" ? 50000 : 35000;
      const realTotal = Math.max(0, realSubtotal + realShippingFee - totalDiscount);

      // Earn 1 VIP Point for every 100,000 Tomans paid
      const earnedVipPoints = Math.floor(realTotal / 100000);

      const orderData = {
        id: orderId,
        userId: userId,
        date: dateStr,
        status: paymentMethod === "online" ? "pending_payment" : "processing",
        statusText: paymentMethod === "online" ? "در انتظار پرداخت" : "در حال پردازش",
        total: realTotal,
        subtotal: realSubtotal,
        shippingFee: realShippingFee,
        discountAmount: totalDiscount,
        vipPointsUsed: pointsToDeduct,
        vipPointsEarned: earnedVipPoints,
        paymentMethod: paymentMethod === "online" ? "پرداخت آنلاین زرین‌پال" : "پرداخت در محل",
        shippingMethod: shippingMethod === "express" ? "پست پیشتاز (سریع)" : "پست سفارشی (معمولی)",
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        recipientAddress: recipient.address,
        recipientPostalCode: recipient.postalCode || null,
        authority: null,
        refId: null
      };

      tx.insert(orders).values(orderData).run();

      for (const item of finalItems) {
        tx.insert(orderItems).values({
          orderId: orderId,
          productId: item.id,
          price: item.price,
          qty: item.quantity,
          title: item.title,
          image: item.image,
          brand: item.brand
        }).run();

        tx.update(products)
          .set({ stockQuantity: sql`stockQuantity - ${item.quantity}` })
          .where(eq(products.id, item.id))
          .run();
      }

      // Add earned points immediately for cash-on-delivery, or upon online verify
      if (paymentMethod !== "online" && earnedVipPoints > 0) {
        tx.update(users)
          .set({ vipPoints: sql`vip_points + ${earnedVipPoints}` })
          .where(eq(users.id, userId))
          .run();
      }

      // Clear user cart
      tx.delete(cartItems).where(eq(cartItems.userId, userId)).run();

      return {
        ...orderData,
        items: finalItems
      };
    });

    appCache.invalidate("products");
    res.status(201).json({
      success: true,
      message: "سفارش شما با موفقیت ثبت شد",
      order: newOrder
    });

  } catch (error: any) {
    console.error("Order creation error:", error);
    res.status(400).json({ message: error.message || "خطا در ثبت سفارش" });
  }
});


router.post("/:id/cancel", async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const orderId = req.params.id as string;

  try {
    const cancelledOrder = db.transaction((tx) => {
      const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
      if (!order) {
        throw { status: 404, message: "سفارش یافت نشد" };
      }

      if (order.userId !== userId) {
        throw { status: 403, message: "شما دسترسی به این سفارش ندارید" };
      }

      if (order.status !== "pending_payment" && order.status !== "processing") {
        throw { status: 400, message: "امکان لغو این سفارش وجود ندارد" };
      }

      const itemsToRestock = tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
      for (const item of itemsToRestock) {
        tx.update(products)
          .set({ stockQuantity: sql`stockQuantity + ${item.qty}` })
          .where(eq(products.id, item.productId))
          .run();
      }

      tx.update(orders)
        .set({
          status: "cancelled",
          statusText: "لغو شده توسط کاربر"
        })
        .where(eq(orders.id, orderId))
        .run();

      const updated = tx.select().from(orders).where(eq(orders.id, orderId)).get();
      return updated;
    });

    appCache.invalidate("products");
    res.json({
      message: "سفارش با موفقیت لغو شد",
      order: cancelledOrder
    });
  } catch (error: any) {
    if (error && error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "خطای سرور در لغو سفارش" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const orderId = req.params.id as string;
  
  try {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
      with: { items: true }
    });

    if (!order) {
      return res.status(404).json({ message: "سفارش یافت نشد" });
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
      vipPointsUsed: order.vipPointsUsed || 0,
      vipPointsEarned: order.vipPointsEarned || 0,
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
    res.status(500).json({ message: "خطای سرور" });
  }
});

export default router;
