/**
 * Single authoritative source of truth for coupon calculation across client & server contracts.
 */

export interface CouponData {
  code: string;
  percent?: number | null;
  amount?: number | null;
  minTotal?: number | null;
  label?: string | null;
  usageLimit?: number | null;
  usedCount?: number | null;
}

/**
 * Calculates discount amount in Tomans based on coupon rules and subtotal.
 * Strict parity with server/routes/orders.ts & server/routes/coupons.ts.
 */
export function calculateCouponDiscount(
  coupon: CouponData | null | undefined,
  subtotal: number
): number {
  if (!coupon || !subtotal || subtotal <= 0) return 0;
  
  // Check minimum total requirement
  if (coupon.minTotal && subtotal < coupon.minTotal) {
    return 0;
  }

  // Usage limit exceeded check
  if (coupon.usageLimit != null && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
    return 0;
  }

  let discount = 0;
  if (coupon.percent) {
    discount = Math.round(subtotal * (coupon.percent / 100));
  } else if (coupon.amount) {
    discount = coupon.amount;
  }

  // Discount cannot exceed subtotal or be negative
  return Math.min(Math.max(0, discount), subtotal);
}
