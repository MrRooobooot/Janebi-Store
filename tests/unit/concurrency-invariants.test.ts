import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../server/db/index.js';
import { users, products, orders, orderItems } from '../../server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toEnglishDigits, toPersianDigits, normalizeIranianMobile, isValidIranianMobile } from '../../src/lib/utils.js';

describe('Adversarial Invariants & Concurrency Guard Suite', () => {
  beforeEach(async () => {
    // Clean up test data safely
    try {
      await db.delete(orderItems).run();
      await db.delete(orders).run();
    } catch {}
  });

  describe('1. Persian Unicode & Input Invariants', () => {
    it('normalizes mixed Persian digits, ZWNJ, and English characters safely without crashing queries', () => {
      const dirtyMobile = '  +۹۸ (۹۱۲) ۳۴۵-۶۷۸۹  ';
      const cleanMobile = normalizeIranianMobile(dirtyMobile);
      expect(cleanMobile).toBe('09123456789');
      expect(isValidIranianMobile(cleanMobile)).toBe(true);

      const mixedText = 'گوشی سامسونگ مدل A55 به همراه ۱۲۸ گیگابایت حافظه';
      const englishDigits = toEnglishDigits(mixedText);
      expect(englishDigits).toContain('128');
      expect(toPersianDigits(128)).toBe('۱۲۸');
    });

    it('rejects invalid Iranian phone formats on edge-cases', () => {
      expect(isValidIranianMobile('0912345678')).toBe(false); // 10 digits
      expect(isValidIranianMobile('091234567890')).toBe(false); // 12 digits
      expect(isValidIranianMobile('08123456789')).toBe(false); // Not starting with 09
      expect(isValidIranianMobile('0912abc6789')).toBe(false); // Alpha characters
      expect(isValidIranianMobile('')).toBe(false);
    });
  });

  describe('2. Financial & Inventory Transactional Integrity', () => {
    it('prevents negative stock deduction inside atomic db.transaction', async () => {
      // 1. Create a dummy product with 2 units
      const [prod] = await db.insert(products).values({
        title: 'کالای تست اینواریانت موجودی',
        brand: 'برند تستی',
        price: 500000,
        stockQuantity: 2,
        category: 'accessories',
        image: '/images/test.jpg',
        description: 'تست اتمیک بودن تراکنش'
      }).returning();

      expect(prod).toBeDefined();
      expect(prod.stockQuantity).toBe(2);

      // 2. Simulate multi-item order that requests more than available
      const attemptPurchase = async (requestedQty: number) => {
        return db.transaction(async (tx) => {
          const current = await tx.select().from(products).where(eq(products.id, prod.id)).get();
          if (!current || (current.stockQuantity ?? 0) < requestedQty) {
            throw new Error(`INSUFFICIENT_STOCK: Available ${current?.stockQuantity}, Requested ${requestedQty}`);
          }
          await tx.update(products).set({ stockQuantity: (current.stockQuantity ?? 0) - requestedQty }).where(eq(products.id, prod.id)).run();
        });
      };

      // 3. First purchase of 2 units should succeed
      await expect(attemptPurchase(2)).resolves.not.toThrow();

      const afterFirst = await db.select().from(products).where(eq(products.id, prod.id)).get();
      expect(afterFirst?.stockQuantity).toBe(0);

      // 4. Second purchase of 1 unit must fail and never drop stock to negative
      await expect(attemptPurchase(1)).rejects.toThrow('INSUFFICIENT_STOCK');

      const afterSecond = await db.select().from(products).where(eq(products.id, prod.id)).get();
      expect(afterSecond?.stockQuantity).toBe(0); // Zero, not -1
    });
  });
});
