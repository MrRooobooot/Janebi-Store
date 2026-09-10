# طراحی‌نامه بهبود ظاهری فروشگاه جانبی آرنا — نسخه ۱

تاریخ: ۱۴۰۵/۰۶/۲۰ · تهیه‌شده توسط: ایجنت طراح (پس از اتمام Round4 و Round4b)
مبنا: `docs/research/iranian-ecommerce-design-standards.md` (استانداردهای دیجی‌کالا/تکنولایف)، توکن‌های `src/index.css`، بازخوردهای R2-12/R2-13/R2-15.

**راهنمای علامت‌گذاری:**
- `[CSS]` = خالص CSS/توکن — قابل اعمال خودکار بدون بازبینی ساختاری
- `[STRUCT]` = ساختاری (JSX/کامپوننت) — نیازمند بازبینی انسانی قبل از اعمال
- تلاش: S (< ۱ ساعت) / M (۲–۴ ساعت) / L (بیش از یک روز)
- اولویت: P1 (این اسپرینت) / P2 (بعدی) / P3 (آرزوشناق)

---

## ۰) ممیزی توکن‌ها (Token Audit) — P1

یافته‌های R2-12/R2-13/R2-15 و بازبینی `src/index.css`:

| یافته | وضعیت | اثر |
|---|---|---|
| CTA نارنجی `#F47C20` با متن سفید = کنتراست **2.7:1** (شکست WCAG AA حتی برای متن درشت) | باز | همه دکمه‌های اصلی (`bg-orange-500`, `brand-gradient`) |
| `Layout.tsx` هاردکد `#090d16` | ✅ اصلاح شد در R4b → `dark:bg-[var(--color-canvas-dark)]` | — |
| `ProductCard.tsx` هاردکد `#f7f8f8` | ✅ اصلاح شد در R4b → `dark:text-[var(--color-text-main-dark)]` | — |
| R2-15: درفت رنگی بین `orange-*` پیش‌فرض Tailwind و توکن‌های `--color-primary-*` (مثلاً `--color-primary-300:#f47c20` در حالی که Tailwind orange-400 همین است ولی orange-600 Tailwind با primary-500 فرق دارد) | باز | ناسازگاری ظریف بین کامپوننت‌ها؛ hoverها گاهی روی طیف Tailwind و گاهی روی طیف توکن |
| تکرار کد در `index.css`: `.dark .linear-card:hover` دو بار تعریف شده (خط ۱۴۷ و ۱۶۹) — تعریف دوم بی‌اثن است چون دقیقاً همان سلکتور است | باز | علامت تکرار؛ حذف بلوک اول |

### پیشنهاد پالت لوکس اصلاح‌شده (حفظ خانواده hue نارنجی — «Copper Titanium»)

هدف: متن روی CTA حداقل **4.5:1**. راه‌حل: CTA را به سایه تیره‌تر خانواده برانید و متن سفید را نگه دارید.

```css
@theme {
  /* CTA fill — سفید روی این = 4.63:1 ✅ AA (محاسبه: L≈0.233) */
  --color-cta: #b3500a;            /* قبلاً #f47c20 استفاده می‌شد */
  --color-cta-hover: #994700;      /* 6.12:1 با سفید — همان primary فعلی */
  --color-cta-active: #743400;     /* فشار داده‌شده */

  /* تِکست تاکیدی نارنجی روی سطح روشن — 4.56:1 با #fff سفید و 4.5:1 نزدیک روی canvas روشن */
  --color-emphasis-text: #c2410c;  /* جایگزین #ea580c برای متن (3.56:1 ❌) */

  /* حفظ #f47c20 فقط برای: بج تخفیف پر با متن سفید درشت (AA-large) و گلوی سایه */
  --color-accent-surface: #f47c20; /* سطح/بج — نه متن روی آن در اندازه کوچک */
}
.shadow-glow-cta: 0 8px 24px -4px rgba(179, 83, 10, 0.35);
```

قواعد اعمال:
1. هر `bg-orange-500/600 text-white` دکمه اصلی → `bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)]`. `[CSS]`
2. هر `text-orange-500` که متن است (نه آیکون درشت) → `text-[var(--color-emphasis-text)]`. `[CSS]`
3. `brand-gradient` → `linear-gradient(135deg,#b3500a,#994700)` تا متن سفید داخل گرادیان AA بماند. `[CSS]`
4. بج تخفیف رز (`bg-rose-600`) با متن سفید درشت ۱۱px در ProductCard: کنتراست فعلی 4.5:1 — مجاز ولی `text-[11px]` با `font-black` حفظ شود. `[CSS]`
5. حذف بلوک تکراری `.dark .linear-card:hover` اول. `[CSS]`

