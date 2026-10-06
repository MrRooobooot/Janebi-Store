// Single source of truth for category → Lucide icon mapping.
// Consumers: Home category circles, HeaderSearch popular categories.
// Match order matters: specific compound titles before generic substrings.
import {
  Layers, Headset, Car, PlugZap, Cable, Shield, Headphones, BatteryCharging,
  MonitorSmartphone, Watch, Gamepad2, Usb, ArrowRightLeft, Smartphone, Sparkles,
} from 'lucide-react';

/** Tinted plate so the mark reads on a white card. Same match order as the icon. */
export function getCategoryWell(title: string) {
  const t = (title || '').toLowerCase();
  const plate = (light: string, dark: string) =>
    `${light} border ${dark}`;
  if (t.includes('محافظ کابل') || t.includes('روکش')) {
    return plate('bg-sky-50 text-sky-800 border-sky-200/80', 'dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800/50');
  }
  if (t.includes('هدفون') || t.includes('هدست') || t.includes('هندزفری') || t.includes('ایرباد')) {
    return plate('bg-violet-50 text-violet-800 border-violet-200/80', 'dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800/50');
  }
  if (t.includes('خودرو')) {
    return plate('bg-orange-50 text-orange-800 border-orange-200/80', 'dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800/50');
  }
  if (t.includes('شارژ') || t.includes('آداپتور')) {
    return plate('bg-amber-50 text-amber-800 border-amber-200/80', 'dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/50');
  }
  if (t.includes('کابل') || t.includes('سیم')) {
    return plate('bg-sky-50 text-sky-800 border-sky-200/80', 'dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800/50');
  }
  if (t.includes('گلس') || t.includes('محافظ صفحه')) {
    return plate('bg-cyan-50 text-cyan-800 border-cyan-200/80', 'dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-800/50');
  }
  if (t.includes('پاوربانک') || t.includes('باتری')) {
    return plate('bg-emerald-50 text-emerald-800 border-emerald-200/80', 'dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800/50');
  }
  if (t.includes('هولدر') || t.includes('پایه') || t.includes('نگهدارنده')) {
    return plate('bg-rose-50 text-[var(--color-cta)] border-rose-200/80', 'dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800/50');
  }
  if (t.includes('ساعت')) {
    return plate('bg-indigo-50 text-indigo-800 border-indigo-200/80', 'dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800/50');
  }
  if (t.includes('گیم') || t.includes('بازی')) {
    return plate('bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/80', 'dark:bg-fuchsia-950/50 dark:text-fuchsia-200 dark:border-fuchsia-800/50');
  }
  if (t.includes('قاب') || t.includes('کاور')) {
    return plate('bg-rose-50 text-[var(--color-cta)] border-rose-200/80', 'dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800/50');
  }
  return plate('bg-rose-50 text-[var(--color-cta)] border-rose-200/70', 'dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-900/40');
}

export function getCategoryIcon(title: string) {
  if (!title) return Smartphone;
  const t = title.toLowerCase();
  if (t.includes('محافظ کابل') || t.includes('روکش')) return Layers;
  if (t.includes('هدفون') || t.includes('هدست')) return Headset;
  if (t.includes('خودرو')) return Car;
  if (t.includes('شارژ') || t.includes('آداپتور')) return PlugZap;
  if (t.includes('کابل') || t.includes('سیم')) return Cable;
  if (t.includes('گلس') || t.includes('محافظ صفحه')) return Shield;
  if (t.includes('هندزفری') || t.includes('ایرباد')) return Headphones;
  if (t.includes('پاوربانک') || t.includes('باتری')) return BatteryCharging;
  if (t.includes('هولدر') || t.includes('پایه') || t.includes('نگهدارنده')) return MonitorSmartphone;
  if (t.includes('ساعت')) return Watch;
  if (t.includes('گیم') || t.includes('بازی')) return Gamepad2;
  if (t.includes('دانگل') || t.includes('اتصال') || t.includes('مودم')) return Usb;
  if (t.includes('تبدیل') || t.includes('مبدل')) return ArrowRightLeft;
  if (t.includes('قاب') || t.includes('کاور')) return Smartphone;
  if (t.includes('لوازم جانبی') || t.includes('accessories')) return Sparkles;
  return Smartphone;
}
