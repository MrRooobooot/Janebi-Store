import { z } from 'zod';

export const productQuerySchema = z.object({
  query: z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    brands: z.string().optional(),
    minPrice: z.string().regex(/^\d+$/).optional(),
    maxPrice: z.string().regex(/^\d+$/).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    hasDiscount: z.enum(['true', 'false']).optional(),
    sort: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
  })
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  })
});

export const couponValidationSchema = z.object({
  body: z.object({
    code: z.string().min(1, "کد تخفیف وارد نشده است"),
    cartTotal: z.number().nonnegative("مبلغ سبد خرید باید عددی مثبت یا صفر باشد"),
  })
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "کلمه عبور فعلی الزامی است"),
    newPassword: z.string().min(6, "کلمه عبور جدید باید حداقل ۶ کاراکتر باشد")
  })
});

export const reviewSubmitSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    userName: z.string().min(1, "نام کاربر الزامی است"),
    rating: z.number().min(1).max(5),
    title: z.string().min(1, "عنوان الزامی است"),
    comment: z.string().min(1, "متن نظر الزامی است"),
    recommend: z.boolean().optional(),
  })
});

export const orderSubmitSchema = z.object({
  body: z.object({
    items: z.array(z.any()).min(1, "سبد خرید خالی است"),
    recipient: z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      address: z.string().min(1),
      postalCode: z.string().optional(),
    }),
    shippingMethod: z.string().optional(),
    paymentMethod: z.string().optional(),
    couponCode: z.string().optional(),
    useVipPoints: z.boolean().optional(),
    subtotal: z.number().nonnegative().optional(),
    shippingFee: z.number().nonnegative().optional(),
    discountAmount: z.number().nonnegative().optional(),
    total: z.number().nonnegative().optional(),
  })
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "نام باید حداقل ۲ حرف باشد"),
    phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
    password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد")
  })
});

export const loginSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
    password: z.string().min(1, "رمز عبور را وارد کنید")
  })
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "نام باید حداقل ۲ حرف باشد").optional(),
    email: z.string().email("ایمیل معتبر نیست").optional().or(z.literal('')),
    avatar: z.string().url().optional()
  })
});

export const addressSchema = z.object({
  body: z.object({
    title: z.string().min(1, "عنوان آدرس را وارد کنید"),
    name: z.string().min(1, "نام تحویل گیرنده را وارد کنید"),
    phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
    province: z.string().min(1, "استان را انتخاب کنید"),
    city: z.string().min(1, "شهر را انتخاب کنید"),
    address: z.string().min(5, "آدرس کامل را وارد کنید"),
    postalCode: z.string().optional()
  })
});

export const cartItemSchema = z.object({
  body: z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive().max(10).optional()
  })
});

export const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().positive().max(10)
  })
});

export const wishlistItemSchema = z.object({
  body: z.object({
    productId: z.number().int().positive()
  })
});

export const otpSendSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست")
  })
});

export const otpVerifySchema = z.object({
  body: z.object({
    phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
    code: z.string().regex(/^\d{5}$/, "کد تایید باید ۵ رقم باشد"),
    name: z.string().optional()
  })
});
