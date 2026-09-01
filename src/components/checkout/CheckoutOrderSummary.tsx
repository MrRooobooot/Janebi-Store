import React from 'react';
import { CartItem } from '../../types';
import { formatPrice, toPersianDigits } from '../../lib/utils';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';

interface CheckoutOrderSummaryProps {
  cart: CartItem[];
  cartTotal: number;
  shippingFee: number;
  finalPayable: number;
  submitting: boolean;
  isFreeShipping: boolean;
}

export default function CheckoutOrderSummary({
  cart,
  cartTotal,
  shippingFee,
  finalPayable,
  submitting,
  isFreeShipping,
}: CheckoutOrderSummaryProps) {
  return (
    <div className="bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 sm:p-7 shadow-sm sticky top-28 space-y-6">
      <h3 className="font-black text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between">
        <span>فاکتور نهایی سفارش</span>
        <span className="text-xs font-bold text-primary-500 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-xl">
          {toPersianDigits(cart.length)} قلم کالا
        </span>
      </h3>

      {/* Cart items scrollable overview */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center gap-3.5 text-xs bg-gray-50/50 dark:bg-gray-800/30 p-2 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/60">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-light)] dark:bg-gray-800 p-1 border border-[var(--color-border-light)] dark:border-gray-700 shrink-0 flex items-center justify-center">
              <img
                src={item.image}
                alt={item.title}
                width="56"
                height="56"
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate">
                {item.title}
              </div>
              <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                {toPersianDigits(item.quantity)} عدد × {formatPrice(item.price)}
              </div>
            </div>
            <div className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] shrink-0">
              {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Math */}
      <div className="space-y-3.5 pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-xs font-bold text-gray-600 dark:text-gray-400">
        <div className="flex justify-between items-center">
          <span>مجموع قیمت کالاها</span>
          <span className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">
            {formatPrice(cartTotal)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span>هزینه بسته‌بندی و ارسال</span>
          {isFreeShipping ? (
            <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md text-[11px]">
              رایگان
            </span>
          ) : (
            <span className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              {formatPrice(shippingFee)}
            </span>
          )}
        </div>

        <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-4 flex justify-between items-center text-sm">
          <span className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">مبلغ نهایی فاکتور:</span>
          <div className="font-black text-2xl text-primary-400 dark:text-primary-300 tracking-tight">
            {formatPrice(finalPayable)}
          </div>
        </div>
      </div>

      {/* Final Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        aria-label="ثبت نهایی سفارش و انتقال به درگاه پرداخت امن"
        className="w-full bg-primary-300 hover:bg-primary-500 dark:bg-primary-400 dark:hover:bg-primary-500 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-98 text-sm sm:text-base disabled:opacity-50 group"
      >
        {submitting ? (
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full motion-safe:animate-spin" />
            <span>در حال ایجاد سفارش...</span>
          </div>
        ) : (
          <>
            <Lock className="h-4 w-4 text-white/80" />
            <span>تأیید و پرداخت امن فاکتور</span>
            <ArrowLeft className="h-5 w-5 group-hover:translate-x-[-3px] transition-transform mr-auto" />
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 pt-2 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>تضمین امنیت پرداخت و حفظ حریم خصوصی</span>
      </div>
    </div>
  );
}
