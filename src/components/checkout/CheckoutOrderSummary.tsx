import React from 'react';
import { createPortal } from 'react-dom';
import { CartItem } from '../../types';
import { formatPrice, toPersianDigits } from '../../lib/utils';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';

interface CheckoutOrderSummaryProps {
  cart: CartItem[];
  cartTotal: number;
  shippingFee: number;
  finalPayable: number;
  appliedDiscount?: number;
  couponCode?: string | null;
  couponLabel?: string;
  submitting: boolean;
  isFreeShipping: boolean;
  paymentMethod: 'online' | 'cod';
}

export default function CheckoutOrderSummary({
  cart,
  cartTotal,
  shippingFee,
  finalPayable,
  appliedDiscount = 0,
  couponCode,
  couponLabel,
  submitting,
  isFreeShipping,
  paymentMethod,
}: CheckoutOrderSummaryProps) {
  const isCod = paymentMethod === 'cod';
  const submitLabel = isCod ? 'ثبت سفارش با پرداخت درب منزل' : 'تأیید و پرداخت امن فاکتور';
  const submitAria = isCod ? 'ثبت سفارش با پرداخت درب منزل' : 'ثبت نهایی سفارش و انتقال به درگاه پرداخت امن';
  const reassurance = isCod
    ? 'پرداخت هنگام تحویل با کارت‌خوان مأمور پست'
    : 'تضمین امنیت پرداخت و حفظ حریم خصوصی';

  const submitContent = submitting ? (
    <div className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full motion-safe:animate-spin" />
      <span>در حال ایجاد سفارش...</span>
    </div>
  ) : (
    <>
      <Lock className="h-4 w-4 shrink-0 text-white/80" />
      <span>{submitLabel}</span>
    </>
  );

  return (
    <div className="bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-6 sm:p-7 shadow-sm lg:sticky lg:top-28 space-y-6">
      <h3 className="font-bold text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between">
        <span>فاکتور نهایی سفارش</span>
        <span className="text-xs font-bold text-primary-500 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-xl">
          {toPersianDigits(cart.length)} قلم کالا
        </span>
      </h3>

      <details className="group lg:hidden">
        <summary className="cursor-pointer list-none text-xs font-bold text-[var(--color-emphasis-text)]">
          مشاهدهٔ {toPersianDigits(cart.length)} قلم کالا
        </summary>
        <div className="mt-3 space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-xs">
              <span className="min-w-0 flex-1 truncate font-bold">{item.title}</span>
              <span className="shrink-0">{toPersianDigits(item.quantity)} × {formatPrice(item.price)}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Cart items scrollable overview */}
      <div className="hidden max-h-60 space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 lg:block">
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
              <div className="text-xs text-gray-400 font-medium mt-0.5">
                {toPersianDigits(item.quantity)} عدد × {formatPrice(item.price)}
              </div>
            </div>
            <div className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] shrink-0">
              {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Math */}
      <div className="space-y-3.5 pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-xs font-bold text-gray-600 dark:text-gray-400">
        <div className="flex justify-between items-center">
          <span>مجموع قیمت کالاها</span>
          <span className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">
            {formatPrice(cartTotal)}
          </span>
        </div>

        {appliedDiscount > 0 && (
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
            <span>
              سود شما از تخفیف {couponLabel ? `(${couponLabel})` : couponCode ? `(${couponCode})` : ''}
            </span>
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
              {formatPrice(shippingFee)}
            </span>
          )}
        </div>

        <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-4 flex justify-between items-center text-sm">
          <span className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">مبلغ نهایی فاکتور:</span>
          <div className="font-black text-2xl text-primary-600 dark:text-primary-400 tracking-tight">
            {formatPrice(finalPayable)}
          </div>
        </div>
      </div>

      {/* Final Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        aria-label={submitAria}
        className="btn-primary hidden w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-sm font-bold disabled:opacity-50 sm:text-base lg:flex"
      >
        {submitContent}
        {!submitting && (
          <ArrowLeft className="h-5 w-5 group-hover:translate-x-[-3px] transition-transform mr-auto" />
        )}
      </button>

      <div className="hidden lg:flex items-center justify-center gap-2 text-xs font-bold text-gray-400 pt-2 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>{reassurance}</span>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-50 pb-safe pointer-events-none lg:hidden">
          <div className="mx-3 mb-[76px] pointer-events-auto">
            <div className="surface-glass flex items-center gap-3 rounded-2xl p-3 text-right shadow-2xl">
              <div className="min-w-0 shrink-0">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">مبلغ نهایی</p>
                <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatPrice(finalPayable)}</p>
              </div>
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                aria-label={submitAria}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-cta)] px-3 text-xs font-bold text-white shadow-md disabled:opacity-50"
              >
                {submitContent}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
