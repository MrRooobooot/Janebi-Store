import { useEffect, useState } from 'react';

export interface StoreSettings {
  storeName: string;
  phone: string;
  email: string;
  supportHours: string;
  address: string;
  freeShippingThreshold: number;
  announcement: string;
  heroSlide1Title?: string;
  heroSlide1Subtitle?: string;
  heroSlide1Link?: string;
  heroSlide1Badge?: string;
  heroSlide2Title?: string;
  heroSlide2Subtitle?: string;
  heroSlide2Link?: string;
  heroSlide2Badge?: string;
  heroSlide3Title?: string;
  heroSlide3Subtitle?: string;
  heroSlide3Link?: string;
  heroSlide3Badge?: string;
}

const FALLBACK: StoreSettings = {
  storeName: 'جانبی آرنا',
  phone: '۰۲۱-۸۸۸۸۹۹۹۹',
  email: 'info@janebi-arena.ir',
  supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
  address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
  freeShippingThreshold: 2_000_000,
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

let cache: StoreSettings | null = null;

export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(cache ?? FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && typeof data === 'object' && data.storeName) {
          cache = data as StoreSettings;
          setSettings(cache);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
