import { describe, it, expect } from 'vitest';
import { getCategoryIcon } from '../../src/lib/categoryIcons';
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
});
