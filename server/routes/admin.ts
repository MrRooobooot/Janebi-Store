import { Router } from 'express';
import { db, isPostgres } from '../db/index.js';
import { users, products, orders, orderItems, reviews, coupons, productFeatures, cartItems, wishlistItems, storeSettings, auditLogs } from '../db/schema.js';
import { appCache } from '../utils/cache.js';
import { STORE_SETTINGS_DEFAULTS } from '../../src/lib/constants.js';
import { HERO_IMAGE_DEFAULTS } from './settings.js';
import { eq, desc, sql, inArray, and } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bulkIdsSchema } from '../validators/index.js';
import { restockItemsAndRefundPoints } from '../lib/orderLifecycle.js';

const router = Router();

const ORDER_STATUS_TEXTS: Record<string, string> = {
  pending_payment: 'در انتظار پرداخت',
  processing: 'در حال پردازش',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شده',
  cancelled: 'لغو شده'
};


// Apply middleware to all admin routes
router.use(authenticate, requireAdmin);

// ---------------------------------------------------------
// AUDIT LOG — records every admin mutation (audit §3.7)
// ---------------------------------------------------------
function logAudit(req: any, action: string, entity: string, entityId: string | null, meta: Record<string, unknown> = {}): void {
  db.insert(auditLogs).values({
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    adminUserId: req.user?.id ?? null,
    action,
    entity,
    entityId,
    meta,
    createdAt: new Date().toISOString()
  }).catch((err) => console.error('Audit log write failed:', err));
}

