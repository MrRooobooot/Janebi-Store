/**
 * Admin sub-router — Orders: list, status transition, bulk delete, tracking.
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { users, orders, orderItems } from '../../db/schema.js';
import { appCache } from '../../utils/cache.js';
import { eq, desc, sql, inArray, and } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { bulkIdsSchema, orderStatusSchema, trackingSchema } from '../../validators/index.js';
import { restockItemsAndRefundPoints } from '../../lib/orderLifecycle.js';
import { logAudit, ORDER_STATUS_TEXTS } from './shared.js';

const router = Router();

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
          orderBy: desc(orders.date),
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
      orderBy: desc(orders.date),
      with: { items: true }
    });
    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در دریافت سفارشات' });
  }
});

router.put('/orders/:id/status', validate(orderStatusSchema), async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { status, statusText } = req.body;

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

        // R1-03: flip status first with an atomic predicate — 0 rows updated
        // means a concurrent cancel won the race; skip restock/refund.
        const cancelledRows = await tx.update(orders)
          .set({ status, statusText: statusText || ORDER_STATUS_TEXTS[status] || status })
          .where(and(
            eq(orders.id, id),
            inArray(orders.status, ['pending_payment', 'processing'])
          ))
          .returning();
        if (!cancelledRows || cancelledRows.length === 0) {
          return { row: order, previousStatus: order.status as string };
        }
        const row = cancelledRows[0];

        await restockItemsAndRefundPoints(tx, id, order.userId, order.vipPointsUsed);
        const pointsEarnedByOrder = order.status === 'processing' ? Number(order.vipPointsEarned) || 0 : 0;
        // R1-07: conditional clawback — only deduct while vipPoints >= X so the
        // balance can never go negative (clamped at 0 via the predicate).
        if (pointsEarnedByOrder > 0 && order.userId) {
          await tx.update(users)
            .set({ vipPoints: sql`${users.vipPoints} - ${pointsEarnedByOrder}` })
            .where(and(eq(users.id, order.userId), sql`${users.vipPoints} >= ${pointsEarnedByOrder}`));
        }

        return { row, previousStatus: order.status as string };
      });

      if (cancelResult === null) {
        return res.status(404).json({ error: 'سفارش یافت نشد', message: 'سفارش یافت نشد' });
      }
      appCache.invalidate('product');
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


// POST /api/admin/orders/bulk-delete — {ids: (string|number)[]}
// Deletes order items and orders atomically (items first, FK-safe) and unwinds the
// financial side effects first: orders still holding inventory/points
// (pending_payment, processing) are restocked, the points they spent are refunded
// and the points they earned (COD) are clawed back — mirroring the single-order
// cancel path. A plain DELETE silently burned stock forever.
router.post('/orders/bulk-delete', validate(bulkIdsSchema), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const result = await db.transaction(async (tx) => {
      const rows = await tx.select().from(orders).where(inArray(orders.id, ids));
      for (const order of rows) {
        if (order.status !== 'pending_payment' && order.status !== 'processing') continue;
        await restockItemsAndRefundPoints(tx, order.id, order.userId, order.vipPointsUsed);
        const earned = order.status === 'processing' ? Number(order.vipPointsEarned) || 0 : 0;
        if (earned > 0 && order.userId) {
          await tx.update(users)
            .set({ vipPoints: sql`${users.vipPoints} - ${earned}` })
            .where(and(eq(users.id, order.userId), sql`${users.vipPoints} >= ${earned}`));
        }
      }
      await tx.delete(orderItems).where(inArray(orderItems.orderId, ids));
      const removed = await tx
        .delete(orders)
        .where(inArray(orders.id, ids))
        .returning({ id: orders.id });
      return { deleted: removed.length, ids: removed.map((r) => r.id) };
    });
    appCache.invalidate('product');
    logAudit(req, 'order.bulk_delete', 'order', null, { ids: result.ids, count: result.deleted });
    res.json({ deleted: result.deleted });
  } catch (error) {
    console.error('Bulk delete orders error:', error);
    res.status(500).json({ message: 'خطا در حذف سفارش‌ها' });
  }
});

router.put('/orders/:id/tracking', validate(trackingSchema), async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { refId } = req.body;

    const [updated] = await db.update(orders)
      .set({ refId: refId ?? null })
      .where(eq(orders.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'سفارش یافت نشد' });
    }

    logAudit(req, 'order.tracking.update', 'order', id, { refId: refId ?? null });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در ثبت کد رهگیری' });
  }
});

export default router;
