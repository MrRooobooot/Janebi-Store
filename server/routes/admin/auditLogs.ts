/**
 * Admin sub-router — GET /audit-logs — paged admin audit trail.
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { auditLogs } from '../../db/schema.js';
import { desc, sql } from 'drizzle-orm';

const router = Router();

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

export default router;
