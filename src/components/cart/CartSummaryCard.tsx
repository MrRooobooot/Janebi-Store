import React from 'react';
import { createPortal } from 'react-dom';
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
    <div className="space-y-6 rounded-3xl p-5 lg:sticky lg:top-24">
      <h3 className="font-bold text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        خلاصه پیش‌فاکتور
      </h3>

      {/* Coupon form */}
      <form onSubmit={handleApplyCoupon} className="space-y-3">
        <label
          htmlFor="coupon-code-input"
          className="block text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          کد تخفیف یا کوپن هدیه دارید؟
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
                id="coupon-code-input"
              name="couponCode"
              autoComplete="off"
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
              className={`field w-full py-2.5 px-3.5 text-left font-mono text-xs uppercase tracking-wider transition-colors ${
                couponError
                  ? 'border-red-400 dark:border-red-600 focus:border-red-500'
                  : 'border-slate-200/90 dark:border-white/[0.08] focus:border-[var(--color-cta)]'
              }`}
            />
            <Tag className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={couponLoading || !couponInput.trim()}
            aria-label="اعمال کد تخفیف"
            className="btn-primary inline-flex min-touch-target shrink-0 items-center justify-center rounded-2xl px-5 py-3 text-xs font-bold disabled:opacity-40"
          >
            {couponLoading ? 'بررسی...' : 'اعمال'}
          </button>
        </div>

        {couponError && (
          <div
            id="coupon-error-message"
            role="alert"
            className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-2xl border border-rose-200/80 dark:border-rose-800/60"
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
                className="min-touch-target inline-flex items-center justify-center text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 rounded-lg"
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
            className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 animate-fade-in"
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
      <div className="space-y-3.5 pt-2 text-xs font-bold text-slate-600 dark:text-slate-400">
        <div className="flex justify-between items-center">
          <span>جمع کل اقلام سبد</span>
          <span className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">
            {formatPrice(cartTotal)}
          </span>
        </div>

        {appliedDiscount > 0 && (
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
            <span>سود شما از تخفیف</span>
            <span className="font-bold text-sm">-{formatPrice(appliedDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span>هزینه بسته‌بندی و ارسال</span>
          {isFreeShipping ? (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md text-xs">
              رایگان
            </span>
          ) : (
            <span className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              {formatPrice(SHIPPING_FEES.standard)}
            </span>
          )}
        </div>

        <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-4 flex justify-between items-center text-sm">
          <span className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">مبلغ نهایی قابل پرداخت:</span>
          <div className="text-left">
            <div className="font-bold text-lg text-[var(--color-emphasis-text)] tracking-tight">
              {formatPrice(payable)}
            </div>
          </div>
        </div>
      </div>

      <Link
        to="/checkout"
        aria-label="ادامه فرایند خرید و تکمیل اطلاعات پرداخت"
        className="btn-primary hidden w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-sm font-bold sm:text-base lg:flex"
      >
        <span>تکمیل اطلاعات و پرداخت</span>
        <ArrowLeft className="h-5 w-5 group-hover:translate-x-[-3px] transition-transform" />
      </Link>

      <div className="hidden lg:flex items-center justify-center gap-2 text-xs font-bold text-[var(--color-text-muted-light)] dark:text-[var(--color-text-muted-dark)] pt-2 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>پرداخت امن و رمزنگاری‌شده بانکی</span>
      </div>

      {createPortal(
        <div className="fixed inset-x-0 bottom-0 z-50 pb-safe pointer-events-none lg:hidden">
          <div className="mx-3 mb-[76px] pointer-events-auto">
            <div className="surface-glass flex items-center gap-3 rounded-2xl p-3 text-right shadow-2xl">
              <div className="min-w-0 shrink-0">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">مبلغ نهایی</p>
                <p className="text-sm font-bold text-[var(--color-emphasis-text)]">{formatPrice(payable)}</p>
              </div>
              <Link
                to="/checkout"
                aria-label="ادامه فرایند خرید و تکمیل اطلاعات پرداخت"
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-cta)] px-3 text-xs font-bold text-white shadow-md"
              >
                <span>تکمیل اطلاعات و پرداخت</span>
              </Link>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}