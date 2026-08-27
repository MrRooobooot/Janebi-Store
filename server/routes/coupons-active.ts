import { Router } from "express";
import { db } from "../db/index.js";
import { coupons } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// Public list of currently-active coupons for the VIP club tab / chat widget.
// Only code, label and terms are exposed — never internal usage data.
router.get("/", async (_req, res) => {
  try {
    const now = Date.now();
    const rows = await db.select().from(coupons).where(eq(coupons.active, true));
    const active = rows
      .filter((c) => !c.expiresAt || new Date(c.expiresAt).getTime() > now)
      .map((c) => ({
        code: c.code,
        label: c.label,
        percent: c.percent,
        amount: c.amount,
        minTotal: c.minTotal,
        expiresAt: c.expiresAt,
      }));
    res.json(active);
  } catch (error) {
    console.error("Active coupons error:", error);
    res.status(500).json({ message: "خطای سرور در دریافت کدهای تخفیف" });
  }
});

export default router;
