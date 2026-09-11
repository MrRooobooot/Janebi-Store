import { z } from 'zod';
import { toEnglishDigits } from '../../src/lib/utils.js';

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

// Numeric entity id (products / cart items / wishlist entries). Routes
// parseInt() this value; rejecting non-numeric strings turns a would-be 500
// (NaN param reaching the database driver) into a proper 400 — verified live
// on PG: DELETE /api/wishlist/wish-… returned 500 before this guard.
// NOTE: address ids are strings ("addr-…") and must keep using idParamSchema.
export const numericIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "شناسه باید عدد باشد"),
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
    // Required for the normal change flow; the forced first-login flow omits it
    // (server skips the check when must_change_password is still set).
    currentPassword: z.string().min(1, "کلمه عبور فعلی الزامی است").optional(),
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
    items: z.array(z.object({
      id: z.number().or(z.string()).optional(),
      productId: z.number().or(z.string()).optional(),
      quantity: z.number().int().positive().optional(),
      qty: z.number().int().positive().optional(),
      price: z.number().optional(),
      title: z.string().optional(),
      image: z.string().optional(),
      brand: z.string().optional(),
      color: z.string().optional(),
    }).passthrough()).min(1, "سبد خرید خالی است"),
    recipient: z.object({
      name: z.string().min(1, "نام تحویل‌گیرنده الزامی است"),
      phone: z.string().min(1, "شماره موبایل الزامی است"),
      address: z.string().min(1, "آدرس پستی الزامی است"),
      postalCode: z.string().nullable().optional(),
    }),
    shippingMethod: z.string().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
    couponCode: z.string().nullable().optional(),
    useVipPoints: z.boolean().nullable().optional(),
    subtotal: z.number().nonnegative().nullable().optional(),
    shippingFee: z.number().nonnegative().nullable().optional(),
    discountAmount: z.number().nonnegative().nullable().optional(),
    total: z.number().nonnegative().nullable().optional(),
  })
});

// Normalizer function for Iranian mobile phone numbers (handles Persian/Arabic digits, +98, 0098, 98 prefixes)
function normalizeIranianPhone(val: unknown): string {
  if (typeof val !== 'string') return String(val || '');
  let cleaned = val
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[\s\-\(\)\.]+/g, '');

  if (cleaned.startsWith('+98')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('0098')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('98')) cleaned = '0' + cleaned.slice(2);
  else if (cleaned.length === 10 && cleaned.startsWith('9')) cleaned = '0' + cleaned;

  return cleaned;
}

const iranianPhoneSchema = z.preprocess(
  normalizeIranianPhone,
  z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست")
);

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "نام باید حداقل ۲ حرف باشد"),
    phone: iranianPhoneSchema,
    password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد")
  })
});

export const loginSchema = z.object({
  body: z.object({
    phone: iranianPhoneSchema,
    password: z.string().min(1, "رمز عبور را وارد کنید")
  })
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "نام باید حداقل ۲ حرف باشد").optional(),
    phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست").optional(),
    email: z.string().email("ایمیل معتبر نیست").optional().or(z.literal('')),
    // Relative app paths (/avatar.svg) are valid for the SPA — not only absolute URLs.
    avatar: z.string().min(1).max(500).optional()
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

export const resetPasswordSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
    code: z.string().regex(/^\d{5}$/, "کد تایید باید ۵ رقم باشد"),
    newPassword: z.string().min(6, "رمز عبور جدید باید حداقل ۶ کاراکتر باشد")
  })
});

// ---------------------------------------------------------
// Admin endpoint schemas (R3-03) — preserve hand-rolled semantics
// ---------------------------------------------------------

export const adminPasswordSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    newPassword: z.string().min(6, "رمز عبور جدید باید حداقل ۶ کاراکتر باشد"),
  }),
});

export const roleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    role: z.enum(['admin', 'user'], { message: 'نقش کاربر نامعتبر است' }),
  }),
});

// Strict numeric coercion: a numeric string is accepted, anything that is not
// exactly a non-negative integer is rejected — no parseInt()||0 zeroing.
const strictInt = z.preprocess(
  (v) => (typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v.trim()) : v),
  z.number().int().nonnegative('مقدار امتیاز نامعتبر است')
);

export const pointsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ vipPoints: strictInt }),
});

const optionalPrice = z.preprocess(
  (v) => (v === '' || v === null ? undefined : (typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v.trim()) : v)),
  z.number().int().nonnegative('مقدار عددی نامعتبر است')
);