تلاش کل: M · اولویت: **P1** · بخش اعظم آن `[CSS]` (فقط index.css و کلاس‌های Tailwind) — ایمن برای اعمال خودکار.

---

## ۱) صفحه خانه (Home)

| # | بهبود | تغییر دقیق | اثر بصری | تلاش | اولویت | نوع |
|---|---|---|---|---|---|---|
| H1 | سلسله‌مراتب هیرو | تیتر اسلاید: `text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.15]`؛ زیرتیتر `text-sm sm:text-base text-[var(--color-text-muted-light)]`؛ دکمه CTA با پالت اصلاح‌شده §۰ | خوانایی فوری و حس برند پریمیوم به‌جای چگالی | M | P1 | [STRUCT] |
| H2 | نوار ویژگی‌ها (valueProps) | حذف چهار رنگ متفاوت (orange/emerald/blue/purple) → همه `text-[var(--color-cta)] bg-[var(--color-cta)]/10 border-[var(--color-cta)]/20` | یکپارچگی لوکس — پالت پخته به‌جای رنگین‌کمان | S | P1 | [CSS] |
| H3 | تب دسته‌بندی‌ها | `activeTab` فعال: `border-b-2 border-[var(--color-cta)] text-[var(--color-cta)]`، غیرفعال `text-[var(--color-text-muted-light)] hover:text-[var(--color-text-main-light)]`؛ اسکرول افقی با `custom-scrollbar` و `scroll-smooth snap-x` | نشانه واضح انتخاب + RTL-friendly swipe موبایل | S | P2 | [CSS] |
| H4 | کارت تخفیف شمارش‌معکوس | ارقام فارسی با `tabular-nums` و `font-black`؛ پس‌زمینه `bg-[var(--color-cta)]/10` با خط ثانیه‌گر `h-1 bg-[var(--color-cta)]/40 rounded-full` | حس اضطرار سالم بدون جیغ‌کاری | S | P2 | [STRUCT] |
| H5 | کارت محصول هیرو-محور RTL | جهت `dir="rtl"` روی ردیف اسلایدها؛ فلش‌های پیمایش آینه‌ای (`rotate-180` روی `ArrowLeft` در RTL) | پیمایش طبیعی چپ→راست برای فارسی | S | P2 | [STRUCT] |
| H6 | تنوع‌تایپ فارسی | `normalizePersianTypography` روی همه تیترها؛ نیم‌فاصله (U+200C) مطابق §۲.۲ استانداردها | ظاهر متنی حرفه‌ای مثل دیجی‌کالا | S | P1 | [CSS] |

## ۲) صفحه لیست محصولات (Products)

| # | بهبود | تغییر دقیق | اثر بصری | تلاش | اولویت | نوع |
|---|---|---|---|---|---|---|
| P1 | هدر گرادیانی | `from-orange-500/10` → `from-[var(--color-cta)]/10 via-transparent` با `border-[var(--color-cta)]/15` | هماهنگ با پالت اصلاح‌شده | S | P1 | [CSS] |
| P2 | ستون‌بندی گرید | موبایل: `grid-cols-2 gap-3` (الگوی دیجی‌کالا)؛ تبلت `sm:grid-cols-3`؛ دسکتاپ `lg:grid-cols-4 xl:grid-cols-5` با `gap-4` | چگالی تجاری درست | S | P1 | [STRUCT] |
| P3 | سایدبار فیلتر | `lg:sticky lg:top-24 self-start` + `max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar` | فیلتر همیشه در دسترس هنگام اسکرول | S | P2 | [STRUCT] |
| P4 | فیلتر موبایل | شیت پایین (`bottom sheet`) با `rounded-t-3xl surface-glass pb-safe` + دستگیره `w-10 h-1 bg-zinc-300 rounded-full mx-auto` | حس اپ-مانند؛ مطابق §۱.۸ | M | P2 | [STRUCT] |
| P5 | صفحه‌بندی | دکمه فعال: `bg-[var(--color-cta)] text-white` (نه گرادیان از دو طیف) + حذف `scale-105` به‌نفع `ring-2 ring-[var(--color-cta)]/30` | وضوح انتخاب بدون لرزش layout | S | P1 | [CSS] |
| P6 | chips فیلتر فعال | نوار بالای گرید: chips با `px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-cta)]` + آیکون X کوچک | بازخورد فوری وضعیت فیلتر | M | P2 | [STRUCT] |
| P7 | فارسی‌سازی ارقام قیمت | مطابق §۲.۱: قیمت با جداکننده هزارگان + «تومان» به چپ رقم با `mr-1` (الگوی تکنولایف) | هم‌سویی با استاندارد بازار | S | P1 | [CSS] |

