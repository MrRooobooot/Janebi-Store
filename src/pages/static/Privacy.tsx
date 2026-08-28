import React from 'react';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';
import { motion } from 'motion/react';

export default function Privacy() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full mb-3">
            <Lock className="h-3.5 w-3.5" /> حریم خصوصی شما محفوظ است
          </span>
          <h1 className="text-3xl font-black mb-3 tracking-tight">سیاست حفظ حریم خصوصی</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            تعهد جانبی آرنا به صیانت از اطلاعات شخصی و حریم خصوصی تمامی کاربران و مشتریان.
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 sm:p-10 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base">
        <div className="flex items-center gap-3 text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <span>جمع‌آوری و استفاده از اطلاعات</span>
        </div>
        <p>
          جانبی آرنا برای ثبت، پردازش و ارسال سفارش‌ها، اطلاعاتی مانند آدرس، شماره تلفن و ایمیل را دریافت می‌کند. تمامی این اطلاعات با بهره‌گیری از پروتکل‌های امنیتی روز دنیا نگهداری می‌شوند.
        </p>

        <div className="flex items-center gap-3 text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span>عدم افشای اطلاعات به اشخاص ثالث</span>
        </div>
        <p>
          اطلاعات شما به هیچ عنوان در اختیار سازمان‌ها یا اشخاص ثالث قرار نخواهد گرفت، مگر در مواردی که با حکم مستقیم مراجع ذی‌صلاح قانونی صادر شده باشد.
        </p>

        <div className="flex items-center gap-3 text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>ارتباطات و خبرنامه</span>
        </div>
        <p>
          جانبی آرنا ممکن است برای اطلاع‌رسانی رخدادها، خدمات، جشنواره‌های تخفیف و کدهای ویژه، به اعضای وب‌سایت ایمیل یا پیامک ارسال کند. شما در هر زمان می‌توانید لغو عضویت دهید.
        </p>
      </div>
    </motion.div>
  );
}
