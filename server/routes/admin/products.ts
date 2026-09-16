/**
 * Admin sub-router — Products: create, upsert, delete (cascade).
 * Mounted by server/routes/admin.ts after the router-wide authenticate+requireAdmin guard.
 */
import { Router } from 'express';
import { db } from '../../db/index.js';
import { products, orderItems, reviews, productFeatures, cartItems, wishlistItems } from '../../db/schema.js';
import { appCache } from '../../utils/cache.js';
import { eq, and } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { productCreateSchema, productUpsertSchema } from '../../validators/index.js';
import { logAudit } from './shared.js';

const router = Router();

// ---------------------------------------------------------
// PRODUCTS MANAGEMENT
// ---------------------------------------------------------
router.post('/products', validate(productCreateSchema), async (req, res) => {
  try {
    const { title, category, price, originalPrice, discount, image, brand, warranty, description, stockQuantity, sku, features } = req.body;

    const [inserted] = await db.insert(products).values({
      title,
      category,
      price,
      originalPrice: originalPrice ?? null,
      discount: discount ?? 0,
      image: image || '/placeholder.png',
      brand: brand || 'متفرقه',
      warranty: warranty || null,
      description: description || null,
      stockQuantity: stockQuantity !== undefined ? stockQuantity : 10,
      sku: sku || `SKU-${Date.now()}`
    }).returning();

    if (inserted && Array.isArray(features)) {
      const clean = features.map((f: string) => String(f).trim()).filter(Boolean).slice(0, 20);
      if (clean.length) {
        await db.transaction(async (tx) => {
          for (const feature of clean) {
            await tx.insert(productFeatures).values({ productId: inserted.id, feature });
          }
        });
      }
    }

    appCache.invalidate('product');
    appCache.invalidate('categories');
    logAudit(req, 'product.create', 'product', String(inserted.id), { title, category, price });
    res.status(201).json(inserted);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'خطای سرور در ایجاد محصول' });
  }
});

router.put('/products/:id', validate(productUpsertSchema), async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { title, category, price, originalPrice, discount, image, brand, warranty, description, stockQuantity, sku, features } = req.body;

    const [updated] = await db.update(products).set({
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(price !== undefined && { price }),
      ...(originalPrice !== undefined && { originalPrice: originalPrice ?? null }),
      ...(discount !== undefined && { discount: discount ?? 0 }),
      ...(image !== undefined && { image }),
      ...(brand !== undefined && { brand }),
      ...(warranty !== undefined && { warranty }),
      ...(description !== undefined && { description }),
      ...(stockQuantity !== undefined && { stockQuantity }),
      ...(sku !== undefined && { sku })
    }).where(eq(products.id, parseInt(id))).returning();

    if (!updated) {
      return res.status(404).json({ error: 'محصول یافت نشد', message: 'محصول یافت نشد' });
    }

    // Spec pills (product_features) ride the same edit: replace-all keeps the
    // admin form as the single source. Transactional delete+insert so a
    // partial write can't leave half a feature list.
    if (Array.isArray(features)) {
      const clean = features.map((f: string) => String(f).trim()).filter(Boolean).slice(0, 20);
      const prodId = parseInt(id);
      await db.transaction(async (tx) => {
        await tx.delete(productFeatures).where(eq(productFeatures.productId, prodId));
        for (const feature of clean) {
          await tx.insert(productFeatures).values({ productId: prodId, feature });
        }
      });
    }

    appCache.invalidate('product');
    appCache.invalidate('categories');
    logAudit(req, 'product.update', 'product', id, { title, category, price });
    res.json(updated);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'خطای سرور در ویرایش محصول' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const prodId = parseInt(id);

    if (isNaN(prodId)) {
      return res.status(400).json({ error: 'شناسه محصول نامعتبر است', message: 'شناسه محصول نامعتبر است' });
    }

    const existing = await db.query.products.findFirst({
      where: eq(products.id, prodId)
    });
    if (!existing) {
      return res.status(404).json({ error: 'محصول یافت نشد', message: 'محصول یافت نشد' });
    }

    // order_items.product_id is a NOT NULL FK (no cascade): a hard DELETE of any
    // product that was ever ordered aborts with "FOREIGN KEY constraint failed".
    // Refuse with an actionable message instead of a 500 + raw SQL error text.
    const ordered = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.productId, prodId))
      .limit(1);
    if (ordered.length > 0) {
      const msg = 'این محصول در سفارش‌های ثبت‌شده استفاده شده و برای حفظ سابقه خرید قابل حذف نیست. برای خارج کردن از فروش، موجودی را صفر کنید.';
      return res.status(409).json({ error: msg, message: msg, code: 'PRODUCT_IN_ORDERS' });
    }

    // Portable async transaction: works on both SQLite (queued by db wrapper)
    // and PostgreSQL.
    await db.transaction(async (tx) => {
      await tx.delete(productFeatures).where(eq(productFeatures.productId, prodId));
      await tx.delete(cartItems).where(eq(cartItems.productId, prodId));
      await tx.delete(wishlistItems).where(eq(wishlistItems.productId, prodId));
      await tx.delete(reviews).where(eq(reviews.productId, prodId));
      await tx.delete(products).where(eq(products.id, prodId));
    });

    appCache.invalidate('product');
    appCache.invalidate('categories');
    logAudit(req, 'product.delete', 'product', String(prodId), { title: existing.title });
    res.json({ message: 'محصول با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'خطای سرور در حذف محصول' });
  }
});


export default router;
