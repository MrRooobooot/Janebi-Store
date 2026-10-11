import { useEffect, useState } from 'react';
import { STORE_SETTINGS_DEFAULTS } from '../lib/constants';
import { getJson } from '../lib/jsonFetch';

interface StoreSettings {
  storeName: string;
  phone: string;
  email: string;
  supportHours: string;
  address: string;
  freeShippingThreshold: number;
  announcement: string;
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
    getJson<StoreSettings>('/api/settings')
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
