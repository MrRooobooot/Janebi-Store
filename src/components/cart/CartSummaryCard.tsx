import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, Sparkles, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { SHIPPING_FEES } from '../../lib/constants';

interface CartSummaryCardProps {
  cartTotal: number;
  finalTotal: number;
  couponInput: string;
  setCouponInput: (val: string) => void;
  couponLoading: boolean;
  appliedDiscount: number;
  couponLabel: string;
  handleApplyCoupon: (e: React.FormEvent) => void;
  isFreeShipping: boolean;
}

export default function CartSummaryCard({
  cartTotal,
  finalTotal,
  couponInput,
  setCouponInput,
  couponLoading,
  appliedDiscount,
  couponLabel,
  handleApplyCoupon,
  isFreeShipping,
}: CartSummaryCardProps) {
  const payable = finalTotal + (isFreeShipping ? 0 : SHIPPING_FEES.standard);

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-7 shadow-sm sticky top-28 space-y-6">
      <h3 className="font-black text-lg text-gray-900 dark:text-gray-100 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span>خلاصه پیش‌فاکتور</span>
        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-xl">
          محاسبه رسمی
        </span>
      </h3>

      {/* Coupon form */}
      <form onSubmit={handleApplyCoupon} className="space-y-3">
        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">
          کد تخفیف یا کوپن هدیه دارید؟
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              dir="ltr"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="مثلا: OFF20"
              className="w-full bg-gray-50/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700 rounded-2xl py-3 px-3.5 pl-3 pr-9 text-left font-mono text-xs font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 uppercase tracking-wider transition-colors"
            />
            <Tag className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={couponLoading || !couponInput.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-5 py-3 rounded-2xl text-xs transition-all disabled:opacity-40 active:scale-95 shadow-sm shrink-0"
          >
            {couponLoading ? 'بررسی...' : 'اعمال'}
          </button>
        </div>

        {appliedDiscount > 0 && (
          <div className="flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 animate-fade-in">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              کد {couponLabel} اعمال شد
            </span>
            <span className="font-mono">-{formatPrice(appliedDiscount)}</span>
          </div>
        )}
      </form>

      {/* Breakdown */}
      <div className="space-y-3.5 pt-2 text-xs font-bold text-gray-600 dark:text-gray-400">
        <div className="flex justify-between items-center">
          <span>جمع کل اقلام سبد</span>
          <span className="font-black text-gray-900 dark:text-gray-100 text-sm">
            {formatPrice(cartTotal)}
          </span>
        </div>

        {appliedDiscount > 0 && (
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
            <span>سود شما از تخفیف</span>
            <span className="font-black text-sm">-{formatPrice(appliedDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span>هزینه بسته‌بندی و ارسال</span>
          {isFreeShipping ? (
            <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md text-[11px]">
              رایگان
            </span>
          ) : (
            <span className="font-black text-gray-900 dark:text-gray-100">
              {formatPrice(SHIPPING_FEES.standard)}
            </span>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex justify-between items-center text-sm">
          <span className="font-black text-gray-900 dark:text-gray-100">مبلغ نهایی قابل پرداخت:</span>
          <div className="text-left">
            <div className="font-black text-2xl text-orange-600 dark:text-orange-400 tracking-tight">
              {formatPrice(payable)}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Action Button */}
      <Link
        to="/checkout"
        className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-98 text-sm sm:text-base group"
      >
        <span>تکمیل اطلاعات و پرداخت</span>
        <ArrowLeft className="h-5 w-5 group-hover:translate-x-[-3px] transition-transform" />
      </Link>

      <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>پرداخت امن و رمزنگاری‌شده بانکی</span>
      </div>
    </div>
  );
}
