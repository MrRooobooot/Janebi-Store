import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function CheckoutStepsBar() {
  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto mb-12 relative px-4">
      <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-gray-200 dark:bg-gray-800 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500 w-[60%] rounded-full"></div>
      </div>

      <Link
        to="/cart"
        className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-950 px-2 sm:px-4 group cursor-pointer hover:scale-105 transition-transform"
      >
        <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-md shadow-orange-500/30">
          <CheckCircle className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300">
          سبد خرید
        </span>
      </Link>

      <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-950 px-2 sm:px-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-orange-500/30">
          ۲
        </div>
        <span className="text-xs font-black text-orange-600 dark:text-orange-400">اطلاعات ارسال</span>
      </div>

      <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-950 px-2 sm:px-4">
        <div className="w-10 h-10 rounded-2xl bg-[var(--color-surface-light)] dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-base">
          ۳
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">پرداخت</span>
      </div>
    </div>
  );
}