## ۳) صفحه جزئیات محصول (ProductDetail)

| # | بهبود | تغییر دقیق | اثر بصری | تلاش | اولویت | نوع |
|---|---|---|---|---|---|---|
| D1 | باکس خرید (Buy-box) | بخش چسبان در دسکتاپ: `lg:sticky lg:top-24`؛ ردیف نشان‌های اعتماد دقیقاً به سبک دیجی‌کالا: «تحویل اکسپرس / پرداخت در محل / ۷ روز ضمانت بازگشت / ضمانت اصالت» با آیکون‌های Lucide (ShieldCheck, Truck, PackageCheck, Award) و `text-xs` | قابل‌اتکا و آشنا برای کاربر ایرانی | M | P1 | [STRUCT] |
| D2 | بلوک قیمت | قیمت اصلی `text-2xl font-black`؛ «تومان» با `text-xs text-[var(--color-text-muted-light)]`؛ قیمت قبلی `line-through text-sm text-[var(--color-text-subtle-light)]`؛ بج تخفیف `bg-rose-600 text-white px-2 py-0.5 rounded-full text-[11px] font-black` | الگوی ۱.۴ استانداردها | S | P1 | [STRUCT] |
| D3 | گالری تصاویر | زوم hover: `group-hover:scale-105 transition-transform duration-300`؛ thumbnails با `ring-2 ring-[var(--color-cta)]/60` برای انتخاب‌شده؛ پیمایش کیبورد RTL حفظ شود (`ArrowLeft=قبلی` — موجود، نگه‌داشتن) | کیفیت ادراکی بالا | S | P2 | [STRUCT] |
| D4 | نوار چسبان پایین موبایل | `pb-safe` + `surface-glass` + دکمه با `bg-[var(--color-cta)]` و `min-touch-target` | CTA همیشه در دسترس؛ مطابق ۴۴px rule | S | P1 | [STRUCT] |
| D5 | تب‌های مشخصات/نقد | اندازه متن بدنه `text-sm leading-7` (استاندارد چگال §۳.۳)؛ هدر تب `text-base font-bold` با خط زیر `h-0.5 bg-[var(--color-cta)]` | خوانایی فارسی باستة چگال | S | P2 | [CSS] |
| D6 | هشدار موجودی کم | `bg-amber-50 dark:bg-amber-950/40 border-amber-200` + متن «تنها {n} عدد باقی مانده» با ارقام فارسی | اضطرار شفاف بدون دروغ | S | P2 | [STRUCT] |

## ۴) سبد خرید (Cart)

| # | بهبود | تغییر دقیق | اثر بصری | تلاش | اولویت | نوع |
|---|---|---|---|---|---|---|
| C1 | جدول ردیف‌ها | هر ردیف: تصویر `w-20 h-20 rounded-xl surface-card`، نام `text-sm font-bold`، کنترل تعداد با `min-touch-target`؛ جداکننده `border-b border-[var(--color-border-light)]` | چیدمان تمیز خوانا | M | P1 | [STRUCT] |
| C2 | خلاصه سفارش | کارت چسبان: `lg:sticky lg:top-24 surface-card rounded-2xl p-5`؛ ردیف‌های جمع/تخفیف/ارسال `flex justify-between text-sm`؛ جمع نهایی `text-lg font-black text-[var(--color-cta)]` | تمرکز روی CTA پرداخت | S | P1 | [STRUCT] |
| C3 | نوار پیشرفت ارسال رایگان | `h-2 rounded-full bg-zinc-100` با پرشدن `bg-[var(--color-emerald)]` + متن «{n} تومان تا ارسال رایگان» | انگیزه خرید بیشتر (الگوی رایج) | S | P2 | [STRUCT] |
| C4 | سبد خالی | آیکون Lucide `ShoppingCart` درشت در `w-16 h-16 rounded-2xl bg-[var(--color-cta)]/10 text-[var(--color-cta)]` + CTA بازگشت | حس آرام به‌جای پوچی | S | P3 | [STRUCT] |
| C5 | ورودی کد تخفیف | `dir="ltr"` برای کد لاتین؛ دکمه اعمال `bg-[var(--color-cta)] text-white` | کاربردپذیری کدهای انگلیسی | S | P2 | [STRUCT] |

