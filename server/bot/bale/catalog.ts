/**
 * Category list, order-status map, review approval helper.
 * Split out of server/bot/bale.ts (body moved verbatim).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  products,
  productFeatures,
  orders,
  orderItems,
  cartItems,
  wishlistItems,
  reviews,
  coupons,
  contactMessages,
  storeSettings,
  users,
  auditLogs,
  newsletterSubscribers,
} from '../../db/schema.js';
import { appCache } from '../../utils/cache.js';
export const DEFAULT_CATEGORIES = [
  'قاب و کاور موبایل',
  'گلس و محافظ صفحه',
  'کابل و سیم',
  'شارژر و آداپتور',
  'هندزفری و ایرباد',
  'پاوربانک',
  'هولدر و نگهدارنده',
  'هدفون و هدست',
  'تبدیل و مبدل',
  'لوازم جانبی ساعت هوشمند',
  'لوازم گیمینگ موبایل',
  'لوازم جانبی خودرو',
];

export async function getStoreCategories(): Promise<string[]> {
  try {
    const rows = await db.selectDistinct({ category: products.category }).from(products);
    const fromDb = rows.map((r) => r.category).filter(Boolean) as string[];
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromDb]));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

// -------------------------------------------------------------
// Order Status Mapping
// -------------------------------------------------------------
export const ORDER_STATUS_MAP: Record<string, { label: string; text: string; icon: string }> = {
  pending_payment: { label: 'در انتظار پرداخت', text: 'در انتظار پرداخت', icon: '⏳' },
  processing: { label: 'در حال پردازش', text: 'در حال پردازش', icon: '🔄' },
  shipped: { label: 'ارسال شده', text: 'ارسال شده', icon: '🚚' },
  delivered: { label: 'تحویل داده شده', text: 'تحویل داده شده', icon: '✅' },
  cancelled: { label: 'لغو شده', text: 'لغو شده', icon: '❌' },
};

// -------------------------------------------------------------
// Review Rating Recomputation
// -------------------------------------------------------------
export async function setReviewApproval(reviewId: string, approved: boolean): Promise<boolean> {
  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
  if (!review) return false;

  await db.update(reviews).set({ approved }).where(eq(reviews.id, reviewId));

  if (review.productId) {
    const agg = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, review.productId), eq(reviews.approved, true)));
    const newRating = Math.round(Number(agg[0]?.avg) * 10) / 10;
    await db.update(products)
      .set({ rating: newRating, reviewsCount: Number(agg[0]?.count) || 0 })
      .where(eq(products.id, review.productId));
    appCache.invalidate(`reviews:${review.productId}`);
    appCache.invalidate(`product:${review.productId}`);
    appCache.invalidate('products');
  }
  appCache.invalidate('reviews:latest');
  return true;
}

// -------------------------------------------------------------
// Inline Keyboards
// -------------------------------------------------------------
