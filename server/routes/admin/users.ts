/**
 * Admin sub-router — Users: list, password, role, VIP points (owner row protected).
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq, ne, desc, sql, and } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { adminPasswordSchema, roleSchema, pointsSchema } from '../../validators/index.js';
import { bumpTokenVersion } from '../tokenVersion.js';
import { ADMIN_LIST_CAP, pageParams, setTotalCountHeader, logAudit, isOwnerTarget, denyOwner, ownerUserId } from './shared.js';

const router = Router();

// ---------------------------------------------------------
// USERS MANAGEMENT
// ---------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const { limit, offset } = pageParams(req);
    const requesterId = String((req as any).user?.id || '');
    const ownerId = ownerUserId();
    // Owner cloaking runs in SQL, not on the already-sliced page: filtering after
    // LIMIT/OFFSET shorted pages and let X-Total-Count (raw table count) admit the
    // hidden account's existence to non-owner admins.
    const hideOwner = ownerId.length > 0 && requesterId !== ownerId;
    const visibleTo = hideOwner ? ne(users.id, ownerId) : undefined;
    // db.select() not db.query.* — the relational API needs schema relations config;
    // select() matches the working pattern used everywhere else in this file.
    const visible = await db.select().from(users)
      .where(visibleTo)
      // Real chronology: joined_date holds Persian display text (۱۴۰۵/۶/۷) and must
      // never drive ORDER BY. created_at (epoch ms) is backfilled for legacy rows;
      // unknown rows sort oldest via COALESCE 0.
      .orderBy(sql`coalesce(${users.createdAt}, 0) desc, ${users.id} desc`)
      .limit(limit ?? ADMIN_LIST_CAP)
      .offset(limit === null ? 0 : offset);

    // Omit passwords
    const safeUsers = visible.map(u => {
      const { password, ...rest } = u;
      return rest;
    });

    await setTotalCountHeader(res, users, visibleTo);
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin password reset for any user — standard panel capability. Used as
// the recovery path while no SMS provider is wired up (the public OTP flow
// cannot deliver codes in production yet).
router.put('/users/:id/password', validate(adminPasswordSchema), async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { newPassword } = req.body;

    if (isOwnerTarget(id)) return denyOwner(res);

    const bcrypt = (await import('bcrypt')).default;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [updated] = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'کاربر یافت نشد', message: 'کاربر یافت نشد' });
    }

    // R3-02: password reset revokes the user's existing refresh tokens.
    bumpTokenVersion(id);
    logAudit(req, 'user.password.reset', 'user', id, { targetName: updated.name });
    res.json({ message: `رمز عبور کاربر ${updated.name} با موفقیت تغییر کرد` });
  } catch (error) {
    console.error('Admin password reset error:', error);
    res.status(500).json({ message: 'خطای سرور در تغییر رمز عبور کاربر' });
  }
});

router.put('/users/:id/role', validate(roleSchema), async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params as { id: string };

    if (isOwnerTarget(id)) return denyOwner(res);

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
    // R3-06: never echo the password hash back to the admin client.
    const { password: _pw, ...safeUser } = updated;
    res.json({ message: 'User role updated successfully', user: safeUser });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin modify VIP loyalty points for any user
router.put('/users/:id/points', validate(pointsSchema), async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { vipPoints } = req.body;

    if (isOwnerTarget(id)) return denyOwner(res);

    const [updated] = await db.update(users)
      .set({ vipPoints })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    logAudit(req, 'user.points.update', 'user', id, { vipPoints: updated.vipPoints, targetName: updated.name });
    res.json({ message: 'امتیاز VIP کاربر با موفقیت بروزرسانی شد', vipPoints: updated.vipPoints });
  } catch (error) {
    console.error('Admin update points error:', error);
    res.status(500).json({ message: 'خطای سرور در تغییر امتیاز کاربر' });
  }
});


export default router;
