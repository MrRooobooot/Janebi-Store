import { Router } from 'express';
import { db } from '../db/index.js';
import { storeSettings } from '../db/schema.js';

const router = Router();

// Public store settings — safe fields only, no auth required.
// The admin PUT/GET live in admin.ts; this endpoint lets the storefront
// (Header banner, Contact page, ChatWidget, shipping threshold) display
// what the operator actually configured instead of hardcoded duplicates.
const SAFE_KEYS = [
  'storeName',
  'phone',
  'email',
  'supportHours',
  'address',
  'freeShippingThreshold',
  'announcement',
];

const DEFAULTS: Record<string, string> = {
  storeName: 'جانبی آرنا',
  phone: '۰۲۱-۸۸۸۸۹۹۹۹',
  email: 'info@janebi-arena.ir',
  supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
  address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
  freeShippingThreshold: '2000000',
  announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10',
};

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
    // Fail open with defaults so the site never breaks over a settings read.
    res.json({
      ...DEFAULTS,
      freeShippingThreshold: parseInt(DEFAULTS.freeShippingThreshold) || 0,
    });
  }
});

export default router;
