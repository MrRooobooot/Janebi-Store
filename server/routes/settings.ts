import { Router } from 'express';
import { db } from '../db/index.js';
import { storeSettings } from '../db/schema.js';

const router = Router();

// Public store settings — safe fields only, no auth required.
const SAFE_KEYS = [
  'storeName',
  'phone',
  'email',
  'supportHours',
  'address',
  'freeShippingThreshold',
  'announcement',
  'heroSlide1Title',
  'heroSlide1Subtitle',
  'heroSlide1Link',
  'heroSlide1Badge',
  'heroSlide2Title',
  'heroSlide2Subtitle',
  'heroSlide2Link',
  'heroSlide2Badge',
  'heroSlide3Title',
  'heroSlide3Subtitle',
  'heroSlide3Link',
  'heroSlide3Badge',
];

const DEFAULTS: Record<string, string> = {
  storeName: 'جانبی آرنا',
  phone: '۰۲۱-۸۸۸۸۹۹۹۹',
  email: 'info@janebi-arena.ir',
  supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
  address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
  freeShippingThreshold: '2000000',
  announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10',
  heroSlide1Title: 'فست‌شارژهای هوشمند با محافظت ولتاژ',
  heroSlide1Subtitle: 'شارژرهای اورجینال انکر، باسئوس و مک‌دودو مجهز به فناوری GaN و قطع‌کن خودکار برای سلامت باتری گوشی',
  heroSlide1Link: '/products?category=شارژر',
  heroSlide1Badge: 'گارانتی تعویض ۶ ماهه',
  heroSlide2Title: 'کاورهای مگ‌سیف و گلس‌های ضدضربه سوپردی',
  heroSlide2Subtitle: 'تنوع بی‌نظیر قاب‌های ضدضربه، شفاف و چرمی سازگار با شارژ بیسیم برای تمامی مدل‌های آیفون، سامسونگ و شیائومی',
  heroSlide2Link: '/products?category=قاب و کاور',
  heroSlide2Badge: 'تست فیزیکی قبل از ارسال',
  heroSlide3Title: 'ایرپادها و هندزفری‌های مجهز به نویز کنسلینگ',
  heroSlide3Subtitle: 'مکالمه بدون نویز محیطی، درایورهای بیس تقویت‌شده و ماندگاری باتری تا ۳۰ ساعت برای مکالمه و موسیقی',
  heroSlide3Link: '/products?category=هندزفری',
  heroSlide3Badge: 'مهلت تست ۷ روزه',
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
    res.json({
      ...DEFAULTS,
      freeShippingThreshold: parseInt(DEFAULTS.freeShippingThreshold) || 0,
    });
  }
});

export default router;
