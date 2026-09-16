/**
 * Admin sub-router — Store settings (persisted) + cache invalidation.
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { storeSettings } from '../../db/schema.js';
import { appCache } from '../../utils/cache.js';
import { STORE_SETTINGS_DEFAULTS } from '../../../src/lib/constants.js';
import { HERO_IMAGE_DEFAULTS } from '../settings.js';
import { and } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { settingsSchema } from '../../validators/index.js';
import { logAudit } from './shared.js';

const router = Router();

// ---------------------------------------------------------
// STORE SETTINGS — persisted in the store_settings table so
// they survive container restarts (previously RAM-only).
// ---------------------------------------------------------
// Admin-editable settings allow-list — derived from the canonical shared
// defaults (src/lib/constants.ts), so hero-slide fields are editable too and
// no literals drift between admin, public GET and client fallback.
// Hero image keys (audit §3.6) come from the shared server-side defaults.
const DEFAULT_SETTINGS: Record<string, string> = {
  ...STORE_SETTINGS_DEFAULTS,
  ...HERO_IMAGE_DEFAULTS,
};

router.get('/settings', async (req, res) => {
  try {
    const rows = await db.select().from(storeSettings);
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) merged[row.key] = row.value;
    // freeShippingThreshold stays numeric for API compatibility.
    res.json({ ...merged, freeShippingThreshold: parseInt(merged.freeShippingThreshold) || 0 });
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/settings', validate(settingsSchema), async (req, res) => {
  try {
    const body = req.body || {};
    // Accept only known keys and only string values (hero image fields are
    // asset paths/URLs; anything non-string is rejected rather than coerced).
    const updates = Object.entries(body).filter(
      ([key, value]) => key in DEFAULT_SETTINGS && typeof value === 'string'
    );
    if (updates.length === 0) {
      return res.status(400).json({ message: 'هیچ فیلد معتبری برای ذخیره ارسال نشده است' });
    }

    for (const [key, value] of updates) {
      await db.insert(storeSettings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({ target: storeSettings.key, set: { value: String(value) } });
    }

    // Bust any server-side cached settings (e.g. memoized public GET wrappers)
    // so admin edits are visible immediately, not stale.
    appCache.invalidate('settings');
    logAudit(req, 'settings.update', 'settings', null, { keys: updates.map(([key]) => key) });

    const rows = await db.select().from(storeSettings);
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) merged[row.key] = row.value;

    res.json({
      success: true,
      message: 'تنظیمات فروشگاه با موفقیت ذخیره شد',
      settings: { ...merged, freeShippingThreshold: parseInt(merged.freeShippingThreshold) || 0 }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'خطای سرور در ذخیره تنظیمات' });
  }
});

export default router;