router.get('/audit-logs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String((req as any).query.page)) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String((req as any).query.limit)) || 20));
    const [{ count: total }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    const logs = await db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    res.json({ logs, total: Number(total), page, limit });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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

    // Status breakdown as a GROUP BY aggregate (was: load every order row).
    const statusRows = await db
      .select({ status: orders.status, count: sql<number>`count(*)` })
      .from(orders)
      .groupBy(orders.status);
    const statusCounts: Record<string, number> = {
      pending_payment: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const r of statusRows) {
      if (statusCounts[r.status] !== undefined) {
        statusCounts[r.status] = Number(r.count);
      }
    }

    // Low stock products (stock <= 5) — column ref keeps PG quoting correct
    const lowStockProducts = await db.select().from(products).where(sql`${products.stockQuantity} <= 5`).limit(8);
    const lowStockCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(sql`${products.stockQuantity} <= 5`);
    const lowStockCount = Number(lowStockCountRows[0]?.count ?? 0);

    // Recent orders
    const recentOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.date)],
      limit: 6,
      with: { items: true }
    });

    // Attention counters for sidebar badges: unread contact messages +
    // reviews awaiting moderation (approved = false).
    const { contactMessages } = await import('../db/schema.js');
    const [unreadMsgRows, pendingReviewRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(contactMessages).where(eq(contactMessages.status, 'unread')),
      db.select({ count: sql<number>`count(*)` }).from(reviews).where(eq(reviews.approved, false)),
    ]);

    res.json({
      metrics: {
        totalUsers,
        totalProducts,
        totalRevenue,
        totalOrders,
        lowStockCount,
        unreadMessages: Number(unreadMsgRows[0]?.count ?? 0),
        pendingReviews: Number(pendingReviewRows[0]?.count ?? 0)
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

    // Sales trend: real daily revenue for the last 14 days (completed orders only).
    // Timestamp resolution: `created_at` (ISO) first; legacy NULL rows fall back to the
    // base36 timestamp embedded in the ORD- id (established 2026-08-31 convention).
    const COMPLETED_STATUSES = ["processing", "shipped", "delivered"];
    const resolveOrderTs = (o: typeof allOrders[number]): number | null => {
      if (o.createdAt) {
        const t = Date.parse(o.createdAt);
        if (!Number.isNaN(t)) return t;
      }
      const m = /^ORD-([0-9A-Z]+)-/.exec(o.id);
      if (m) {
        const t = parseInt(m[1], 36);
        if (!Number.isNaN(t) && t > 0) return t;
      }
      return null;
    };

    const DAY_MS = 24 * 60 * 60 * 1000;
    const days = 14;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const trendBuckets: { date: string; revenue: number; orders: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      trendBuckets.push({ date: new Date(todayStart.getTime() - i * DAY_MS).toISOString().slice(0, 10), revenue: 0, orders: 0 });
    }
    const trendIndex = new Map(trendBuckets.map((b, i) => [b.date, i]));

    for (const order of allOrders) {
      if (!COMPLETED_STATUSES.includes(order.status)) continue;
      const ts = resolveOrderTs(order);
      if (ts === null) continue;
      const key = new Date(ts).toISOString().slice(0, 10);
      const idx = trendIndex.get(key);
      if (idx === undefined) continue;
      trendBuckets[idx].revenue += order.total;
      trendBuckets[idx].orders += 1;
    }

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
      salesTrend: trendBuckets,
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

// Admin password reset for any user — standard panel capability. Used as
// the recovery path while no SMS provider is wired up (the public OTP flow
// cannot deliver codes in production yet).
router.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد', message: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' });
    }

    const bcrypt = (await import('bcrypt')).default;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [updated] = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'کاربر یافت نشد', message: 'کاربر یافت نشد' });
    }

    logAudit(req, 'user.password.reset', 'user', id, { targetName: updated.name });
    res.json({ message: `رمز عبور کاربر ${updated.name} با موفقیت تغییر کرد` });
  } catch (error) {
    console.error('Admin password reset error:', error);
    res.status(500).json({ message: 'خطای سرور در تغییر رمز عبور کاربر' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'نقش کاربر نامعتبر است', message: 'Invalid role' });
    }

    // Self-lockout guard: an admin cannot demote their own account — the
    // only admins left with panel access would be zero and the panel dies.
    if (id === (req as any).user?.id && role !== 'admin') {
      return res.status(400).json({ error: 'نمی‌توانید نقش حساب خودتان را تغییر دهید', message: 'Cannot change own role' });
    }

    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: 'کاربر یافت نشد', message: 'User not found' });
    }
    logAudit(req, 'user.role.update', 'user', id, { role });
    res.json({ message: 'User role updated successfully', user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin modify VIP loyalty points for any user
router.put('/users/:id/points', async (req, res) => {
  try {
    const { id } = req.params;
    const { vipPoints } = req.body;

    if (vipPoints === undefined || isNaN(Number(vipPoints)) || Number(vipPoints) < 0) {
      return res.status(400).json({ error: 'مقدار امتیاز نامعتبر است' });
    }

    const [updated] = await db.update(users)
      .set({ vipPoints: Number(vipPoints) })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    res.json({ message: 'امتیاز VIP کاربر با موفقیت بروزرسانی شد', vipPoints: updated.vipPoints });
  } catch (error) {
    console.error('Admin update points error:', error);
    res.status(500).json({ message: 'خطای سرور در تغییر امتیاز کاربر' });
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
    logAudit(req, 'product.create', 'product', String(inserted.id), { title, category, price });
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
    logAudit(req, 'product.update', 'product', id, { title, category, price });
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
    logAudit(req, 'product.delete', 'product', String(prodId), { title: existing.title });
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
    // Optional server-side pagination: ?page=1&limit=50&status=shipped.
    // Omitted params → full list (back-compat with the admin UI's client-side
    // search/filter, which still fetches everything).
    const { page, limit, status } = req.query;
    const where = typeof status === 'string' && status !== 'all' && status
      ? eq(orders.status, status)
      : undefined;
    if (page !== undefined || limit !== undefined) {
      const lim = Math.min(Math.max(parseInt(String(limit ?? 50)) || 50, 1), 200);
      const pg = Math.max(parseInt(String(page ?? 1)) || 1, 1);
      const [paged, countRows] = await Promise.all([
        db.query.orders.findMany({
          where,
          orderBy: [desc(orders.date)],
          with: { items: true },
          limit: lim,
          offset: (pg - 1) * lim,
        }),
        db.select({ count: sql<number>`count(*)` }).from(orders).where(where),
      ]);
      return res.json({ items: paged, total: Number(countRows[0]?.count ?? 0), page: pg, limit: lim });
    }
    const allOrders = await db.query.orders.findMany({
      where,
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
      const cancelResult = await db.transaction(async (tx) => {
        const orderList = await tx.select().from(orders).where(eq(orders.id, id));
        const order = orderList[0];
        if (!order) return null;
        if (order.status === 'cancelled') {
          return { row: order, previousStatus: order.status as string }; // already cancelled — idempotent
        }
        if (order.status !== 'pending_payment' && order.status !== 'processing') {
          throw Object.assign(new Error('فقط سفارش‌های در انتظار پرداخت یا در حال پردازش قابل لغو هستند'), { status: 400 });
        }

        await restockItemsAndRefundPoints(tx, id, order.userId, order.vipPointsUsed);
        const pointsEarnedByOrder = order.status === 'processing' ? Number(order.vipPointsEarned) || 0 : 0;
        if (pointsEarnedByOrder > 0 && order.userId) {
          await tx.update(users)
            .set({ vipPoints: sql`${users.vipPoints} - ${pointsEarnedByOrder}` })
            .where(eq(users.id, order.userId));
        }

        const [row] = await tx.update(orders)
          .set({ status, statusText: statusText || ORDER_STATUS_TEXTS[status] || status })
          .where(eq(orders.id, id))
          .returning();
        return { row, previousStatus: order.status as string };
      });

      if (cancelResult === null) {
        return res.status(404).json({ error: 'سفارش یافت نشد', message: 'سفارش یافت نشد' });
      }
      appCache.invalidate('products');
      logAudit(req, 'order.status.update', 'order', id, { status, previousStatus: cancelResult.previousStatus });
      return res.json(cancelResult.row);
    }

    const textToSet = statusText || ORDER_STATUS_TEXTS[status] || status;

    const [updated] = await db.update(orders)
      .set({ status, statusText: textToSet })
      .where(eq(orders.id, id))
      .returning();
      
    if (!updated) {
      return res.status(404).json({ error: 'سفارش یافت نشد', message: 'سفارش یافت نشد' });
    }
    
    logAudit(req, 'order.status.update', 'order', id, { status });
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
    const { code, percent, amount, minTotal, label, active, usageLimit, expiresAt } = req.body;
    if (!code || !label) {
      return res.status(400).json({ message: 'Code and label are required' });
    }

    if (percent && amount) {
      return res.status(400).json({ message: 'فقط یکی از درصد یا مبلغ تخفیف مجاز است' });
    }

    const upperCode = String(code).toUpperCase();
    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, upperCode) });
    if (existing) {
      return res.status(409).json({ message: 'این کد تخفیف قبلاً ثبت شده است' });
    }

    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' && Number.isNaN(Date.parse(expiresAt))) {
      return res.status(400).json({ message: 'تاریخ انقضا نامعتبر است' });
    }

    const inserted = await db.insert(coupons).values({
      code: upperCode,
      percent: percent ? parseInt(percent) : null,
      amount: amount ? parseInt(amount) : null,
      minTotal: minTotal ? parseInt(minTotal) : 0,
      label,
      active: active ?? true,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
    }).returning();

    logAudit(req, 'coupon.create', 'coupon', upperCode, { label });
    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/admin/coupons/:code — edit an existing coupon. All fields optional;
// omitted fields keep their current value. Audit-logged (§3.7).
router.put('/coupons/:code', async (req, res) => {
  try {
    const upperCode = req.params.code.toUpperCase();
    const { percent, amount, minTotal, label, active, usageLimit, expiresAt } = req.body;

    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, upperCode) });
    if (!existing) {
      return res.status(404).json({ error: 'کد تخفیف یافت نشد', message: 'Coupon not found' });
    }

    if (percent !== undefined && amount !== undefined && percent !== null && amount !== null) {
      return res.status(400).json({ message: 'فقط یکی از درصد یا مبلغ تخفیف مجاز است' });
    }

    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' && Number.isNaN(Date.parse(expiresAt))) {
      return res.status(400).json({ message: 'تاریخ انقضا نامعتبر است' });
    }

    const [updated] = await db.update(coupons).set({
      ...(percent !== undefined && { percent: percent === null ? null : parseInt(percent) }),
      ...(amount !== undefined && { amount: amount === null ? null : parseInt(amount) }),
      ...(minTotal !== undefined && { minTotal: minTotal ? parseInt(minTotal) : 0 }),
      ...(label !== undefined && { label }),
      ...(active !== undefined && { active: Boolean(active) }),
      ...(usageLimit !== undefined && { usageLimit: usageLimit === null || usageLimit === '' ? null : parseInt(usageLimit) }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt === null || expiresAt === '' ? null : new Date(expiresAt).toISOString() })
    }).where(eq(coupons.code, upperCode)).returning();

    logAudit(req, 'coupon.update', 'coupon', upperCode, { label: updated.label });
    res.json(updated);
  } catch (error) {
    console.error('Update coupon error:', error);
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
    logAudit(req, 'coupon.delete', 'coupon', upperCode, { label: existing.label });
    res.json({ message: 'کد تخفیف با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// CONTACT MESSAGES MANAGEMENT
// ---------------------------------------------------------
// List contact messages. ?status= (unread|read|resolved|archived|all) filters
// exactly; when omitted, archived rows are hidden (frontend sends an explicit
// status — e.g. status=all or status=archived — to include them).
router.get('/contact-messages', async (req, res) => {
  try {
    const { contactMessages } = await import('../db/schema.js');
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
    const allowed = ['unread', 'read', 'resolved', 'archived', 'all'];
    if (statusFilter && !allowed.includes(statusFilter)) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }
    const messages = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
    const filtered = statusFilter && statusFilter !== 'all'
      ? messages.filter((m: { status: string }) => m.status === statusFilter)
      : statusFilter === 'all'
        ? messages
        : messages.filter((m: { status: string }) => m.status !== 'archived');
    res.json(filtered);
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

    // STRICT validation — exact match against the allowed set.
    if (!['unread', 'read', 'resolved', 'archived'].includes(status)) {
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

// ---------------------------------------------------------
// ADMIN BULK OPERATIONS (messages & orders)
// All: requireAdmin (router-wide), strict Zod validation,
// db.transaction, return {deleted:n} (or {updated:n}).
// ---------------------------------------------------------

// POST /api/admin/messages/read-all — mark every unread message as read.
router.post('/messages/read-all', async (req, res) => {
  try {
    const { contactMessages } = await import('../db/schema.js');
    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(contactMessages)
        .set({ status: 'read' })
        .where(eq(contactMessages.status, 'unread'))
        .returning({ id: contactMessages.id });
      return rows.length;
    });
    res.json({ updated, deleted: 0 });
  } catch (error) {
    console.error('Bulk mark-all-read error:', error);
    res.status(500).json({ message: 'خطا در علامت‌گذاری پیام‌ها' });
  }
});

// POST /api/admin/messages/bulk-delete — {ids: (string|number)[]}
router.post('/messages/bulk-delete', validate(bulkIdsSchema), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const { contactMessages } = await import('../db/schema.js');
    const deleted = await db.transaction(async (tx) => {
      const rows = await tx
        .delete(contactMessages)
        .where(inArray(contactMessages.id, ids))
        .returning({ id: contactMessages.id });
      return rows.length;
    });
    res.json({ deleted });
  } catch (error) {
    console.error('Bulk delete messages error:', error);
    res.status(500).json({ message: 'خطا در حذف پیام‌ها' });
  }
});

// POST /api/admin/orders/bulk-delete — {ids: (string|number)[]}
// Deletes order items and orders atomically (items first, FK-safe).
router.post('/orders/bulk-delete', validate(bulkIdsSchema), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(orderItems).where(inArray(orderItems.orderId, ids));
      const rows = await tx
        .delete(orders)
        .where(inArray(orders.id, ids))
        .returning({ id: orders.id });
      return rows.length;
    });
    res.json({ deleted });
  } catch (error) {
    console.error('Bulk delete orders error:', error);
    res.status(500).json({ message: 'خطا در حذف سفارش‌ها' });
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

// PUT /reviews/:id/approved — moderation toggle. Recomputes the product's
// aggregate rating from approved reviews and busts review caches.
router.put('/reviews/:id/approved', async (req, res) => {
  try {
    const { id } = req.params;
    const approved = Boolean(req.body?.approved);
    const review = await db.query.reviews.findFirst({ where: eq(reviews.id, id) });
    if (!review) return res.status(404).json({ message: 'نظر یافت نشد' });

    await db.update(reviews).set({ approved }).where(eq(reviews.id, id));

    if (review.productId) {
      const agg = await db
        .select({
          avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(reviews)
        .where(and(eq(reviews.productId, review.productId), eq(reviews.approved, true)));
      const newRating = Math.round(Number(agg[0]?.avg) * 10) / 10;
      await db.update(products)
        .set({ rating: newRating, reviewsCount: Number(agg[0]?.count) || 0 })
        .where(eq(products.id, review.productId));
      appCache.invalidate(`reviews:${review.productId}`);
      appCache.invalidate(`product:${review.productId}`);
      appCache.invalidate('products');
    }
    appCache.invalidate('reviews:latest');
    res.json({ success: true, approved, message: approved ? 'نظر تأیید شد' : 'نظر رد شد (از نمایش عمومی خارج شد)' });
  } catch (error) {
    console.error('Review approve error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(reviews).where(eq(reviews.id, id));
    appCache.invalidate('reviews:latest');
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
// Admin-editable settings allow-list — derived from the canonical shared
// defaults (src/lib/constants.ts), so hero-slide fields are editable too and
// no literals drift between admin, public GET and client fallback.
// Hero image keys (audit §3.6) come from the shared server-side defaults.
const DEFAULT_SETTINGS: Record<string, string> = {
  ...STORE_SETTINGS_DEFAULTS,
  ...HERO_IMAGE_DEFAULTS,
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
    // Accept only known keys, and only string values (hero image fields are
    // asset paths/URLs; anything non-string is rejected rather than coerced).
    const updates = Object.entries(body).filter(
      ([key, value]) => key in DEFAULT_SETTINGS && typeof value === 'string'
    );
    if (updates.length === 0) {
      return res.status(400).json({ message: 'هیچ فیلد معتبری برای ذخیره ارسال نشده است' });
    }

    for (const [key, value] of updates) {
      await db.insert(storeSettings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: String(value) } });
    }

    // Bust any server-side cached settings (e.g. memoized public GET wrappers)
    // so admin edits are visible immediately, not stale.
    appCache.invalidate('settings');
    logAudit(req, 'settings.update', 'settings', null, { keys: updates.map(([key]) => key) });

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

// ---------------------------------------------------------
// DATABASE BACKUP DOWNLOAD — consistent snapshot via VACUUM INTO
// (raw file streaming under active WAL can produce torn backups)
// ---------------------------------------------------------
router.get('/backup', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const dbPath = path.resolve(process.cwd(), 'data', 'janebi.db');

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'فایل پایگاه داده یافت نشد' });
    }

    if (isPostgres) {
      return res.status(400).json({ error: 'بک‌آپ VACUUM فقط برای دیتابیس SQLite پشتیبانی می‌شود' });
    }

    // VACUUM INTO writes a compact, fully-consistent snapshot even while
    // WAL readers/writers are active. A temp file avoids holding the
    // connection open for the whole HTTP stream.
    const { sqlite } = await import('../db/index.js');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tmpPath = path.join(os.tmpdir(), `janebi-backup-${timestamp}.db`);

    try {
      sqlite!.prepare(`VACUUM INTO ?`).run(tmpPath);

      res.setHeader('Content-Disposition', `attachment; filename="janebi-backup-${timestamp}.db"`);
      res.setHeader('Content-Type', 'application/x-sqlite3');

      const filestream = fs.createReadStream(tmpPath);
      filestream.on('close', () => fs.unlink(tmpPath, () => {}));
      filestream.on('error', () => fs.unlink(tmpPath, () => {}));
      filestream.pipe(res);
    } catch (vacuumErr) {
      try { fs.unlinkSync(tmpPath); } catch { /* already gone */ }
      throw vacuumErr;
    }
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ message: 'خطا در ایجاد خروجی بک‌آپ' });
  }
});

export default router;
