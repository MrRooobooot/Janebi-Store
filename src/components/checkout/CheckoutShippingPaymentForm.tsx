import React from 'react';
import { Truck, CreditCard, Wallet, Zap, ShieldCheck } from 'lucide-react';
import { CheckoutFormData } from '../../hooks/useCheckoutForm';
import { formatPrice } from '../../lib/utils';
import { SHIPPING_FEES } from '../../lib/constants';

interface CheckoutShippingPaymentFormProps {
  formData: CheckoutFormData;
  updateField: (field: keyof CheckoutFormData, value: string) => void;
  isFreeShipping: boolean;
}

export default function CheckoutShippingPaymentForm({
  formData,
  updateField,
  isFreeShipping,
}: CheckoutShippingPaymentFormProps) {
  return (
    <div className="space-y-6">
      {/* Shipping Method Selection */}
      <div className="bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="font-black text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2 pb-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <Truck className="h-5 w-5 text-orange-500" />
          <span>شیوه ارسال سفارش</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            onClick={() => updateField('shippingMethod', 'express')}
            className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
              formData.shippingMethod === 'express'
                ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 shadow-xs'
                : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20'
            }`}
          >
            <div className="p-3 bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 rounded-2xl shrink-0">
              <Zap className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">پست پیشتاز هوایی</span>
                <span className="font-black text-xs text-orange-600 dark:text-orange-400">
                  {isFreeShipping ? 'رایگان' : formatPrice(SHIPPING_FEES.express)}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                سریع‌ترین شیوه ارسال، تحویل ظرف ۲۴ الی ۴۸ ساعت کاری
              </div>
            </div>
          </label>

          <label
            onClick={() => updateField('shippingMethod', 'standard')}
            className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
              formData.shippingMethod === 'standard'
                ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 shadow-xs'
                : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20'
            }`}
          >
            <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl shrink-0">
              <Truck className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">پست سفارشی زمینی</span>
                <span className="font-black text-xs text-orange-600 dark:text-orange-400">
                  {isFreeShipping ? 'رایگان' : formatPrice(SHIPPING_FEES.standard)}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                شیوه اقتصادی و مطمئن، تحویل ظرف ۳ الی ۵ روز کاری
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="font-black text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2 pb-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <CreditCard className="h-5 w-5 text-orange-500" />
          <span>شیوه پرداخت وجه</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            onClick={() => updateField('paymentMethod', 'online')}
            className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
              formData.paymentMethod === 'online'
                ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 shadow-xs'
                : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20'
            }`}
          >
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">درگاه پرداخت شتابی</span>
                <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  توصیه شده
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                اتصال مستقیم به شبکه بانکی با تمام کارت‌های عضو شتاب
              </div>
            </div>
          </label>

          <label
            onClick={() => updateField('paymentMethod', 'cod')}
            className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
              formData.paymentMethod === 'cod'
                ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 shadow-xs'
                : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20'
            }`}
          >
            <div className="p-3 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">پرداخت درب منزل (COD)</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                پرداخت وجه از طریق دستگاه کارت‌خوان مأمور پست هنگام تحویل کالا
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
