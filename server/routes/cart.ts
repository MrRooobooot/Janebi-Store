import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { cartItemSchema, updateCartItemSchema, idParamSchema } from '../validators/index.js';
import { db } from '../db/index.js';
import { cartItems, products } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Require auth for all cart routes
router.use(authenticate);

// Get cart
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  try {
    const items = await db.query.cartItems.findMany({
      where: eq(cartItems.userId, userId),
      with: {
        product: true
      }
    });
    
    // Format to match CartItem type in frontend
    const formattedCart = items.map(item => ({
      ...item.product,
      quantity: item.quantity,
      cartItemId: item.id
    }));
    
    res.json(formattedCart);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

// Add to cart
router.post('/', validate(cartItemSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const { productId, quantity = 1 } = req.body;

  try {
    // Check if product exists in cart
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))
    });

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, 10);
      await db.update(cartItems)
        .set({ quantity: newQty })
        .where(eq(cartItems.id, existing.id));
    } else {
      // Unique id: Date.now() alone can collide when the same user adds the
      // same product twice in the same millisecond (PK violation → 500).
      await db.insert(cartItems).values({
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        productId,
        quantity,
        addedAt: Math.floor(Date.now() / 1000)
      });
    }

    res.json({ message: 'محصول به سبد خرید اضافه شد' });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

// Update cart item quantity
router.put('/:id', validate(idParamSchema), validate(updateCartItemSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  // Here ID is product ID since frontend updates by product ID
  const productId = parseInt(req.params.id as string);
  const { quantity } = req.body;

  try {
    await db.update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
      
    res.json({ message: 'سبد خرید بروزرسانی شد' });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

// Remove from cart
router.delete('/:id', validate(idParamSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const productId = parseInt(req.params.id as string);

  try {
    await db.delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
      
    res.json({ message: 'محصول از سبد خرید حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

// Clear cart
router.delete('/', async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  try {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
    res.json({ message: 'سبد خرید خالی شد' });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

export default router;
