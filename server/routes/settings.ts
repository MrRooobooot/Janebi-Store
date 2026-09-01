import { Router } from 'express';
import { db } from '../db/index.js';
import { storeSettings } from '../db/schema.js';
import { STORE_SETTINGS_DEFAULTS } from '../../src/lib/constants.js';

const router = Router();

// Public store settings — safe fields only, no auth required.
// Safe keys are derived from the canonical shared defaults (single source of
// truth in src/lib/constants.ts) so admin-editable fields stay in lockstep.
// Hero slide imagery (audit §3.6) — previously hardcoded in the frontend.
// Defaults are the exact paths the live frontend falls back to, so the
// first render is visually identical; admins can now override per slide.
export const HERO_IMAGE_DEFAULTS: Record<string, string> = {
  heroSlide1Image: '/products/hld-13.svg',
  heroSlide2Image: '/products/cas-4.svg',
  heroSlide3Image: '/products/cbl-1.svg',
};

const SAFE_KEYS = [...Object.keys(STORE_SETTINGS_DEFAULTS), ...Object.keys(HERO_IMAGE_DEFAULTS)];

const DEFAULTS: Record<string, string> = { ...STORE_SETTINGS_DEFAULTS, ...HERO_IMAGE_DEFAULTS };

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
