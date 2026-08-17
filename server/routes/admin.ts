import { Router } from 'express';
import { db } from '../db/index.js';
import { users, products, orders, reviews, coupons, productFeatures, cartItems, wishlistItems } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Apply middleware to all admin routes
router.use(authenticate, requireAdmin);

// ---------------------------------------------------------
// STATS & DASHBOARD
// ---------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = (await db.select({ count: sql<number>`count(*)` }).from(users))[0].count;
    const totalProducts = (await db.select({ count: sql<number>`count(*)` }).from(products))[0].count;
    
    // Total revenue (only for paid/processing/delivered orders)
    const revenueResult = await db.select({ total: sql<number>`sum(total)` }).from(orders).where(
      sql`status IN ('processing', 'shipped', 'delivered')`
    );
    const totalRevenue = revenueResult[0].total || 0;

    const totalOrders = (await db.select({ count: sql<number>`count(*)` }).from(orders))[0].count;

    // Status breakdown
    const allOrdersList = await db.select({ status: orders.status }).from(orders);
    const statusCounts: Record<string, number> = {
      pending_payment: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of allOrdersList) {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status]++;
      }
    }

    // Low stock products (stock <= 5)
    const lowStockProducts = await db.select().from(products).where(sql`stockQuantity <= 5`).limit(8);

    // Recent orders
    const recentOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.date)],
      limit: 6,
      with: { items: true }
    });

    res.json({
      metrics: {
        totalUsers,
        totalProducts,
        totalRevenue,
        totalOrders,
        lowStockCount: lowStockProducts.length
      },
      statusCounts,
      lowStockProducts,
      recentOrders
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// USERS MANAGEMENT
// ---------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.joinedDate)]
    });
    
    // Omit passwords
    const safeUsers = allUsers.map(u => {
      const { password, ...rest } = u;
      return rest;
    });

    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'نقش کاربر نامعتبر است', message: 'Invalid role' });
    }

    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: 'کاربر یافت نشد', message: 'User not found' });
    }
    res.json({ message: 'User role updated successfully', user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// PRODUCTS MANAGEMENT
// ---------------------------------------------------------
router.post('/products', async (req, res) => {
  try {
    const { title, category, price, originalPrice, discount, image, brand, warranty, description, stockQuantity, sku } = req.body;
    
    if (!title || !category || price === undefined) {
      return res.status(400).json({ message: 'Title, category, and price are required' });
    }

    const [inserted] = await db.insert(products).values({
      title,
      category,
      price: parseInt(price) || 0,
      originalPrice: originalPrice ? parseInt(originalPrice) : null,
      discount: discount ? parseInt(discount) : 0,
      image: image || '/placeholder.png',
      brand: brand || 'متفرقه',
      warranty: warranty || null,
      description: description || null,
      stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : 10,
      sku: sku || `SKU-${Date.now()}`
    }).returning();

    res.status(201).json(inserted);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'خطای سرور در ایجاد محصول' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, price, originalPrice, discount, image, brand, warranty, description, stockQuantity, sku } = req.body;
    
    const [updated] = await db.update(products).set({
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(price !== undefined && { price: parseInt(price) || 0 }),
      ...(originalPrice !== undefined && { originalPrice: originalPrice ? parseInt(originalPrice) : null }),
      ...(discount !== undefined && { discount: parseInt(discount) || 0 }),
      ...(image !== undefined && { image }),
      ...(brand !== undefined && { brand }),
      ...(warranty !== undefined && { warranty }),
      ...(description !== undefined && { description }),
      ...(stockQuantity !== undefined && { stockQuantity: parseInt(stockQuantity) || 0 }),
      ...(sku !== undefined && { sku })
    }).where(eq(products.id, parseInt(id))).returning();

    if (!updated) {
      return res.status(404).json({ error: 'محصول یافت نشد', message: 'محصول یافت نشد' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'خطای سرور در ویرایش محصول' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
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

    await db.transaction(async (tx) => {
      await tx.delete(productFeatures).where(eq(productFeatures.productId, prodId));
      await tx.delete(cartItems).where(eq(cartItems.productId, prodId));
      await tx.delete(wishlistItems).where(eq(wishlistItems.productId, prodId));
      await tx.delete(reviews).where(eq(reviews.productId, prodId));
      await tx.delete(products).where(eq(products.id, prodId));
    });

    res.json({ message: 'محصول با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: error.message || 'خطای سرور در حذف محصول' });
  }
});

// ---------------------------------------------------------
// ORDERS MANAGEMENT
// ---------------------------------------------------------
router.get('/orders', async (req, res) => {
  try {
    const allOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.date)],
      with: { items: true }
    });
    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در دریافت سفارشات' });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusText } = req.body;
    
    const allowedStatuses = ['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'وضعیت سفارش نامعتبر است', message: 'وضعیت سفارش نامعتبر است' });
    }

    const defaultStatusTexts: Record<string, string> = {
      pending_payment: 'در انتظار پرداخت',
      processing: 'در حال پردازش',
      shipped: 'ارسال شده',
      delivered: 'تحویل داده شده',
      cancelled: 'لغو شده'
    };
    const textToSet = statusText || defaultStatusTexts[status] || status;

    const [updated] = await db.update(orders)
      .set({ status, statusText: textToSet })
      .where(eq(orders.id, id))
      .returning();
      
    if (!updated) {
      return res.status(404).json({ error: 'سفارش یافت نشد', message: 'سفارش یافت نشد' });
    }
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در تغییر وضعیت سفارش' });
  }
});

// ---------------------------------------------------------
// COUPONS MANAGEMENT
// ---------------------------------------------------------
router.get('/coupons', async (req, res) => {
  try {
    const allCoupons = await db.select().from(coupons);
    res.json(allCoupons);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/coupons', async (req, res) => {
  try {
    const { code, percent, amount, minTotal, label, active } = req.body;
    if (!code || !label) {
      return res.status(400).json({ message: 'Code and label are required' });
    }

    const inserted = await db.insert(coupons).values({
      code: code.toUpperCase(),
      percent: percent ? parseInt(percent) : null,
      amount: amount ? parseInt(amount) : null,
      minTotal: minTotal ? parseInt(minTotal) : 0,
      label,
      active: active ?? true
    }).returning();

    res.status(201).json(inserted[0]);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/coupons/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();
    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.code, upperCode)
    });
    if (!existing) {
      return res.status(404).json({ error: 'کد تخفیف یافت نشد', message: 'Coupon not found' });
    }

    await db.delete(coupons).where(eq(coupons.code, upperCode));
    res.json({ message: 'کد تخفیف با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// CONTACT MESSAGES MANAGEMENT
// ---------------------------------------------------------
router.get('/contact-messages', async (req, res) => {
  try {
    const { contactMessages } = await import('../db/schema.js');
    const messages = await db.select().from(contactMessages);
    res.json(messages);
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/contact-messages/:id/status', async (req, res) => {
  try {
    const { contactMessages } = await import('../db/schema.js');
    const { id } = req.params;
    const { status } = req.body;

    if (!['unread', 'read', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.update(contactMessages)
      .set({ status })
      .where(eq(contactMessages.id, id));

    res.json({ success: true, message: 'وضعیت پیام بروزرسانی شد' });
  } catch (error) {
    console.error('Update contact message status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stockQuantity } = req.body;
    const prodId = parseInt(id);

    if (isNaN(prodId) || stockQuantity === undefined || isNaN(parseInt(stockQuantity))) {
      return res.status(400).json({ error: 'مقدار موجودی نامعتبر است' });
    }

    const [updated] = await db.update(products)
      .set({ stockQuantity: Math.max(0, parseInt(stockQuantity)) })
      .where(eq(products.id, prodId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در بروزرسانی موجودی' });
  }
});

router.put('/orders/:id/tracking', async (req, res) => {
  try {
    const { id } = req.params;
    const { refId } = req.body;

    const [updated] = await db.update(orders)
      .set({ refId: refId ? String(refId).trim() : null })
      .where(eq(orders.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'سفارش یافت نشد' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در ثبت کد رهگیری' });
  }
});

// ---------------------------------------------------------
// REVIEWS MANAGEMENT
// ---------------------------------------------------------
router.get('/reviews', async (req, res) => {
  try {
    const allReviews = await db.query.reviews.findMany({
      orderBy: [desc(reviews.date)],
      with: { product: true }
    });
    res.json(allReviews);
  } catch (error) {
    console.error('Fetch admin reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(reviews).where(eq(reviews.id, id));
    res.json({ success: true, message: 'نظر با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// NEWSLETTER MANAGEMENT
// ---------------------------------------------------------
router.get('/newsletter', async (req, res) => {
  try {
    const { newsletterSubscribers } = await import('../db/schema.js');
    const subscribers = await db.select().from(newsletterSubscribers);
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/newsletter/:email', async (req, res) => {
  try {
    const { newsletterSubscribers } = await import('../db/schema.js');
    const { email } = req.params;
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.toLowerCase()));
    res.json({ success: true, message: 'عضویت با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------------------------------------------------------
// STORE SETTINGS
// ---------------------------------------------------------
let storeSettings = {
  storeName: 'جانبی آرنا',
  phone: '۰۲۱-۸۸۸۸۹۹۹۹',
  email: 'info@janebi-arena.ir',
  supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
  address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
  freeShippingThreshold: 2000000,
  announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10'
};

router.get('/settings', (req, res) => {
  res.json(storeSettings);
});

router.put('/settings', (req, res) => {
  storeSettings = {
    ...storeSettings,
    ...req.body
  };
  res.json({ success: true, message: 'تنظیمات فروشگاه با موفقیت ذخیره شد', settings: storeSettings });
});

export default router;
