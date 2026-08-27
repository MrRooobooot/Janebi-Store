import React from 'react';
import { Truck, CheckCircle2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/constants';
import { formatPrice } from '../../lib/utils';

interface FreeShippingBarProps {
  isFreeShipping: boolean;
  amountLeft: number;
  progressPercentage: number;
}

export default function FreeShippingBar({
  isFreeShipping,
  amountLeft,
  progressPercentage,
}: FreeShippingBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`mb-10 p-5 md:p-6 rounded-3xl border transition-all shadow-xs ${
        isFreeShipping
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40 backdrop-blur-md'
          : 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-200/60 dark:border-orange-900/40 backdrop-blur-md'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isFreeShipping
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/20'
            }`}
          >
            {isFreeShipping ? (
              <CheckCircle2 className="h-7 w-7 animate-bounce" />
            ) : (
              <Truck className="h-7 w-7" />
            )}
          </div>
          <div>
            {isFreeShipping ? (
              <div>
                <h3 className="font-black text-emerald-900 dark:text-emerald-300 text-lg md:text-xl flex items-center gap-2">
                  <span>ارسال رایگان شامل سفارش شما شد!</span>
                  <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </h3>
                <p className="text-xs md:text-sm text-emerald-700 dark:text-emerald-400/80 mt-1 font-medium">
                  سفارش شما حد نصاب {formatPrice(FREE_SHIPPING_THRESHOLD)} را گذرانده و بدون هزینه ارسال تحویل داده می‌شود.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base md:text-lg">
                  تنها <span className="text-orange-600 dark:text-orange-400 font-black text-xl">{formatPrice(amountLeft)}</span> دیگر تا{' '}
                  <span className="text-orange-600 dark:text-orange-400 font-black">ارسال رایگان</span>
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                  برای سفارش‌های بالای {formatPrice(FREE_SHIPPING_THRESHOLD)}، ارسال به سراسر کشور کاملاً رایگان است.
                </p>
              </div>
            )}
          </div>
        </div>
        <span
          className={`text-xs font-black px-3 py-1.5 rounded-full border self-start md:self-center ${
            isFreeShipping
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
              : 'bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700'
          }`}
        >
          {progressPercentage}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-3.5 bg-gray-200/80 dark:bg-gray-800/80 rounded-full overflow-hidden p-0.5 shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full transition-all relative ${
            isFreeShipping
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/30'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-orange-500/30'
          }`}
        />
      </div>
    </motion.div>
  );
}
