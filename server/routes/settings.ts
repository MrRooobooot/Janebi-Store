import { Router } from 'express';
import { db } from '../db/index.js';
import { storeSettings } from '../db/schema.js';
import { STORE_SETTINGS_DEFAULTS } from '../../src/lib/constants.js';

const router = Router();

// Public store settings — safe fields only, no auth required.
// Safe keys are derived from the canonical shared defaults (single source of
// truth in src/lib/constants.ts) so admin-editable fields stay in lockstep.
const SAFE_KEYS = Object.keys(STORE_SETTINGS_DEFAULTS);

const DEFAULTS: Record<string, string> = STORE_SETTINGS_DEFAULTS;

router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(storeSettings);
    const merged: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      if (SAFE_KEYS.includes(row.key)) merged[row.key] = row.value;
    }
    res.json({
      ...merged,
      freeShippingThreshold: parseInt(merged.freeShippingThreshold) || 0,
    });
  } catch (error) {
    console.error('Public settings error:', error);
    res.json({
      ...DEFAULTS,
      freeShippingThreshold: parseInt(DEFAULTS.freeShippingThreshold) || 0,
    });
  }
});

export default router;
