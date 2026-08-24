import { Router } from 'express';
import { db } from '../db/index.js';
import { users, products, orders, orderItems, reviews, coupons, productFeatures, cartItems, wishlistItems, storeSettings } from '../db/schema.js';
import { appCache } from '../utils/cache.js';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Apply middleware to all admin routes
router.use(authenticate, requireAdmin);

// ---------------------------------------------------------
// STATS & DASHBOARD
// ---------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = (await db.select({ count: sql<number>`count(*)` }).from(users))[0].count;
    const totalProducts = (await db.select({ count: sql<number>`count(*)` }).from(products))[0].count;
    
    // Total revenue (only for paid/processing/delivered orders)
    const revenueResult = await db.select({ total: sql<number>`sum(total)` }).from(orders).where(
      sql`status IN ('processing', 'shipped', 'delivered')`
    );
    const totalRevenue = revenueResult[0].total || 0;

    const totalOrders = (await db.select({ count: sql<number>`count(*)` }).from(orders))[0].count;

    // Status breakdown
    const allOrdersList = await db.select({ status: orders.status }).from(orders);
    const statusCounts: Record<string, number> = {
      pending_payment: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of allOrdersList) {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status]++;
      }
    }

    // Low stock products (stock <= 5) — column ref keeps PG quoting correct
    const lowStockProducts = await db.select().from(products).where(sql`${products.stockQuantity} <= 5`).limit(8);

    // Recent orders
    const recentOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.date)],
      limit: 6,
      with: { items: true }
    });

    res.json({
      metrics: {
        totalUsers,
        totalProducts,
        totalRevenue,
        totalOrders,
        lowStockCount: lowStockProducts.length
      },
      statusCounts,
      lowStockProducts,
      recentOrders
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ---------------------------------------------------------
// COMPREHENSIVE ANALYTICS & INSIGHTS
// ---------------------------------------------------------
router.get("/analytics", async (req, res) => {
  try {
    const allOrders = await db.query.orders.findMany({
      with: { items: true }
    });

    const allUsers = await db.select().from(users);
    const allProducts = await db.select().from(products);

    // Sales by Category
    const categorySales: Record<string, { category: string; count: number; revenue: number }> = {};
    for (const p of allProducts) {
      if (!categorySales[p.category]) {
        categorySales[p.category] = { category: p.category, count: 0, revenue: 0 };
      }
    }

    let completedRevenue = 0;
    let totalDiscountGiven = 0;
    let totalVipPointsDistributed = 0;

    for (const order of allOrders) {
      if (["processing", "shipped", "delivered"].includes(order.status)) {
        completedRevenue += order.total;
        totalDiscountGiven += order.discountAmount || 0;
        totalVipPointsDistributed += order.vipPointsEarned || 0;

        for (const item of order.items) {
          const matchedProd = allProducts.find(p => p.id === item.productId);
          const cat = matchedProd?.category || "متفرقه";
          if (!categorySales[cat]) {
            categorySales[cat] = { category: cat, count: 0, revenue: 0 };
          }
          categorySales[cat].count += item.qty;
          categorySales[cat].revenue += item.price * item.qty;
        }
      }
    }

    // Top Selling Products
    const productSalesMap: Record<number, { id: number; title: string; count: number; revenue: number }> = {};
    for (const order of allOrders) {
      if (["processing", "shipped", "delivered"].includes(order.status)) {
        for (const item of order.items) {
          if (!productSalesMap[item.productId]) {
            productSalesMap[item.productId] = {
              id: item.productId,
              title: item.title,
              count: 0,
              revenue: 0
            };
          }
          productSalesMap[item.productId].count += item.qty;
          productSalesMap[item.productId].revenue += item.price * item.qty;
        }
      }
    }

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // VIP loyalty overview
    const totalVipUsers = allUsers.filter(u => (u.vipPoints || 0) > 0).length;
    const totalActiveVipPoints = allUsers.reduce((sum, u) => sum + (u.vipPoints || 0), 0);

    res.json({
      financials: {
        completedRevenue,
        totalDiscountGiven,
        totalOrdersCount: allOrders.length,
        averageOrderValue: allOrders.length > 0 ? Math.round(completedRevenue / allOrders.length) : 0,
      },
      loyalty: {
        totalVipUsers,
        totalActiveVipPoints,
        totalVipPointsDistributed,
      },
      categoryPerformance: Object.values(categorySales),
      topSellingProducts,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------------------------------------------------
// USERS MANAGEMENT
// ---------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.joinedDate)]
    });
    
    // Omit passwords
    const safeUsers = allUsers.map(u => {
      const { password, ...rest } = u;
      return rest;
    });

    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'نقش کاربر نامعتبر است', message: 'Invalid role' });
    }

    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: 'کاربر یافت نشد', message: 'User not found' });
    }
    res.json({ message: 'User role updated successfully', user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// PRODUCTS MANAGEMENT
// ---------------------------------------------------------
router.post('/products', async (req, res) => {
  try {
    const { title, category, price, originalPrice, discount, image, brand, warranty, description, stockQuantity, sku } = req.body;
    
    if (!title || !category || price === undefined) {
      return res.status(400).json({ message: 'Title, category, and price are required' });
    }

    const [inserted] = await db.insert(products).values({
      title,
      category,
      price: parseInt(price) || 0,
      originalPrice: originalPrice ? parseInt(originalPrice) : null,
      discount: discount ? parseInt(discount) : 0,
      image: image || '/placeholder.png',
      brand: brand || 'متفرقه',
      warranty: warranty || null,
      description: description || null,
      stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : 10,
      sku: sku || `SKU-${Date.now()}`
    }).returning();

    appCache.invalidate('products');
    appCache.invalidate('categories');
    res.status(201).json(inserted);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'خطای سرور در ایجاد محصول' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, price, originalPrice, discount, image, brand, warranty, description, stockQuantity, sku } = req.body;
    
    const [updated] = await db.update(products).set({
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(price !== undefined && { price: parseInt(price) || 0 }),
      ...(originalPrice !== undefined && { originalPrice: originalPrice ? parseInt(originalPrice) : null }),
      ...(discount !== undefined && { discount: parseInt(discount) || 0 }),
      ...(image !== undefined && { image }),
      ...(brand !== undefined && { brand }),
      ...(warranty !== undefined && { warranty }),
      ...(description !== undefined && { description }),
      ...(stockQuantity !== undefined && { stockQuantity: parseInt(stockQuantity) || 0 }),
      ...(sku !== undefined && { sku })
    }).where(eq(products.id, parseInt(id))).returning();

    if (!updated) {
      return res.status(404).json({ error: 'محصول یافت نشد', message: 'محصول یافت نشد' });
    }

    appCache.invalidate('products');
    appCache.invalidate('categories');
    res.json(updated);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'خطای سرور در ویرایش محصول' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prodId = parseInt(id);

    if (isNaN(prodId)) {
      return res.status(400).json({ error: 'شناسه محصول نامعتبر است', message: 'شناسه محصول نامعتبر است' });
    }

    const existing = await db.query.products.findFirst({
      where: eq(products.id, prodId)
    });
    if (!existing) {
      return res.status(404).json({ error: 'محصول یافت نشد', message: 'محصول یافت نشد' });
    }

    // Portable async transaction: works on both SQLite (queued by db wrapper)
    // and PostgreSQL.
    await db.transaction(async (tx) => {
      await tx.delete(productFeatures).where(eq(productFeatures.productId, prodId));
      await tx.delete(cartItems).where(eq(cartItems.productId, prodId));
      await tx.delete(wishlistItems).where(eq(wishlistItems.productId, prodId));
      await tx.delete(reviews).where(eq(reviews.productId, prodId));
      await tx.delete(products).where(eq(products.id, prodId));
    });

    appCache.invalidate('products');
    appCache.invalidate('categories');
    res.json({ message: 'محصول با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: error.message || 'خطای سرور در حذف محصول' });
  }
});

// ---------------------------------------------------------
// ORDERS MANAGEMENT
// ---------------------------------------------------------
router.get('/orders', async (req, res) => {
  try {
    const allOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.date)],
      with: { items: true }
    });
    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در دریافت سفارشات' });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusText } = req.body;

    const allowedStatuses = ['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'وضعیت سفارش نامعتبر است', message: 'وضعیت سفارش نامعتبر است' });
    }

    // Cancelling from the admin panel must have the same data-integrity
    // effects as a user-initiated cancellation: restock items and unwind
    // VIP points (refund used, claw back earned — earned only when the
    // order actually reached "processing").
    if (status === 'cancelled') {
      const updated = await db.transaction(async (tx) => {
        const orderList = await tx.select().from(orders).where(eq(orders.id, id));
        const order = orderList[0];
        if (!order) return null;
        if (order.status === 'cancelled') {
          return order; // already cancelled — idempotent
        }
        if (order.status !== 'pending_payment' && order.status !== 'processing') {
          throw Object.assign(new Error('فقط سفارش‌های در انتظار پرداخت یا در حال پردازش قابل لغو هستند'), { status: 400 });
        }

        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
        for (const item of items) {
          await tx.update(products)
            .set({ stockQuantity: sql`${products.stockQuantity} + ${item.qty}` })
            .where(eq(products.id, item.productId));
        }

        const pointsUsedByOrder = Number(order.vipPointsUsed) || 0;
        if (pointsUsedByOrder > 0 && order.userId) {
          await tx.update(users)
            .set({ vipPoints: sql`${users.vipPoints} + ${pointsUsedByOrder}` })
            .where(eq(users.id, order.userId));
        }
        const pointsEarnedByOrder = order.status === 'processing' ? Number(order.vipPointsEarned) || 0 : 0;
        if (pointsEarnedByOrder > 0 && order.userId) {
          await tx.update(users)
            .set({ vipPoints: sql`${users.vipPoints} - ${pointsEarnedByOrder}` })
            .where(eq(users.id, order.userId));
        }

        const defaultStatusTexts: Record<string, string> = {
          pending_payment: 'در انتظار پرداخت',
          processing: 'در حال پردازش',
          shipped: 'ارسال شده',
          delivered: 'تحویل داده شده',
          cancelled: 'لغو شده'
        };
        const [row] = await tx.update(orders)
          .set({ status, statusText: statusText || defaultStatusTexts[status] || status })
          .where(eq(orders.id, id))
          .returning();
        return row;
      });

      if (updated === null) {
        return res.status(404).json({ error: 'سفارش یافت نشد', message: 'سفارش یافت نشد' });
      }
      appCache.invalidate('products');
      return res.json(updated);
    }

    const defaultStatusTexts: Record<string, string> = {
      pending_payment: 'در انتظار پرداخت',
      processing: 'در حال پردازش',
      shipped: 'ارسال شده',
      delivered: 'تحویل داده شده',
      cancelled: 'لغو شده'
    };
    const textToSet = statusText || defaultStatusTexts[status] || status;

    const [updated] = await db.update(orders)
      .set({ status, statusText: textToSet })
      .where(eq(orders.id, id))
      .returning();
      
    if (!updated) {
      return res.status(404).json({ error: 'سفارش یافت نشد', message: 'سفارش یافت نشد' });
    }
    
    res.json(updated);
  } catch (error: any) {
    if (error?.status === 400) {
      return res.status(400).json({ error: error.message, message: error.message });
    }
    res.status(500).json({ message: 'خطای سرور در تغییر وضعیت سفارش' });
  }
});

