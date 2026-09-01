import { Router } from "express";
import { db } from "../db/index.js";
import { contactMessages, newsletterSubscribers } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { toEnglishDigits } from "../../src/lib/utils.js";
import { ARCHIVE_AFTER_DAYS } from "../../src/lib/constants.js";

const router = Router();

// Reaper: auto-archive 'read' contact messages older than ARCHIVE_AFTER_DAYS.
// Interval 1h. The transaction guard (`status = 'read'` re-check inside the
// transaction) makes it idempotent against a concurrent admin status change —
// same pattern as the payment-reaper in server/routes/payment.ts.
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const stale = await db.select({ id: contactMessages.id }).from(contactMessages)
      .where(sql`${contactMessages.status} = 'read' AND ${contactMessages.createdAt} < ${cutoff}`);
    for (const { id } of stale) {
      await db.transaction(async (tx: any) => {
        const current = await tx.select().from(contactMessages).where(eq(contactMessages.id, id));
        if (!current[0] || current[0].status !== 'read') return;
        await tx.update(contactMessages)
          .set({ status: 'archived' })
          .where(eq(contactMessages.id, id));
      });
      console.log(`[contact-archive-reaper] archived message ${id}`);
    }
  } catch (err) {
    console.error('[contact-archive-reaper] error:', err);
  }
}, 60 * 60 * 1000).unref();


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
    // Normalize Persian/Arabic digits before validation so ۰۱۲… emails (paste
    // from Persian keyboards) are not rejected.
    const normalized = toEnglishDigits(String(email)).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return res.status(400).json({ error: "لطفا یک آدرس ایمیل معتبر وارد کنید" });
    }
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
