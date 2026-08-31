import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { orderSubmitSchema } from "../validators/index.js";
import { db } from "../db/index.js";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEES } from "../../src/lib/constants.js";
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
    // Collision-resistant order id: ORD-<base36 timestamp>-<4 random chars>.
    // The old 6-digit random number had a ~1-in-900k birthday collision risk.
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const today = new Date();
    const dateStr = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(today);
    
    // Portable async transaction: works on both SQLite (queued by db wrapper)
    // and PostgreSQL.
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
        throw new Error("سبد خرید خالی است");
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
      let couponDiscount = 0;
      let usedCouponCode: string | null = null;
      if (couponCode) {
        const couponList = await tx.select().from(coupons).where(eq(coupons.code, couponCode.toUpperCase()));
        const coupon = couponList[0];
        
        if (!coupon || !coupon.active) {
          throw new Error("کد تخفیف نامعتبر است یا منقضی شده است");
        }

        // Optional expiry: an ISO timestamp in the past invalidates the coupon.
        if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
          throw new Error("کد تخفیف منقضی شده است");
        }

        if (realSubtotal < coupon.minTotal) {
          throw new Error(`حداقل مبلغ خرید برای این کد ${coupon.minTotal.toLocaleString()} تومان است`);
        }

        // Usage cap: null = unlimited. Enforce before discount computation.
        if (coupon.usageLimit != null && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
          throw new Error("ظرفیت استفاده از این کد تخفیف تکمیل شده است");
        }

        if (coupon.percent) {
          couponDiscount = Math.round(realSubtotal * (coupon.percent / 100));
        } else if (coupon.amount) {
          couponDiscount = coupon.amount;
        }

        couponDiscount = Math.min(couponDiscount, realSubtotal);
        usedCouponCode = coupon.code;
      }

      // Handle VIP Points Redemption (1 VIP Point = 1000 Tomans discount)
      let vipDiscount = 0;
      let pointsToDeduct = 0;
      const currentUserList = await tx.select().from(users).where(eq(users.id, userId));
      const currentUser = currentUserList[0];
      const currentVipPoints = currentUser?.vipPoints || 0;

      if (useVipPoints && currentVipPoints > 0) {
        const remainingPayable = Math.max(0, realSubtotal - couponDiscount);
        // Max points usable up to remaining payable amount
        const maxPointsUsable = Math.min(currentVipPoints, Math.floor(remainingPayable / 1000));
        if (maxPointsUsable > 0) {
          pointsToDeduct = maxPointsUsable;
          vipDiscount = pointsToDeduct * 1000;
          await tx.update(users)
            .set({ vipPoints: sql`${users.vipPoints} - ${pointsToDeduct}` })
            .where(eq(users.id, userId));
        }
      }

      const totalDiscount = couponDiscount + vipDiscount;
      // Shipping fee: single source of truth shared with the client (src/lib/constants.ts).
      // Free shipping applies at/above FREE_SHIPPING_THRESHOLD of subtotal —
      // previously this was promised everywhere in the UI but never enforced here,
      // so customers were charged MORE than the displayed total.
      const realShippingFee =
        realSubtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : shippingMethod === "express"
            ? SHIPPING_FEES.express
            : SHIPPING_FEES.standard;
      const realTotal = Math.max(0, realSubtotal + realShippingFee - totalDiscount);

      // Earn 1 VIP Point for every 100,000 Tomans paid
      const earnedVipPoints = Math.floor(realTotal / 100000);

      const orderData = {
        id: orderId,
        userId: userId,
        date: dateStr,
        createdAt: today.toISOString(),
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

      await tx.insert(orders).values(orderData);

      for (const item of finalItems) {
        await tx.insert(orderItems).values({
          orderId: orderId,
          productId: item.id,
          price: item.price,
          qty: item.quantity,
          title: item.title,
          image: item.image,
          brand: item.brand
        });

        await tx.update(products)
          // Use the drizzle column reference (not a raw identifier) so the
          // generated SQL quotes the column correctly on both dialects —
          // PG folds unquoted stockQuantity to stockquantity and fails.
          .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
          .where(eq(products.id, item.id));
      }

      // Add earned points immediately for cash-on-delivery, or upon online verify
      if (paymentMethod !== "online" && earnedVipPoints > 0) {
        await tx.update(users)
          .set({ vipPoints: sql`${users.vipPoints} + ${earnedVipPoints}` })
          .where(eq(users.id, userId));
      }

      // Increment coupon redemption counter (transactional with the order)
      if (usedCouponCode) {
        await tx.update(coupons)
          .set({ usedCount: sql`COALESCE(${coupons.usedCount}, 0) + 1` })
          .where(eq(coupons.code, usedCouponCode));
      }

      // Clear user cart
      await tx.delete(cartItems).where(eq(cartItems.userId, userId));

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
    // Portable async transaction: works on both SQLite (queued by db wrapper)
    // and PostgreSQL.
    const cancelledOrder = await db.transaction(async (tx) => {
      const orderList = await tx.select().from(orders).where(eq(orders.id, orderId));
      const order = orderList[0];
      if (!order) {
        throw { status: 404, message: "سفارش یافت نشد" };
      }

      if (order.userId !== userId) {
        throw { status: 403, message: "شما دسترسی به این سفارش ندارید" };
      }

      if (order.status !== "pending_payment" && order.status !== "processing") {
        throw { status: 400, message: "امکان لغو این سفارش وجود ندارد" };
      }

      const itemsToRestock = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of itemsToRestock) {
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${item.qty}` })
          .where(eq(products.id, item.productId));
      }

      // Data integrity: refund VIP points the user spent at checkout and claw
      // back any points that were earned by this order, so a cancellation
      // leaves loyalty balances exactly as if the order never existed.
      const pointsUsedByOrder = Number(order.vipPointsUsed) || 0;
      if (pointsUsedByOrder > 0) {
        await tx.update(users)
          .set({ vipPoints: sql`${users.vipPoints} + ${pointsUsedByOrder}` })
          .where(eq(users.id, userId));
      }
      // Earned points are only credited once the order actually reached
      // "processing" (COD creation, or a verified online payment). A
      // pending_payment order was never credited, so don't claw those back.
      const pointsEarnedByOrder = order.status === "processing" ? Number(order.vipPointsEarned) || 0 : 0;
      if (pointsEarnedByOrder > 0) {
        await tx.update(users)
          .set({ vipPoints: sql`${users.vipPoints} - ${pointsEarnedByOrder}` })
          .where(eq(users.id, userId));
      }

      await tx.update(orders)
        .set({
          status: "cancelled",
          statusText: "لغو شده توسط کاربر"
        })
        .where(eq(orders.id, orderId));

      const updatedList = await tx.select().from(orders).where(eq(orders.id, orderId));
      return updatedList[0];
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
