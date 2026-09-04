import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { wishlistItemSchema, numericIdParamSchema } from '../validators/index.js';
import { db } from '../db/index.js';
import { wishlistItems, products } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Require auth for all wishlist routes
router.use(authenticate);

// Get wishlist
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  try {
    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.userId, userId),
      with: {
        product: true
      }
    });
    
    // Format to match Product[] type in frontend
    const formattedWishlist = items.map(item => item.product);
    
    res.json(formattedWishlist);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

// Add to wishlist
router.post('/', validate(wishlistItemSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const { productId } = req.body;

  try {
    const existing = await db.query.wishlistItems.findFirst({
      where: and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId))
    });

    if (existing) {
      return res.json({ message: 'این محصول در لیست علاقه‌مندی‌ها وجود دارد' });
    }

    await db.insert(wishlistItems).values({
      id: `wish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      productId,
      addedAt: Math.floor(Date.now() / 1000)
    });

    res.json({ message: 'محصول به لیست علاقه‌مندی‌ها اضافه شد' });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

// Remove from wishlist
router.delete('/:id', validate(numericIdParamSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const productId = parseInt(req.params.id as string);

  try {
    await db.delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
      
    res.json({ message: 'محصول از لیست علاقه‌مندی‌ها حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

export default router;