## ۵) تسویه‌حساب (Checkout)

| # | بهبود | تغییر دقیق | اثر بصری | تلاش | اولویت | نوع |
|---|---|---|---|---|---|---|
| K1 | ایندیکیتور مراحل | نوار گام‌ها: «سبد → آدرس → ارسال → پرداخت» با `flex items-center gap-2`؛ گام فعال `bg-[var(--color-cta)] text-white`؛ کامل‌شده: `CheckCircle2 text-emerald-600` | مطابق §۱.۹ | M | P1 | [STRUCT] |
| K2 | فرم آدرس | انتخاب استان سپس شهر (select دو سطحی)؛ ورودی کدپستی `dir="ltr" text-sm tracking-widest`؛ ارقام فارسی در نمایش | الگوی §۲.۴ | M | P1 | [STRUCT] |
| K3 | کارت‌های روش پرداخت | رادیو-کارت: `border-2 rounded-2xl p-4` — انتخاب‌شده `border-[var(--color-cta)] bg-[var(--color-cta)]/5` + آیکون CreditCard | شفافیت انتخاب درگاه | S | P2 | [STRUCT] |
| K4 | جمع‌بندی نهایی | کارت `surface-card` با لیست آیتم‌های کوچک (تصویر ۴۸px + نام + تعداد) پیش از پرداخت | کاهش اضطراب پیش‌پرداخت | S | P2 | [STRUCT] |
| K5 | حالت پرداخت | اسپینر تمام‌صفحه با `animate-pulse` روی لوگو + متن «در حال انتقال به درگاه پرداخت...» | اطمینان در انتقال به زرین‌پال | S | P2 | [STRUCT] |

## ۶) ورود / ثبت‌نام (Login)

| # | بهبود | تغییر دقیق | اثر بصری | تلاش | اولویت | نوع |
|---|---|---|---|---|---|---|
| L1 | کارت ورود | `max-w-md surface-card rounded-3xl p-8` وسط‌چین؛ لوگو بالای کارت؛ ورودی موبایل `dir="ltr" text-center tracking-[0.3em]` برای شماره | تمایز و تمرکز | S | P1 | [STRUCT] |
| L2 | شمارش معکوس OTP | شمارش با `tabular-nums text-[var(--color-text-muted-light)]` + دکمه «ارسال مجدد» فقط پس از صفر (`disabled:opacity-40`) | بازخورد واضح | S | P2 | [STRUCT] |
| L3 | وضعیت خطا | `bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-700 text-xs rounded-xl p-3` با آیکون AlertCircle | پیام خطای انسانی و در دسترس | S | P1 | [CSS] |
| L4 | توضیحات اعتماد | زیر فرم: «با ورود، شرایط استفاده و حریم خصوصی را می‌پذیرید» `text-[11px] text-[var(--color-text-subtle-light)]` | رعایت الزام قانونی | S | P3 | [STRUCT] |

## ۷) پروفایل (Profile)

| # | بهبود | تغییر دقیق | اثر بصری | تلاش | اولویت | نوع |
|---|---|---|---|---|---|---|
| U1 | ناوبری پروفایل | سایدبار راست (`border-l` در RTL) با آیتم‌ها: «سفارش‌ها / علاقه‌مندی‌ها / مقایسه / اطلاعات حساب / خروج»؛ فعال: `bg-[var(--color-cta)]/10 text-[var(--color-cta)] border-r-2 border-[var(--color-cta)]` | جهت‌گیری فوری | M | P2 | [STRUCT] |
| U2 | کارت وضعیت سفارش | badge وضعیت با رنگ معنایی مطابق §۱.۳: در انتظار `bg-amber-100 text-amber-800`، ارسال‌شده `bg-blue-100 text-blue-700`، تحویل‌شده `bg-emerald-100 text-emerald-700`، لغو `bg-rose-100 text-rose-700` | درک آنی وضعیت | S | P1 | [CSS] |
| U3 | امتیاز VIP | نمایش امتیاز در کارت بالای پروفایل با `brand-gradient-text text-2xl font-black` + آیکون Award | حس باشگاه مشتریان لوکس | S | P2 | [STRUCT] |
| U4 | موبایل | سایدبار → تب‌های افقی اسکرول‌شونده `overflow-x-auto snap-x` با `custom-scrollbar` | تجربه اپ-مانند | S | P3 | [STRUCT] |

