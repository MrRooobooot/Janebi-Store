import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

export default function CheckoutStepsBar() {
  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto mb-12 relative px-4">
      <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-zinc-200 dark:bg-zinc-800 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500 w-[60%] rounded-full"></div>
      </div>

      <Link
        to="/cart"
        className="flex flex-col items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-2 sm:px-4 group cursor-pointer hover:scale-105 transition-transform"
      >
        <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-md shadow-orange-500/30">
          <CheckCircle className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300">
          سبد خرید
        </span>
      </Link>

      <div className="flex flex-col items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-2 sm:px-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-orange-500/30">
          {toPersianDigits(2)}
        </div>
        <span className="text-xs font-black text-orange-600 dark:text-orange-400">اطلاعات ارسال</span>
      </div>

      <div className="flex flex-col items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-2 sm:px-4">
        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 flex items-center justify-center font-bold text-base">
          {toPersianDigits(3)}
        </div>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">پرداخت</span>
      </div>
    </div>
  );
}
