import React from 'react';
import { ShieldCheck, Truck, Headphones, Award, CheckCircle2 } from 'lucide-react';
import { LogoSymbol } from '../../components/Logo';
import { motion } from 'motion/react';

export default function About() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-10"
    >
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-lg shadow-orange-500/20">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-[var(--color-surface-light)]/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold mb-4">
            <Award className="h-4 w-4" /> درباره فروشگاه جانبی آرنا
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight leading-tight">
            مرجع تخصصی و معتبر لوازم جانبی دیجیتال و موبایل
          </h1>
          <p className="text-orange-100 text-sm sm:text-base leading-relaxed">
            ما در جانبی آرنا با بیش از ۷ سال تجربه در تامین و توزیع مستقیم لوازم جانبی اصلی، تضمین‌کننده بهترین کیفیت و مناسب‌ترین قیمت برای هموطنان عزیز هستیم.
          </p>
        </div>
        <div className="absolute -left-10 -bottom-10 w-64 h-64 opacity-15 rotate-12 pointer-events-none">
          <LogoSymbol theme="white" className="w-full h-full" />
        </div>
      </div>

      {/* Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
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
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 sm:p-10 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-6">
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
