import { Router } from 'express';
import { desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { reviews } from '../db/schema.js';

const router = Router();

/**
 * GET /api/reviews/latest — the most recent real customer reviews across
 * all products. Powers the homepage testimonials section; previously it
 * displayed fabricated static quotes.
 */
router.get('/latest', async (_req, res) => {
  const latest = await db.query.reviews.findMany({
    orderBy: [desc(reviews.id)],
    limit: 6,
  });
  res.json(latest);
});

export default router;
