import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { couponValidationSchema } from '../validators/index.js';
import { db } from '../db/index.js';
import { coupons } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

const handleCouponValidation = async (req: any, res: any) => {
  try {
    const { code, cartTotal } = req.body;
    const formattedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, formattedCode)
    });

    if (!coupon || !coupon.active) {
      return res.status(400).json({
        valid: false,
        error: 'کد تخفیف نامعتبر یا منقضی شده است',
        message: 'کد تخفیف نامعتبر یا منقضی شده است'
      });
    }

    // Optional expiry: an ISO timestamp in the past invalidates the coupon.
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        valid: false,
        error: 'کد تخفیف منقضی شده است',
        message: 'کد تخفیف منقضی شده است'
      });
    }

    if (cartTotal < coupon.minTotal) {
      return res.status(400).json({ 
        valid: false, 
        error: 'حداقل مبلغ سفارش برای این کد تخفیف رعایت نشده است',
        message: `حداقل مبلغ خرید برای این کد ${coupon.minTotal.toLocaleString()} تومان است.` 
      });
    }

    let discount = 0;
    if (coupon.percent) {
      discount = Math.round(cartTotal * (coupon.percent / 100));
    } else if (coupon.amount) {
      discount = coupon.amount;
    }
    discount = Math.min(discount, cartTotal);
    const finalTotal = Math.max(0, cartTotal - discount);

    res.json({
      valid: true,
      coupon,
      discount,
      finalTotal
    });
  } catch (error) {
    res.status(500).json({
      error: 'خطای سرور در بررسی کد تخفیف',
      message: 'خطای سرور در بررسی کد تخفیف'
    });
  }
};

router.post('/validate', validate(couponValidationSchema), handleCouponValidation);
router.post('/', validate(couponValidationSchema), handleCouponValidation);

export default router;
