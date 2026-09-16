/**
 * Admin sub-router — Dashboard stats + analytics (revenue/VIP/top products).
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { users, products, orders, reviews } from '../../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

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
      orderBy: desc(orders.date),
      limit: 6,
      with: { items: true }
    });

    // Attention counters for sidebar badges: unread contact messages +
    // reviews awaiting moderation (approved = false).
    const { contactMessages } = await import('../../db/schema.js');
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


export default router;
