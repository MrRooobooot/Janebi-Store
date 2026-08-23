import { Router } from "express";
import { db } from "../db/index.js";
import { contactMessages, newsletterSubscribers } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "نام، ایمیل و پیام الزامی است" });
  }

  try {
    await db.insert(contactMessages).values({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(name).slice(0, 200),
      email: String(email).slice(0, 320),
      phone: phone ? String(phone).slice(0, 20) : null,
      subject: subject ? String(subject).slice(0, 300) : null,
      message: String(message).slice(0, 5000),
      status: "unread",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // Persisting must not silently swallow the customer's message.
    console.error("Failed to store contact message:", error);
    return res.status(500).json({ error: "خطا در ثبت پیام. لطفاً بعداً تلاش کنید." });
  }

  // Mask sensitive PII in server logs
  const maskedEmail = typeof email === "string" ? email.replace(/^(.{2})(.*)(@.*)$/, "$1***$3") : "";
  const maskedPhone = typeof phone === "string" && phone.length > 4 ? phone.slice(0, 4) + "****" + phone.slice(-2) : "";

  console.log("Received contact message from:", { email: maskedEmail, phone: maskedPhone, subject });

  res.status(200).json({ message: "پیام شما با موفقیت ارسال شد. به زودی با شما تماس خواهیم گرفت." });
});

// Newsletter signup — consumed by the site footer; rows surface in the admin
// Newsletter page (GET/DELETE /api/admin/newsletter).
router.post("/newsletter", async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: "لطفا یک آدرس ایمیل معتبر وارد کنید" });
  }

  try {
    const normalized = String(email).trim().toLowerCase();
    const existing = await db.query.newsletterSubscribers.findFirst({
      where: eq(newsletterSubscribers.email, normalized),
    });
    if (!existing) {
      await db.insert(newsletterSubscribers).values({
        email: normalized,
        subscribedAt: new Date().toISOString(),
      });
    }
    res.status(200).json({ message: "با موفقیت در خبرنامه عضو شدید" });
  } catch (error) {
    console.error("Failed to store newsletter subscriber:", error);
    res.status(500).json({ error: "خطا در ثبت عضویت خبرنامه" });
  }
});

export default router;
