import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { db } from '../db/index.js';
import { users, addresses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../env.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Generate tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, phone, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (existingUser) {
      return res.status(400).json({ message: 'کاربری با این شماره موبایل قبلا ثبت نام کرده است' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;
    const joinedDate = new Intl.DateTimeFormat("fa-IR").format(new Date());

    // Insert user
    await db.insert(users).values({
      id: userId,
      name,
      phone,
      password: hashedPassword,
      joinedDate,
      role: 'user',
      vipPoints: 0
    });

    const tokens = generateTokens(userId);

    res.status(201).json({
      message: 'ثبت نام با موفقیت انجام شد',
      user: { id: userId, name, phone, role: 'user', addresses: [] },
      ...tokens
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'خطای سرور' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { phone, password } = req.body;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (!user) {
      return res.status(401).json({ message: 'شماره موبایل یا رمز عبور اشتباه است' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'شماره موبایل یا رمز عبور اشتباه است' });
    }

    const tokens = generateTokens(user.id);
    const { password: _, ...userWithoutPassword } = user;

    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, user.id)
    });

    res.json({
      message: 'ورود با موفقیت انجام شد',
      user: { ...userWithoutPassword, addresses: userAddresses },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'خطای سرور' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const userAddresses = await db.query.addresses.findMany({
    where: eq(addresses.userId, req.user.id)
  });
  res.json({ user: { ...req.user, addresses: userAddresses } });
});
// OTP Storage (In-memory for development/single-instance)
const otpStore = new Map<string, { code: string, expires: number }>();

router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^09\d{9}$/.test(phone)) {
    return res.status(400).json({ message: 'شماره موبایل نامعتبر است' });
  }

  // Generate 5-digit OTP
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  const expires = Date.now() + 2 * 60 * 1000; // 2 minutes

  otpStore.set(phone, { code, expires });

  // Simulate sending SMS
  console.log(`[SMS MOCK] Sending OTP ${code} to ${phone}`);

  res.json({ message: 'کد تایید ارسال شد' });
});

router.post('/verify-otp', async (req, res) => {
  const { phone, code, name } = req.body;
  
  const record = otpStore.get(phone);
  if (!record || record.code !== code || Date.now() > record.expires) {
    return res.status(400).json({ message: 'کد تایید نامعتبر یا منقضی شده است' });
  }

  // Clear OTP
  otpStore.delete(phone);

  try {
    let user = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (!user) {
      // Register new user
      const userId = `usr-${Date.now()}`;
      const joinedDate = new Intl.DateTimeFormat("fa-IR").format(new Date());
      await db.insert(users).values({
        id: userId,
        name: name || 'کاربر جدید',
        phone,
        password: '', // No password needed for OTP
        joinedDate,
        role: 'user',
        vipPoints: 0
      });
      user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    }

    const tokens = generateTokens(user!.id);
    const { password: _, ...userWithoutPassword } = user!;

    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, user!.id)
    });

    res.json({
      message: 'ورود با موفقیت انجام شد',
      user: { ...userWithoutPassword, addresses: userAddresses },
      ...tokens
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'خطای سرور' });
  }
});

router.post('/reset-password-otp', async (req, res) => {
  const { phone, code, newPassword } = req.body;
  if (!phone || !code || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ message: 'اطلاعات وارد شده ناقص یا رمز عبور کمتر از ۴ کاراکتر است' });
  }

  const record = otpStore.get(phone);
  if (!record || record.code !== code || Date.now() > record.expires) {
    return res.status(400).json({ message: 'کد تایید نامعتبر یا منقضی شده است' });
  }

  otpStore.delete(phone);

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (!user) {
      return res.status(404).json({ message: 'کاربری با این شماره یافت نشد' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

    res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت. اکنون می‌توانید وارد شوید.' });
  } catch (error) {
    console.error('Reset password OTP error:', error);
    res.status(500).json({ message: 'خطای سرور در تغییر رمز عبور' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'توکن نامعتبر است' });

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
    const tokens = generateTokens(decoded.userId);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ message: 'توکن منقضی شده است. لطفا مجددا وارد شوید' });
  }
});

export default router;
