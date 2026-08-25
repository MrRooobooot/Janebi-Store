import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';
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
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-xs sticky top-28 space-y-6">
      <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100 pb-4 border-b border-gray-100 dark:border-gray-800">
        خلاصه فاکتور
      </h3>

      {/* Coupon form */}
      <form onSubmit={handleApplyCoupon} className="space-y-3">
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
          کد تخفیف دارید؟
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              dir="ltr"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="مثلا: JANEBI20"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 px-3 pl-3 pr-8 text-left font-mono text-xs font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 uppercase tracking-wider"
            />
            <Tag className="h-4 w-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            disabled={couponLoading || !couponInput.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-colors disabled:opacity-50"
          >
            {couponLoading ? 'اعتبار سنجی...' : 'اعمال'}
          </button>
        </div>

        {appliedDiscount > 0 && (
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <span>کد تخفیف {couponLabel} اعمال شد</span>
            <span>-{formatPrice(appliedDiscount)}</span>
          </div>
        )}
      </form>

      {/* Math breakdown */}
      <div className="space-y-3 pt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span>مجموع قیمت کالاها</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {formatPrice(cartTotal)}
          </span>
        </div>

        {appliedDiscount > 0 && (
          <div className="flex justify-between text-emerald-600 font-bold">
            <span>تخفیف کد تخفیف</span>
            <span>-{formatPrice(appliedDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>هزینه ارسال</span>
          {isFreeShipping ? (
            <span className="font-bold text-emerald-600 dark:text-emerald-400">رایگان</span>
          ) : (
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {formatPrice(SHIPPING_FEES.standard)}
            </span>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex justify-between items-center text-sm">
          <span className="font-extrabold text-gray-900 dark:text-gray-100">مبلغ قابل پرداخت</span>
          <div className="text-right">
            <div className="font-black text-xl text-orange-600 dark:text-orange-400">
              {formatPrice(finalTotal + (isFreeShipping ? 0 : SHIPPING_FEES.standard))}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Action Button */}
      <Link
        to="/checkout"
        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 text-sm"
      >
        <span>ادامه ثبت سفارش</span>
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 pt-2">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>ضمانت اصالت و بازگشت ۷ روزه کالا</span>
      </div>
    </div>
  );
}
