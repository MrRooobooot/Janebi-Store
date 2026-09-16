/**
 * Admin sub-router — Newsletter subscribers: list, delete.
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import { pageParams, setTotalCountHeader, logAudit } from './shared.js';

const router = Router();

// ---------------------------------------------------------
// NEWSLETTER MANAGEMENT
// ---------------------------------------------------------
router.get('/newsletter', async (req, res) => {
  try {
    const { newsletterSubscribers } = await import('../../db/schema.js');
    const { limit, offset } = pageParams(req);
    const subscriberQuery = db.select().from(newsletterSubscribers);
    const subscribers = limit !== null ? await subscriberQuery.limit(limit).offset(offset) : await subscriberQuery;
    await setTotalCountHeader(res, newsletterSubscribers);
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/newsletter/:email', async (req, res) => {
  try {
    const { newsletterSubscribers } = await import('../../db/schema.js');
    const { email } = req.params;
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.toLowerCase()));
    logAudit(req, 'newsletter.delete', 'newsletter', email.toLowerCase(), {});
    res.json({ success: true, message: 'عضویت با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