// ---------------------------------------------------------
// COUPONS MANAGEMENT
// ---------------------------------------------------------
router.get('/coupons', async (req, res) => {
  try {
    const allCoupons = await db.select().from(coupons);
    res.json(allCoupons);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/coupons', async (req, res) => {
  try {
    const { code, percent, amount, minTotal, label, active } = req.body;
    if (!code || !label) {
      return res.status(400).json({ message: 'Code and label are required' });
    }

    const inserted = await db.insert(coupons).values({
      code: code.toUpperCase(),
      percent: percent ? parseInt(percent) : null,
      amount: amount ? parseInt(amount) : null,
      minTotal: minTotal ? parseInt(minTotal) : 0,
      label,
      active: active ?? true
    }).returning();

    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/coupons/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();
    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.code, upperCode)
    });
    if (!existing) {
      return res.status(404).json({ error: 'کد تخفیف یافت نشد', message: 'Coupon not found' });
    }

    await db.delete(coupons).where(eq(coupons.code, upperCode));
    res.json({ message: 'کد تخفیف با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// CONTACT MESSAGES MANAGEMENT
// ---------------------------------------------------------
router.get('/contact-messages', async (req, res) => {
  try {
    const { contactMessages } = await import('../db/schema.js');
    const messages = await db.select().from(contactMessages);
    res.json(messages);
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/contact-messages/:id/status', async (req, res) => {
  try {
    const { contactMessages } = await import('../db/schema.js');
    const { id } = req.params;
    const { status } = req.body;

    if (!['unread', 'read', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.update(contactMessages)
      .set({ status })
      .where(eq(contactMessages.id, id));

    res.json({ success: true, message: 'وضعیت پیام بروزرسانی شد' });
  } catch (error) {
    console.error('Update contact message status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stockQuantity } = req.body;
    const prodId = parseInt(id);

    if (isNaN(prodId) || stockQuantity === undefined || isNaN(parseInt(stockQuantity))) {
      return res.status(400).json({ error: 'مقدار موجودی نامعتبر است' });
    }

    const [updated] = await db.update(products)
      .set({ stockQuantity: Math.max(0, parseInt(stockQuantity)) })
      .where(eq(products.id, prodId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در بروزرسانی موجودی' });
  }
});

router.put('/orders/:id/tracking', async (req, res) => {
  try {
    const { id } = req.params;
    const { refId } = req.body;

    const [updated] = await db.update(orders)
      .set({ refId: refId ? String(refId).trim() : null })
      .where(eq(orders.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'سفارش یافت نشد' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در ثبت کد رهگیری' });
  }
});

// ---------------------------------------------------------
// REVIEWS MANAGEMENT
// ---------------------------------------------------------
router.get('/reviews', async (req, res) => {
  try {
    const allReviews = await db.query.reviews.findMany({
      orderBy: [desc(reviews.date)],
      with: { product: true }
    });
    res.json(allReviews);
  } catch (error) {
    console.error('Fetch admin reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(reviews).where(eq(reviews.id, id));
    res.json({ success: true, message: 'نظر با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// NEWSLETTER MANAGEMENT
// ---------------------------------------------------------
router.get('/newsletter', async (req, res) => {
  try {
    const { newsletterSubscribers } = await import('../db/schema.js');
    const subscribers = await db.select().from(newsletterSubscribers);
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/newsletter/:email', async (req, res) => {
  try {
    const { newsletterSubscribers } = await import('../db/schema.js');
    const { email } = req.params;
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.toLowerCase()));
    res.json({ success: true, message: 'عضویت با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// STORE SETTINGS — persisted in the store_settings table so
// they survive container restarts (previously RAM-only).
// ---------------------------------------------------------
const DEFAULT_SETTINGS: Record<string, string> = {
  storeName: 'جانبی آرنا',
  phone: '۰۲۱-۸۸۸۸۹۹۹۹',
  email: 'info@janebi-arena.ir',
  supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
  address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
  freeShippingThreshold: '2000000',
  announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10'
};

router.get('/settings', async (req, res) => {
  try {
    const rows = await db.select().from(storeSettings);
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) merged[row.key] = row.value;
    // freeShippingThreshold stays numeric for API compatibility.
    res.json({ ...merged, freeShippingThreshold: parseInt(merged.freeShippingThreshold) || 0 });
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const body = req.body || {};
    const updates = Object.entries(body).filter(([key]) => key in DEFAULT_SETTINGS);
    if (updates.length === 0) {
      return res.status(400).json({ message: 'هیچ فیلد معتبری برای ذخیره ارسال نشده است' });
    }

    for (const [key, value] of updates) {
      await db.insert(storeSettings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: String(value) } });
    }

    const rows = await db.select().from(storeSettings);
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) merged[row.key] = row.value;

    res.json({
      success: true,
      message: 'تنظیمات فروشگاه با موفقیت ذخیره شد',
      settings: { ...merged, freeShippingThreshold: parseInt(merged.freeShippingThreshold) || 0 }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'خطای سرور در ذخیره تنظیمات' });
  }
});

export default router;
