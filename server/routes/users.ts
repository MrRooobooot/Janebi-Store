import { Router } from 'express';
import bcrypt from 'bcrypt';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, updatePasswordSchema, addressSchema, idParamSchema } from '../validators/index.js';
import { db } from '../db/index.js';
import { users, addresses } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Require auth for all user routes
router.use(authenticate);

// Get current user profile
router.get('/me', async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    if (!user) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

router.put('/me', validate(updateProfileSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const { name, email, avatar } = req.body;

  try {
    const [updatedUser] = await db.update(users)
      .set({ 
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(avatar !== undefined && { avatar })
      })
      .where(eq(users.id, userId))
      .returning();

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ message: 'پروفایل با موفقیت بروزرسانی شد', user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

// Update user password
router.put('/me/password', validate(updatePasswordSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد', message: 'کاربر یافت نشد' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'کلمه عبور فعلی نادرست است', message: 'کلمه عبور فعلی نادرست است' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));

    res.json({ message: 'کلمه عبور با موفقیت به‌روزرسانی شد' });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور در به‌روزرسانی کلمه عبور', message: 'خطای سرور در به‌روزرسانی کلمه عبور' });
  }
});

// Addresses endpoints
router.get('/me/addresses', async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  try {
    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, userId)
    });
    res.json(userAddresses);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

// Alias for /addresses
router.get('/addresses', async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  try {
    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, userId)
    });
    res.json(userAddresses);
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور' });
  }
});

router.post('/me/addresses', validate(addressSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const { title, name, phone, province, city, address, postalCode } = req.body;

  try {
    const addressId = `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    // Check if this is the first address, make it default
    const existing = await db.query.addresses.findFirst({ where: eq(addresses.userId, userId) });
    const isDefault = existing ? false : true;

    const [newAddress] = await db.insert(addresses).values({
      id: addressId,
      userId,
      title,
      name,
      phone,
      province,
      city,
      address,
      postalCode,
      isDefault
    }).returning();

    res.status(201).json({ message: 'آدرس جدید با موفقیت افزوده شد', address: newAddress });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در افزودن آدرس' });
  }
});

router.put('/me/addresses/:id', validate(idParamSchema), validate(addressSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const addressId = req.params.id as string;
  const { title, name, phone, province, city, address, postalCode } = req.body;

  try {
    const [updated] = await db.update(addresses)
      .set({ title, name, phone, province, city, address, postalCode })
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();
      
    if (!updated) {
      return res.status(404).json({ error: 'آدرس مورد نظر یافت نشد', message: 'آدرس مورد نظر یافت نشد' });
    }
    res.json({ message: 'آدرس با موفقیت ویرایش شد', address: updated });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در ویرایش آدرس' });
  }
});

router.delete('/me/addresses/:id', validate(idParamSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const addressId = req.params.id as string;

  try {
    // Portable async transaction: works on both SQLite (queued by db wrapper)
    // and PostgreSQL. No sync .run()/.all() calls — those don't exist on the
    // PG dialect builders.
    const deleted = await db.transaction(async (tx) => {
      const targetList = await tx.select().from(addresses).where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
      const target = targetList[0];
      if (!target) {
        return null;
      }

      await tx.delete(addresses)
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

      if (target.isDefault) {
        const remainingList = await tx.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.id)).limit(1);
        if (remainingList.length > 0) {
          await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, remainingList[0].id));
        }
      }

      return target;
    });
      
    if (!deleted) {
      return res.status(404).json({ error: 'آدرس مورد نظر یافت نشد', message: 'آدرس مورد نظر یافت نشد' });
    }
    res.json({ message: 'آدرس با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور در حذف آدرس' });
  }
});

router.put('/me/addresses/:id/default', validate(idParamSchema), async (req: AuthRequest, res) => {
  const userId = req.user.id as string;
  const addressId = req.params.id as string;

  try {
    // Portable async transaction: works on both SQLite (queued by db wrapper)
    // and PostgreSQL. Concurrent txs are serialized by the db wrapper on SQLite,
    // so the multi-default race is impossible.
    const success = await db.transaction(async (tx) => {
      const targetList = await tx.select().from(addresses).where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
      const target = targetList[0];
      if (!target) {
        return false;
      }

      // Set all user addresses to not default
      await tx.update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));

      // Set the selected one to default
      await tx.update(addresses)
        .set({ isDefault: true })
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

      return true;
    });

    if (!success) {
      return res.status(404).json({ error: 'آدرس مورد نظر یافت نشد', message: 'آدرس مورد نظر یافت نشد' });
    }
    
    res.json({ message: 'آدرس پیش‌فرض با موفقیت تغییر کرد' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'خطای سرور در تغییر آدرس پیش‌فرض' });
  }
});

export default router;
