import { describe, it, expect } from 'vitest';
import { calculateCouponDiscount, CouponData } from '../../src/lib/coupon';

describe('calculateCouponDiscount - Authoritative calculations', () => {
  it('returns 0 when no coupon is provided or cart is empty/negative', () => {
    expect(calculateCouponDiscount(null, 100000)).toBe(0);
    expect(calculateCouponDiscount(undefined, 100000)).toBe(0);
    expect(calculateCouponDiscount({ code: 'OFF20', percent: 20 }, 0)).toBe(0);
    expect(calculateCouponDiscount({ code: 'OFF20', percent: 20 }, -50000)).toBe(0);
  });

  it('calculates valid percentage coupon accurately', () => {
    const coupon: CouponData = { code: 'OFF20', percent: 20, minTotal: 50000 };
    expect(calculateCouponDiscount(coupon, 100000)).toBe(20000);
    expect(calculateCouponDiscount(coupon, 250000)).toBe(50000);
  });

  it('calculates valid fixed amount coupon accurately', () => {
    const coupon: CouponData = { code: 'FIXED30', amount: 30000, minTotal: 50000 };
    expect(calculateCouponDiscount(coupon, 100000)).toBe(30000);
  });

  it('enforces minTotal threshold', () => {
    const coupon: CouponData = { code: 'MIN150', percent: 10, minTotal: 150000 };
    expect(calculateCouponDiscount(coupon, 100000)).toBe(0);
    expect(calculateCouponDiscount(coupon, 150000)).toBe(15000);
    expect(calculateCouponDiscount(coupon, 200000)).toBe(20000);
  });

  it('enforces usage limit and prevents discount if exhausted', () => {
    const activeCoupon: CouponData = { code: 'CAP10', percent: 15, usageLimit: 10, usedCount: 9 };
    expect(calculateCouponDiscount(activeCoupon, 100000)).toBe(15000);

    const fullCoupon: CouponData = { code: 'CAP10', percent: 15, usageLimit: 10, usedCount: 10 };
    expect(calculateCouponDiscount(fullCoupon, 100000)).toBe(0);

    const overCoupon: CouponData = { code: 'CAP10', percent: 15, usageLimit: 10, usedCount: 11 };
    expect(calculateCouponDiscount(overCoupon, 100000)).toBe(0);
  });

  it('clamps discount so it never exceeds cart total', () => {
    const hugeFixedCoupon: CouponData = { code: 'HUGE500', amount: 500000 };
    expect(calculateCouponDiscount(hugeFixedCoupon, 100000)).toBe(100000);

    const full100Coupon: CouponData = { code: 'FULL100', percent: 100 };
    expect(calculateCouponDiscount(full100Coupon, 120000)).toBe(120000);
  });
});
