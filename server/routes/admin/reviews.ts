/**
 * Admin sub-router — Review moderation: list, approve/reject, delete.
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { products, reviews } from '../../db/schema.js';
import { appCache } from '../../utils/cache.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { approvedSchema } from '../../validators/index.js';
import { pageParams, setTotalCountHeader, logAudit } from './shared.js';

const router = Router();

// ---------------------------------------------------------
// REVIEWS MANAGEMENT
// ---------------------------------------------------------
router.get('/reviews', async (req, res) => {
  try {
    const { limit, offset } = pageParams(req);
    const allReviews = await db.query.reviews.findMany({
      orderBy: desc(reviews.date),
      with: { product: true },
      ...(limit !== null ? { limit, offset } : {}),
    });
    await setTotalCountHeader(res, reviews);
    res.json(allReviews);
  } catch (error) {
    console.error('Fetch admin reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /reviews/:id/approved — moderation toggle. Recomputes the product's
// aggregate rating from approved reviews and busts review caches.
router.put('/reviews/:id/approved', validate(approvedSchema), async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { approved } = req.body;
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
      appCache.invalidate('product');
    }
    appCache.invalidate('reviews:latest');
    logAudit(req, 'review.moderate', 'review', id, { approved, productId: review.productId ?? null });
    res.json({ success: true, approved, message: approved ? 'نظر تأیید شد' : 'نظر رد شد (از نمایش عمومی خارج شد)' });
  } catch (error) {
    console.error('Review approve error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const review = await db.query.reviews.findFirst({ where: eq(reviews.id, id) });
    if (!review) {
      return res.status(404).json({ message: 'نظر یافت نشد' });
    }

    await db.delete(reviews).where(eq(reviews.id, id));

    // Deleting an approved review MUST re-derive the product's aggregate from the
    // remaining approved rows (same contract as the approve/reject toggle) — without
    // this the PDP keeps advertising a rating whose review no longer exists.
    if (review.productId) {
      const agg = await db
        .select({
          avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(reviews)
        .where(and(eq(reviews.productId, review.productId), eq(reviews.approved, true)));
      await db.update(products)
        .set({ rating: Math.round(Number(agg[0]?.avg) * 10) / 10, reviewsCount: Number(agg[0]?.count) || 0 })
        .where(eq(products.id, review.productId));
      appCache.invalidate(`reviews:${review.productId}`);
      appCache.invalidate(`product:${review.productId}`);
      appCache.invalidate('product');
    }
    appCache.invalidate('reviews:latest');
    logAudit(req, 'review.delete', 'review', id, { productId: review.productId ?? null, rating: review.rating });
    res.json({ success: true, message: 'نظر با موفقیت حذف شد' });
  } catch (error) {
    console.error('Review delete error:', error);
    res.status(500).json({ message: 'خطای سرور در حذف نظر' });
  }
});


export default router;
