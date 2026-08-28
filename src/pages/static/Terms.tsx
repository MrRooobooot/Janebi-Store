import React from 'react';
import { ShieldAlert, CheckCircle2, Truck, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export default function Terms() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="bg-gradient-to-r from-slate-900 to-gray-800 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold px-3 py-1 rounded-full mb-3">
            <ShieldAlert className="h-3.5 w-3.5" /> قوانین و مقررات رسمی
          </span>
          <h1 className="text-3xl font-black mb-3 tracking-tight">شرایط و قوانین استفاده</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            قوانین خریداران، نحوه ثبت سفارش، شرایط گارانتی و رویه‌های عودت کالا در فروشگاه جانبی آرنا.
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 sm:p-10 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base">
        <div className="flex items-center gap-3 text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          <CheckCircle2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <span>شرایط عمومی و ثبت سفارش</span>
        </div>
        <p>
          ورود کاربران به وب‌سایت جانبی آرنا و ثبت سفارش در هر زمان به معنی پذیرفتن کامل کلیه شرایط و قوانین از سوی کاربر است. تمامی ثبت سفارش‌ها به صورت ۲۴ ساعته امکان‌پذیر می‌باشد.
        </p>

        <div className="flex items-center gap-3 text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>رویه‌های ارسال و تحویل سفارش</span>
        </div>
        <p>
          سفارش‌های ثبت شده در شهر تهران توسط پیک اختصاصی یا پست پیشتاز ظرف کمتر از ۲۴ ساعت تحویل داده شده و سفارش‌های شهرستان از طریق پست پیشتاز یا تیپاکس ۲ الی ۳ روز کاری ارسال می‌شوند.
        </p>

        <div className="flex items-center gap-3 text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span>شرایط 7 روز مهلت بازگشت کالا</span>
        </div>
        <p>
          در صورت وجود اشکال فنی یا مغایرت کالا با توضیحات وب‌سایت، خریدار موظف است حداکثر طی ۲۴ ساعت موضوع را به پشتیبانی اطلاع دهد. کالا باید در بسته‌بندی اولیه بدون آسیب‌دیدگی مرجوع گردد.
        </p>
      </div>
    </motion.div>
  );
}
