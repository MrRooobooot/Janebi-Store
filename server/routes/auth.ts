import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, otpSendSchema, otpVerifySchema, resetPasswordSchema } from "../validators/index.js";
import { db } from "../db/index.js";
import { users, addresses } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { env } from "../env.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { setAuthCookies, clearAuthCookies, parseCookies } from "../utils/cookies.js";

const router = Router();

// Generate tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: "1d" });
  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};

router.post("/register", validate(registerSchema), async (req, res) => {
  const { name, phone, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (existingUser) {
      return res.status(400).json({ message: "کاربری با این شماره موبایل قبلا ثبت نام کرده است" });
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
      role: "user",
      vipPoints: 0
    });

    const tokens = generateTokens(userId);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, env.NODE_ENV === "production");

    res.status(201).json({
      message: "ثبت نام با موفقیت انجام شد",
      user: { id: userId, name, phone, role: "user", addresses: [] },
      ...tokens
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "خطای سرور" });
  }
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const { phone, password } = req.body;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (!user) {
      return res.status(401).json({ message: "شماره موبایل یا رمز عبور اشتباه است" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "شماره موبایل یا رمز عبور اشتباه است" });
    }

    const tokens = generateTokens(user.id);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, env.NODE_ENV === "production");

    const { password: _, mustChangePassword, ...userWithoutPassword } = user;

    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, user.id)
    });

    res.json({
      message: "ورود با موفقیت انجام شد",
      user: { ...userWithoutPassword, addresses: userAddresses },
      // Admin first-login gate: frontend redirects to the forced
      // change-password screen when this is true.
      mustChangePassword: Boolean(mustChangePassword),
      ...tokens
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "خطای سرور" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const refreshToken = cookies.refreshToken || (req.body && req.body.refreshToken);

    if (!refreshToken) {
      // Anonymous visitor: not an error. 200 keeps the browser console clean
      // while boot-time refresh probes for a session that doesn't exist yet.
      return res.status(200).json({ authenticated: false });
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as any;
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Invalid refresh token payload" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId)
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const tokens = generateTokens(user.id);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, env.NODE_ENV === "production");

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: "Token refreshed successfully",
      user: { ...userWithoutPassword, mustChangePassword: Boolean(userWithoutPassword.mustChangePassword) },
      ...tokens
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

router.post("/logout", (req, res) => {
  clearAuthCookies(res, env.NODE_ENV === "production");
  res.json({ message: "با موفقیت خارج شدید" });
});

// Forgot-password: verify the same OTP used for login, then set a new
// password. Reuses otpStore (send via /otp/send first). Rate-limited by
// the OTP attempts counter; single-use because verification deletes the code.
router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  // Reset-by-OTP reuses the SMS OTP, so it is unavailable whenever OTP is.
  if (otpUnavailable()) {
    return res.status(503).json({ error: "سرویس پیامکی فعال نیست" });
  }
  const { phone, code, newPassword } = req.body;

  const entry = otpStore.get(phone);
  if (!entry) {
    return res.status(400).json({ message: "کد تاییدی برای این شماره ثبت نشده است یا منقضی شده. ابتدا کد دریافت کنید." });
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ message: "کد تایید منقضی شده است. لطفاً مجدداً درخواست دهید." });
  }
  if (entry.attempts >= 5) {
    otpStore.delete(phone);
    return res.status(429).json({ message: "تعداد دفعات اشتباه بیش از حد مجاز بود. کد جدید دریافت کنید." });
  }
  if (entry.code !== code) {
    entry.attempts++;
    return res.status(400).json({ message: "کد تایید وارد شده نامعتبر است" });
  }

  try {
    const user = await db.query.users.findFirst({ where: eq(users.phone, phone) });
    if (!user) {
      // Don't reveal whether the account exists — generic message.
      otpStore.delete(phone);
      return res.status(400).json({ message: "کد تایید وارد شده نامعتبر است" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

    otpStore.delete(phone); // single-use

    res.json({ message: "رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "خطای سرور در تغییر رمز عبور" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const userAddresses = await db.query.addresses.findMany({
    where: eq(addresses.userId, req.user.id)
  });
  res.json({
    user: {
      ...req.user,
      mustChangePassword: Boolean(req.user.mustChangePassword),
      addresses: userAddresses
    }
  });
});
// In-memory OTP Store with automatic cleanup
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpEntry>();

// Periodic cleanup of expired OTPs to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) {
      otpStore.delete(phone);
    }
  }
}, 5 * 60 * 1000).unref();

// OTP delivery is only enabled when an SMS provider is configured. In dev/test
// a simulator logs the code; in production without credentials the whole OTP
// flow (send/verify/reset) is hard-disabled so users never hit an undeliverable
// flow.
// Read dynamically (not module-load consts) so tests can toggle env and prod
// picks up config at request time.
const providerConfigured = () => Boolean(env.SMS_API_KEY) || Boolean(env.SMS_PROVIDER);
// '123456' is the SMS.ir docs placeholder template, not a real one. Real
// dispatch requires a configured template ID; otherwise OTP stays gracefully
// disabled in production (dev uses the simulator).
const smsProviderEnabled = () => providerConfigured();
const smsTemplateIdConfigured = () =>
  Boolean(env.SMS_TEMPLATE_ID) && env.SMS_TEMPLATE_ID !== "123456";
const otpUnavailable = () => !providerConfigured() && env.NODE_ENV === "production";

