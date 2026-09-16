/**
 * Admin sub-router — Contact messages: list, status, read-all, bulk delete.
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { orders } from '../../db/schema.js';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { bulkIdsSchema, messageStatusSchema } from '../../validators/index.js';
import { pageParams, setTotalCountHeader, logAudit } from './shared.js';

const router = Router();

// ---------------------------------------------------------
// CONTACT MESSAGES MANAGEMENT
// ---------------------------------------------------------
// List contact messages. ?status= (unread|read|resolved|archived|all) filters
// exactly; when omitted, archived rows are hidden (frontend sends an explicit
// status — e.g. status=all or status=archived — to include them).
router.get('/contact-messages', async (req, res) => {
  try {
    const { contactMessages } = await import('../../db/schema.js');
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
    const allowed = ['unread', 'read', 'resolved', 'archived', 'all'];
    if (statusFilter && !allowed.includes(statusFilter)) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }
    const { limit, offset } = pageParams(req);
    const where =
      statusFilter === 'all'
        ? undefined
        : statusFilter
          ? eq(contactMessages.status, statusFilter)
          : sql`${contactMessages.status} <> 'archived'`;
    const base = db.select().from(contactMessages);
    const scoped = (where ? base.where(where) : base).orderBy(desc(contactMessages.createdAt));
    const messages = limit !== null ? await scoped.limit(limit).offset(offset) : await scoped;
    await setTotalCountHeader(res, contactMessages, where);
    res.json(messages);
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/contact-messages/:id/status', validate(messageStatusSchema), async (req, res) => {
  try {
    const { contactMessages } = await import('../../db/schema.js');
    const { id } = req.params as { id: string };
    const { status } = req.body;

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
    const { contactMessages } = await import('../../db/schema.js');
    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(contactMessages)
        .set({ status: 'read' })
        .where(eq(contactMessages.status, 'unread'))
        .returning({ id: contactMessages.id });
      return rows.length;
    });
    logAudit(req, 'message.read_all', 'message', null, { updated });
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
    const { contactMessages } = await import('../../db/schema.js');
    const deleted = await db.transaction(async (tx) => {
      const rows = await tx
        .delete(contactMessages)
        .where(inArray(contactMessages.id, ids))
        .returning({ id: contactMessages.id });
      return rows.length;
    });
    logAudit(req, 'message.bulk_delete', 'message', null, { ids, count: deleted });
    res.json({ deleted });
  } catch (error) {
    console.error('Bulk delete messages error:', error);
    res.status(500).json({ message: 'خطا در حذف پیام‌ها' });
  }
});

export default router;
