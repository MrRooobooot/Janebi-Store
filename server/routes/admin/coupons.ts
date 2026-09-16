/**
 * Admin sub-router — Coupons: list, create, upsert, delete.
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { coupons } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { couponCreateSchema, couponUpsertSchema } from '../../validators/index.js';
import { pageParams, setTotalCountHeader, logAudit } from './shared.js';

const router = Router();

// ---------------------------------------------------------
// COUPONS MANAGEMENT
// ---------------------------------------------------------
router.get('/coupons', async (req, res) => {
  try {
    const { limit, offset } = pageParams(req);
    const couponQuery = db.select().from(coupons);
    const allCoupons = limit !== null ? await couponQuery.limit(limit).offset(offset) : await couponQuery;
    await setTotalCountHeader(res, coupons);
    res.json(allCoupons);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/coupons', validate(couponCreateSchema), async (req, res) => {
  try {
    const { code, percent, amount, minTotal, label, active, usageLimit, expiresAt } = req.body;

    if (percent && amount) {
      return res.status(400).json({ message: 'فقط یکی از درصد یا مبلغ تخفیف مجاز است' });
    }

    const upperCode = String(code).toUpperCase();
    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, upperCode) });
    if (existing) {
      return res.status(409).json({ message: 'این کد تخفیف قبلاً ثبت شده است' });
    }

    const inserted = await db.insert(coupons).values({
      code: upperCode,
      percent: percent ?? null,
      amount: amount ?? null,
      minTotal: minTotal ?? 0,
      label,
      active: active ?? true,
      usageLimit: usageLimit ?? null,
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
router.put('/coupons/:code', validate(couponUpsertSchema), async (req, res) => {
  try {
    const upperCode = String(req.params.code).toUpperCase();
    const { percent, amount, minTotal, label, active, usageLimit, expiresAt } = req.body;

    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, upperCode) });
    if (!existing) {
      return res.status(404).json({ error: 'کد تخفیف یافت نشد', message: 'Coupon not found' });
    }

    if (percent !== undefined && amount !== undefined && percent !== null && amount !== null) {
      return res.status(400).json({ message: 'فقط یکی از درصد یا مبلغ تخفیف مجاز است' });
    }

    const [updated] = await db.update(coupons).set({
      ...(percent !== undefined && { percent: percent === null ? null : percent }),
      ...(amount !== undefined && { amount: amount === null ? null : amount }),
      ...(minTotal !== undefined && { minTotal: minTotal ?? 0 }),
      ...(label !== undefined && { label }),
      ...(active !== undefined && { active: Boolean(active) }),
      ...(usageLimit !== undefined && { usageLimit: usageLimit === null ? null : usageLimit }),
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


export default router;
