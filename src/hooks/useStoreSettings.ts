import { useEffect, useState } from 'react';
import { STORE_SETTINGS_DEFAULTS } from '../lib/constants';

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
