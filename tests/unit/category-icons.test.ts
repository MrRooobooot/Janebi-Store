import { describe, it, expect } from 'vitest';
import { getCategoryIcon, getCategoryWell } from '../../src/lib/categoryIcons';
import {
  Layers, Headset, Car, PlugZap, Cable, Shield, Headphones, BatteryCharging,
  MonitorSmartphone, Watch, Gamepad2, Usb, ArrowRightLeft, Smartphone, Sparkles,
} from 'lucide-react';

describe('categoryIcons — thematic mapping', () => {
  const cases: [string, any][] = [
    ['قاب و کاور موبایل', Smartphone],
    ['قاب و کاور', Smartphone],
    ['گلس و محافظ صفحه', Shield],
    ['گلس', Shield],
    ['کابل و سیم', Cable],
    ['کابل', Cable],
    ['شارژر و آداپتور', PlugZap],
    ['شارژر', PlugZap],
    ['هندزفری و ایرباد', Headphones],
    ['هندزفری', Headphones],
    ['هدفون و هدست', Headset],
    ['پاوربانک', BatteryCharging],
    ['هولدر و نگهدارنده', MonitorSmartphone],
    ['هولدر و پایه', MonitorSmartphone],
    ['تبدیل و مبدل', ArrowRightLeft],
    ['دانگل و تجهیزات اتصال', Usb],
    ['لوازم جانبی خودرو', Car],
    ['لوازم جانبی ساعت هوشمند', Watch],
    ['لوازم گیمینگ موبایل', Gamepad2],
    ['محافظ کابل', Layers],
  ];
  it.each(cases)('%s → thematic icon', (title, expected) => {
    expect(getCategoryIcon(title)).toBe(expected);
  });
  it('unknown title falls back to Smartphone', () => {
    expect(getCategoryIcon('دسته ناشناخته')).toBe(Smartphone);
    expect(getCategoryIcon('')).toBe(Smartphone);
  });

  it('gives category marks a tinted plate instead of the page canvas', () => {
    const titles = ['قاب و کاور موبایل', 'گلس و محافظ صفحه', 'کابل و سیم', 'شارژر و آداپتور', 'پاوربانک', 'هولدر و نگهدارنده'];
    const wells = titles.map((title) => getCategoryWell(title));
    for (const well of wells) {
      expect(well).not.toMatch(/slate-100|bg-white/);
      expect(well.startsWith('bg-')).toBe(true);
    }
    expect(new Set(wells).size).toBeGreaterThan(3);
  });
});