export const productUpsertSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'عنوان محصول الزامی است').optional(),
    category: z.string().min(1, 'دسته‌بندی الزامی است').optional(),
    price: optionalPrice.optional(),
    originalPrice: optionalPrice.nullish(),
    discount: optionalPrice.nullish(),
    image: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    warranty: z.string().nullish(),
    description: z.string().nullish(),
    stockQuantity: optionalPrice.optional(),
    sku: z.string().min(1).optional(),
  }),
});

// POST /api/admin/products requires the core fields; PUT accepts partial bodies.
export const productCreateSchema = productUpsertSchema
  .transform((p) => p)
  .superRefine((p, ctx) => {
    if (p.body.title === undefined || p.body.category === undefined || p.body.price === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Title, category, and price are required' });
    }
  });

export const orderStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'], { message: 'وضعیت سفارش نامعتبر است' }),
    statusText: z.string().min(1).optional(),
  }),
});

const couponInt = z.preprocess(
  (v) => (v === '' || v === null ? undefined : (typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v.trim()) : v)),
  z.number().int().nonnegative('مقدار عددی نامعتبر است')
);

const couponExpiresAt = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'تاریخ انقضا نامعتبر است' });

export const couponUpsertSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Code and label are required').optional(),
    label: z.string().min(1, 'Code and label are required').optional(),
    percent: couponInt.nullish(),
    amount: couponInt.nullish(),
    minTotal: couponInt.optional(),
    active: z.boolean().optional(),
    usageLimit: couponInt.nullish(),
    expiresAt: couponExpiresAt.nullish(),
  }),
});

// POST /api/admin/coupons requires code + label; PUT is partial.
export const couponCreateSchema = couponUpsertSchema.superRefine((p, ctx) => {
  if (!p.body.code?.trim() || !p.body.label?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Code and label are required' });
  }
});

export const trackingSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    refId: z.string().trim().min(1).nullable().optional(),
  }),
});

export const approvedSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ approved: z.boolean() }),
});

export const messageStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['unread', 'read', 'resolved', 'archived'], { message: 'Invalid status' }),
  }),
});

export const settingsSchema = z.object({
  body: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------
// Contact / newsletter (R3-04)
// ---------------------------------------------------------
const emailSchema = z.preprocess(
  (v) => (typeof v === 'string' ? toEnglishDigits(v).trim().toLowerCase() : v),
  z.string().email('لطفا یک آدرس ایمیل معتبر وارد کنید')
);

// Contact email field accepts EITHER a real email OR an Iranian mobile number:
// the storefront «شماره تماس یا ایمیل» field sends the same value in both
// `email` and `phone` (src/pages/static/Contact.tsx). A bare mobile must not
// fail Zod's email format check — normalize it into `phone` before validation.
// Iranian mobile pattern — a mobile may be supplied in the contact `email`
// field (UI sends «شماره تماس یا ایمیل» in both email and phone).
const MOBILE_RE = /^(?:\+98|0098|98|0)?9\d{9}$/;
export const isIranianMobile = (v: string) => MOBILE_RE.test(toEnglishDigits(v).trim());

// Required-field presence (name/email/message) is checked in the handler so the
// response keeps the legacy flat shape `{ error: "…الزامی است" }` that the
// storefront client renders directly. Zod here enforces shape/format (email
// format, Persian-digit normalization, max lengths).
export const contactSchema = z.object({
  body: z.object({
    name: z.string().max(200).optional(),
    // Mobile supplied in the email field is stripped here (passes validation)
    // and recovered by the handler from the raw body — contact info still lands
    // in the `phone` column.
    email: z.preprocess((v) => (typeof v === 'string' && isIranianMobile(v) ? undefined : v), emailSchema.optional()),
    phone: z.string().max(20).optional().or(z.literal('')),
    subject: z.string().max(300).optional().or(z.literal('')),
    message: z.string().max(5000).optional(),
  }),
});

export const newsletterSchema = z.object({
  body: z.object({ email: emailSchema }),
});

// Admin bulk operations — ids are primary keys of contact_messages / orders
// (text PKs). Numbers sent by clients are coerced to strings; anything else is
// rejected. Capped at 500 per request.
export const bulkIdsSchema = z.object({
  body: z.object({
    ids: z
      .array(
        z.preprocess(
          (v) => (typeof v === "number" || typeof v === "bigint" ? String(v) : v),
          z.string().min(1).max(128)
        )
      )
      .min(1, "حداقل یک شناسه لازم است")
      .max(500, "حداکثر ۵۰۰ شناسه در هر درخواست"),
  }),
});
