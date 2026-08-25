// Single source of truth for store-wide commerce constants.
// Imported by BOTH server and client — never duplicate these numbers elsewhere.

/** Orders at/above this subtotal ship free (server enforces; client displays). */
export const FREE_SHIPPING_THRESHOLD = 2_000_000; // Toman

/** Shipping fees in Toman. Server is authoritative — client must mirror exactly. */
export const SHIPPING_FEES = {
  express: 50_000, // پست پیشتاز
  standard: 35_000, // پست سفارشی
} as const;

export const MAX_CART_QUANTITY = 99;
