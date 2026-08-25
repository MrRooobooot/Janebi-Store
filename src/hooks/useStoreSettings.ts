import { useEffect, useState } from 'react';

export interface StoreSettings {
  storeName: string;
  phone: string;
  email: string;
  supportHours: string;
  address: string;
  freeShippingThreshold: number;
  announcement: string;
}

// Fallbacks mirror server/routes/settings.ts DEFAULTS — used until the
// fetch resolves or if it fails, so the UI never renders empty.
const FALLBACK: StoreSettings = {
  storeName: 'جانبی آرنا',
  phone: '۰۲۱-۸۸۸۸۹۹۹۹',
  email: 'info@janebi-arena.ir',
  supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
  address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
  freeShippingThreshold: 2_000_000,
  announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10',
};

let cache: StoreSettings | null = null;

/**
 * Public store settings from /api/settings (what the operator set in the
 * admin panel). Cached module-wide — one request per page load, shared by
 * every consumer (Header banner, Contact, ChatWidget, FreeShippingBar…).
 */
export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(cache ?? FALLBACK);

  useEffect(() => {
    if (cache) return;
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
