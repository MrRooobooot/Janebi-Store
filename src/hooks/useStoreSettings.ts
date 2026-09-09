import { useEffect, useState } from 'react';
import { STORE_SETTINGS_DEFAULTS } from '../lib/constants';

interface StoreSettings {
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
  heroSlide1Image?: string;
  heroSlide2Image?: string;
  heroSlide3Image?: string;
  announcementBarEnabled?: string;
  dealsTitle?: string;
  dealsSubtitle?: string;
  b2bTitle?: string;
  b2bDesc?: string;
  b2bLink?: string;
  b2bButtonText?: string;
  vipBadge?: string;
  vipTitle?: string;
  vipSubtitle?: string;
  vipCouponCode?: string;
  valueProp1Title?: string;
  valueProp1Desc?: string;
  valueProp2Title?: string;
  valueProp2Desc?: string;
  valueProp3Title?: string;
  valueProp3Desc?: string;
  valueProp4Title?: string;
  valueProp4Desc?: string;
  heroSlide1Tag?: string;
  heroSlide2Tag?: string;
  heroSlide3Tag?: string;
  heroSlide1ButtonText?: string;
  heroSlide2ButtonText?: string;
  heroSlide3ButtonText?: string;
}

// Client fallback derived from the canonical shared defaults (single source of
// truth in src/lib/constants.ts, also consumed by the server). Only the
// numeric threshold is converted at the API boundary.
const FALLBACK: StoreSettings = {
  ...STORE_SETTINGS_DEFAULTS,
  freeShippingThreshold: parseInt(STORE_SETTINGS_DEFAULTS.freeShippingThreshold) || 0,
} as StoreSettings;

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