## ۸) وبلاگ (Blog)

| # | بهبود | تغییر دقیق | اثر بصری | تلاش | اولویت | نوع |
|---|---|---|---|---|---|---|
| B1 | گرید پست‌ها | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`؛ کارت: تصویر `aspect-[16/9] rounded-2xl overflow-hidden` + عنوان `text-base font-black leading-7` | ریتم بصری منظم | S | P2 | [STRUCT] |
| B2 | تایپوگرافی بدنه | `prose`-مانند: `text-[15px] leading-8 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]`؛ عناوین h2/h3 با `mt-8 mb-3 font-black` | خوانایی متون بلند فارسی | S | P1 | [CSS] |
| B3 | برچسب دسته و تاریخ | chip `bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold px-2.5 py-1 rounded-full` + تاریخ شمسی با ارقام فارسی | زبان بصری مشترک با فروشگاه | S | P3 | [STRUCT] |
| B4 | مطالب مرتبط | ردیف افقی ۳ کارت کوچک پایین پست با `gap-4` | ماندگاری بیشتر کاربر | S | P3 | [STRUCT] |

---

## ۹) هدر، کارت محصول و فوتر (برش سریع)

- **Header**: نوار اعلامیه `text-[11px]` با `Sparkles animate-pulse` — انیمیشن pulse را به یک چرخش آهسته/ثابت تبدیل کنید (کاهش نویز حرکتی): `animate-none` + `text-[var(--color-cta)]`. `[CSS]` S · P2
- **Header**: دکمه «خرید عمده» هایلایت: `bg-[var(--color-cta)]/10 text-[var(--color-cta)] border border-[var(--color-cta)]/25` به‌جای رنگ خام Tailwind. `[CSS]` S · P1
- **ProductCard**: بج تخفیف رز با متن سفید ۱۱px — کنتراست مرزی؛ حفظ `font-black` الزامی. hover lift `hover:-translate-y-0.5` موجود و خوب — به `hover:shadow-[var(--shadow-elevation-2)]` اضافه شود. `[CSS]` S · P2
- **Footer**: بج ENAMAD موجود و درست؛ `alt` مطابق §۴.۱ تنظیم شود: `alt="نماد اعتماد الکترونیکی جانبی آرنا"`. `[STRUCT]` S · P1
- **Footer**: لینک «پیگیری سفارش» در ستون لینک‌ها (الگوی §۲.۷). `[STRUCT]` S · P2

---

## ۱۰) خلاصه اولویت‌بندی برای اجرا

**P1 (اعمال فوری — عمدتاً [CSS]):**
1. پالت CTA اصلاح‌شده §۰ (کنتراست 4.63:1)
2. یکدست‌سازی رنگ valueProps/Home (H2)
3. دکمه‌های CTA در سراسر سایت → توکن `--color-cta`
4. بلوک قیمت ProductDetail به الگوی استاندارد (D2)
5. chips فیلتر فعال + صفحه‌بندی تمیز (P5, P6)

**P2:** sticky buy-box دسکتاپ (D1)، سایدبار sticky فیلتر (P3)، شیت فیلتر موبایل (P4)، ایندیکیتور مراحل چک‌اوت (K1)، ناوبری پروفایل (U1)، نوار پیشرفت ارسال رایگان (C3).

**P3:** حالت‌های خالی، تزئینات وبلاگ، تب‌های موبایل پروفایل.

**ریسک ساختاری:** آیتم‌های `[STRUCT]` دستِ حداقل به Context/Router می‌خورند — پیش از اعمال، بازبینی کد لازم است؛ آیتم‌های `[CSS]` ایمن برای اعمال دسته‌ای خودکار توسط fixerها هستند.
