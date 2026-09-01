import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, reviews, users } from '../db/schema.js';
import { appCache } from '../utils/cache.js';

const router = Router();

/**
 * GET /latest — the most recent REAL reviews for the storefront homepage.
 * Every row comes from the `reviews` table (no fabricated/demo data); the
 * display name prefers the reviewer's user account name when the review is
 * linked to a user (LEFT JOIN), falling back to the stored `userName`.
 * Hard cap of 6 items. Cached for 60s; cache is busted whenever reviews change.
 */
router.get('/latest', async (_req, res) => {
  try {
    const cacheKey = 'reviews:latest';
    const cached = appCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const rows = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        productName: products.title,
        productImage: products.image,
        userName: reviews.userName,
        accountName: users.name,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        isVerifiedBuyer: reviews.isVerifiedBuyer,
        date: reviews.date,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .innerJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.date))
      .limit(6);

    const payload = rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      productImage: r.productImage,
      userName: r.accountName || r.userName,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      isVerifiedBuyer: Boolean(r.isVerifiedBuyer),
      date: r.date,
    }));

    appCache.set(cacheKey, payload, 60);
    res.json(payload);
  } catch (error) {
    console.error('Latest reviews error:', error);
    res.status(500).json({ message: 'خطای سرور در دریافت آخرین دیدگاه‌ها' });
  }
});

export default router;
