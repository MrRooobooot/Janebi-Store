import React from 'react';
import { ShieldCheck, Truck, Headphones, Award, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function About() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="page-stack"
    >
      {/* Hero Section */}
      <header className="max-w-2xl text-right">
        <p className="text-xs text-slate-500">درباره فروشگاه جانبی آرنا</p>
        <h1 className="mt-1 text-lg font-black leading-tight text-slate-900 dark:text-white sm:text-4xl">
          مرجع تخصصی و معتبر لوازم جانبی دیجیتال و موبایل
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          ما در جانبی آرنا با بیش از ۷ سال تجربه در تامین و توزیع مستقیم لوازم جانبی اصلی، تضمین‌کننده بهترین کیفیت و مناسب‌ترین قیمت برای هموطنان عزیز هستیم.
        </p>
      </header>

      {/* Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/15 text-[var(--color-emphasis-text)] flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-base mb-2">تضمین ۱۰۰٪ اصالت</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            تمامی محصولات جانبی آرنا از برندهای معتبر جهانی و با گارانتی تعویض اصلی ارائه می‌شوند.
          </p>
        </div>

        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <Truck className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-base mb-2">ارسال اکسپرس کشوری</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            تحویل سریع سفارش‌ها در کمتر از ۲۴ ساعت در تهران و ۲ الی ۳ روز کاری در سراسر ایران.
          </p>
        </div>

        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Headphones className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-base mb-2">پشتیبانی ۲۴/۷</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            تیم کارشناسان ما در تمامی مراحل خرید و پس از آن، آماده راهنمایی و پاسخگویی هستند.
          </p>
        </div>

        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-base mb-2">بهترین قیمت بازار</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            واردات مستقیم بدون واسطه که امکان خرید بالاترین کیفیت با قیمتی رقابتی را فراهم می‌کند.
          </p>
        </div>
      </div>

      {/* Story & Details */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-2xl p-6 sm:p-10 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-6">
        <h2 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">داستان جانبی آرنا</h2>
        <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
          جانبی آرنا فعالیت خود را از سال ۱۳۹۸ به عنوان یک فروشگاه تخصصی لوازم جانبی تلفن همراه در تهران آغاز کرد. هدف اولیه ما برطرف کردن چالش خرید لوازم جانبی اصلی و باکیفیت در میان تنوع بی‌شمار کالاهای تقلبی بازار بود.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">ارزیابی و تست دقیق قبل از فروش</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">تمام کالاهای وارداتی توسط تیم فنی تست سنجش کیفیت می‌شوند.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">مهلت بازگشت ۷ روزه واقعی</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">در صورت عدم رضایت از سلامت کالا، وجه شما بدون چون‌وجرا عودت داده می‌شود.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
