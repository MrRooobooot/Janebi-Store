import React from 'react';
import FAQ from '../../components/FAQ';
import { motion } from 'motion/react';

export default function FAQPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="page-stack"
    >
      <header className="max-w-xl text-right">
        <p className="text-xs text-slate-500">مرکز راهنمایی و پشتیبانی</p>
        <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-4xl">سوالات متداول خریداران</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          پاسخ جامع به رایج‌ترین پرسش‌های شما در خصوص نحوه ثبت سفارش، ضمانت اصالت، زمان ارسال و مرجوعی کالا.
        </p>
      </header>

      <FAQ />
    </motion.div>
  );
}
