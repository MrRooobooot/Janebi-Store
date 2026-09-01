import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, ArrowLeft, ShieldCheck, CheckCircle2, XCircle, X } from 'lucide-react';
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
  couponError?: string;
  dismissCouponError?: () => void;
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
  couponError,
  dismissCouponError,
  handleApplyCoupon,
  isFreeShipping,
}: CartSummaryCardProps) {
  const payable = finalTotal + (isFreeShipping ? 0 : SHIPPING_FEES.standard);

  return (
    <div className="bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 sm:p-7 shadow-sm lg:sticky lg:top-28 space-y-6">
      <h3 className="font-black text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between">
        <span>خلاصه پیش‌فاکتور</span>
        <span className="text-xs font-bold text-primary-500 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-xl">
          محاسبه رسمی
        </span>
      </h3>

      {/* Coupon form */}
      <form onSubmit={handleApplyCoupon} className="space-y-3">
        <label
          htmlFor="coupon-code-input"
          className="block text-xs font-black text-gray-700 dark:text-gray-300"
        >
          کد تخفیف یا کوپن هدیه دارید؟
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="coupon-code-input"
              type="text"
              dir="ltr"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                dismissCouponError?.();
              }}
              placeholder="مثلا: OFF20"
              aria-invalid={Boolean(couponError)}
              aria-describedby={couponError ? 'coupon-error-message' : appliedDiscount > 0 ? 'coupon-success-message' : undefined}
              className={`w-full bg-gray-50/90 dark:bg-gray-800/80 border rounded-2xl py-3 px-3.5 text-left font-mono text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none uppercase tracking-wider transition-colors ${
                couponError
                  ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500'
                  : 'border-gray-200/80 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-300'
              }`}
            />
            <Tag className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={couponLoading || !couponInput.trim()}
            aria-label="اعمال کد تخفیف"
            className="min-touch-target bg-primary-300 hover:bg-primary-500 dark:bg-primary-400 dark:hover:bg-primary-500 text-white font-extrabold px-5 py-3 rounded-2xl text-xs transition-all disabled:opacity-40 active:scale-95 shadow-sm shrink-0"
          >
            {couponLoading ? 'بررسی...' : 'اعمال'}
          </button>
        </div>

        {couponError && (
          <div
            id="coupon-error-message"
            role="alert"
            className="flex items-center justify-between text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-2xl border border-rose-200/80 dark:border-rose-800/60"
          >
            <span className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
              {couponError}
            </span>
            {dismissCouponError && (
              <button
                type="button"
                onClick={dismissCouponError}
                aria-label="بستن پیام خطای کد تخفیف"
                className="min-touch-target text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 rounded-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {appliedDiscount > 0 && (
          <div
            id="coupon-success-message"
            role="status"
            className="flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 animate-fade-in"
          >
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
          <span className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">
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
            <span className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              {formatPrice(SHIPPING_FEES.standard)}
            </span>
          )}
        </div>

        <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-4 flex justify-between items-center text-sm">
          <span className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">مبلغ نهایی قابل پرداخت:</span>
          <div className="text-left">
            <div className="font-black text-2xl text-primary-400 dark:text-primary-300 tracking-tight">
              {formatPrice(payable)}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Action Button — kinetic CTA #F47C20 (large/bold text per DESIGN.md contrast) */}
      <Link
        to="/checkout"
        aria-label="ادامه فرایند خرید و تکمیل اطلاعات پرداخت"
        className="w-full bg-primary-300 hover:bg-primary-500 dark:bg-primary-400 dark:hover:bg-primary-500 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-98 text-sm sm:text-base group"
      >
        <span>تکمیل اطلاعات و پرداخت</span>
        <ArrowLeft className="h-5 w-5 group-hover:translate-x-[-3px] transition-transform" />
      </Link>

      <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 pt-2 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>پرداخت امن و رمزنگاری‌شده بانکی</span>
      </div>
    </div>
  );
}
