import React from 'react';
import FAQ from '../../components/FAQ';
import { HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function FAQPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-lg shadow-orange-500/20">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-[var(--color-surface-light)]/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            <HelpCircle className="h-3.5 w-3.5" /> مرکز راهنمایی و پشتیبانی
          </span>
          <h1 className="text-3xl font-black mb-3 tracking-tight">سوالات متداول خریداران</h1>
          <p className="text-orange-100 text-sm leading-relaxed">
            پاسخ جامع به رایج‌ترین پرسش‌های شما در خصوص نحوه ثبت سفارش، ضمانت اصالت، زمان ارسال و مرجوعی کالا.
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 sm:p-10 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs">
        <FAQ />
      </div>
    </motion.div>
  );
}