router.get("/otp/status", (_req, res) => {
  res.json({ enabled: smsProviderEnabled() || env.NODE_ENV !== "production" });
});

router.post("/otp/send", validate(otpSendSchema), async (req, res) => {
  if (otpUnavailable()) {
    return res.status(503).json({ error: "سرویس پیامکی فعال نیست" });
  }
  const { phone } = req.body;
  
  // Rate limit OTP requests per phone
  const existing = otpStore.get(phone);
  if (existing && Date.now() < existing.expiresAt && existing.expiresAt - Date.now() > 60 * 1000) {
    return res.status(429).json({
      message: "کد تایید اخیراً ارسال شده است. لطفاً کمی صبر کنید.",
      retryAfter: Math.ceil((existing.expiresAt - Date.now() - 60 * 1000) / 1000)
    });
  }

  // Cryptographically secure 5-digit OTP
  const code = crypto.randomInt(10000, 100000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes — operator SMS delivery
  // can lag 2-6min; a 2min TTL expired before the SMS arrived (2026-09-06 incident).

  otpStore.set(phone, { code, expiresAt, attempts: 0 });

  // Dispatch OTP via SMS.ir verify API. Real dispatch requires BOTH a real
  // API key AND a real template ID — the literal '123456' is the documented
  // placeholder, not a real template. When config is incomplete we fall back
  // to the previous behavior (dev simulator / graceful no-send in prod) so
  // users never hit a 502 from a misconfigured template. Never leak the code.
  if (env.SMS_API_KEY && smsTemplateIdConfigured()) {
    try {
      const smsRes = await fetch("https://api.sms.ir/v1/send/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.SMS_API_KEY,
        },
        body: JSON.stringify({
          mobile: phone.replace(/^0/, ""), // sms.ir expects 9xxxxxxxxx
          templateId: Number(env.SMS_TEMPLATE_ID),
          parameters: [
            { name: "Code", value: code },
            // Template «کد تایید شما: #CODE# / اعتبار این کد تا #TIME# است.»
            // (id from panel) includes an expiry line — send the local expiry
            // so the SMS matches the server-side TTL (5 minutes).
            { name: "Time", value: "۵ دقیقه" },
          ],
        }),
        signal: AbortSignal.timeout(8000),
      });
      const smsData = (await smsRes.json()) as { status?: number; message?: string };
      if (!smsRes.ok || smsData.status !== 1) {
        console.error(`[SMS.ir] OTP dispatch failed: ${smsData?.status} ${smsData?.message}`);
        otpStore.delete(phone);
        return res.status(502).json({ error: "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید." });
      }
    } catch (err) {
      console.error("[SMS.ir] OTP dispatch error:", err);
      otpStore.delete(phone);
      return res.status(502).json({ error: "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید." });
    }
  } else {
    if (env.SMS_API_KEY && !smsTemplateIdConfigured()) {
      console.warn("[SMS.ir] SMS_TEMPLATE_ID missing/placeholder — OTP not dispatched via provider");
    }
    if (env.NODE_ENV !== "production") {
      console.log(`[SMS Simulator] OTP Code for ${phone}: ${code}`);
    }
  }

  res.json({
    message: "کد تایید با موفقیت ارسال شد",
    expiresIn: 300,
    ...(env.NODE_ENV !== "production" ? { debugCode: code } : {})
  });
});

router.post("/otp/verify", validate(otpVerifySchema), async (req, res) => {
  if (otpUnavailable()) {
    return res.status(503).json({ error: "سرویس پیامکی فعال نیست" });
  }
  const { phone, code, name } = req.body;

  const entry = otpStore.get(phone);
  if (!entry) {
    return res.status(400).json({ message: "کد تاییدی برای این شماره ثبت نشده است یا منقضی شده" });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ message: "کد تایید منقضی شده است. لطفاً مجدداً درخواست دهید." });
  }

  if (entry.attempts >= 5) {
    otpStore.delete(phone);
    return res.status(429).json({ message: "تعداد دفعات اشتباه بیش از حد مجاز بود. کد جدید دریافت کنید." });
  }

  if (entry.code !== code) {
    entry.attempts++;
    return res.status(400).json({ message: "کد تایید وارد شده نامعتبر است" });
  }

  // OTP verified successfully
  otpStore.delete(phone);

  try {
    let user = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (!user) {
      // Create new user automatically via OTP registration
      const userId = `usr-${Date.now()}`;
      const joinedDate = new Intl.DateTimeFormat("fa-IR").format(new Date());
      const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      const userName = name || "کاربر جـانبی";

      await db.insert(users).values({
        id: userId,
        name: userName,
        phone,
        password: randomPassword,
        joinedDate,
        role: "user",
        vipPoints: 100 // Bonus VIP points on first OTP signup!
      });

      user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
    }

    if (!user) {
      return res.status(500).json({ message: "خطای سرور در بازیابی حساب کاربری" });
    }

    const tokens = generateTokens(user.id);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, env.NODE_ENV === "production");

    const { password: _, ...userWithoutPassword } = user;
    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, user.id)
    });

    res.json({
      message: "ورود با موفقیت انجام شد",
      user: { ...userWithoutPassword, addresses: userAddresses },
      ...tokens
    });
  } catch (error) {
    console.error("OTP login error:", error);
    res.status(500).json({ message: "خطای سرور" });
  }
});

export default router;
