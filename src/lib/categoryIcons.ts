// Single source of truth for category → Lucide icon mapping.
// Consumers: Home category circles, HeaderSearch popular categories.
// Match order matters: specific compound titles before generic substrings.
import {
  Layers, Headset, Car, PlugZap, Cable, Shield, Headphones, BatteryCharging,
  MonitorSmartphone, Watch, Gamepad2, Usb, ArrowRightLeft, Smartphone, Sparkles,
} from 'lucide-react';

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
