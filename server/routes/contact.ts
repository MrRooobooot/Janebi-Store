import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: "نام، ایمیل و پیام الزامی است" });
  }

  // Mask sensitive PII in server logs
  const maskedEmail = typeof email === "string" ? email.replace(/^(.{2})(.*)(@.*)$/, "$1***$3") : "";
  const maskedPhone = typeof phone === "string" && phone.length > 4 ? phone.slice(0, 4) + "****" + phone.slice(-2) : "";

  console.log("Received contact message from:", { email: maskedEmail, phone: maskedPhone, subject });

  res.status(200).json({ message: "پیام شما با موفقیت ارسال شد. به زودی با شما تماس خواهیم گرفت." });
});

export default router;
