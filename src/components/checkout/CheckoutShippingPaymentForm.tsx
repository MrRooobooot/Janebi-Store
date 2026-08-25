import React from 'react';
import { Truck, CreditCard, Wallet } from 'lucide-react';
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
      {/* Shipping Method */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
          <Truck className="h-5 w-5 text-orange-500" />
          <span>روش ارسال</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            onClick={() => updateField('shippingMethod', 'express')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
              formData.shippingMethod === 'express'
                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-200'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            <div className="p-3 bg-orange-100 dark:bg-orange-500/20 text-orange-600 rounded-xl">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-xs">پست پیشتاز (سریع)</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                تحویل ۲۴ تا ۴۸ ساعت کاری
              </div>
              <div className="font-extrabold text-xs text-orange-600 dark:text-orange-400 mt-1">
                {isFreeShipping ? 'رایگان' : formatPrice(SHIPPING_FEES.express)}
              </div>
            </div>
          </label>

          <label
            onClick={() => updateField('shippingMethod', 'standard')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
              formData.shippingMethod === 'standard'
                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-200'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-xs">پست سفارشی (معمولی)</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                تحویل ۳ تا ۵ روز کاری
              </div>
              <div className="font-extrabold text-xs text-orange-600 dark:text-orange-400 mt-1">
                {isFreeShipping ? 'رایگان' : formatPrice(SHIPPING_FEES.standard)}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
          <CreditCard className="h-5 w-5 text-orange-500" />
          <span>روش پرداخت</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            onClick={() => updateField('paymentMethod', 'online')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
              formData.paymentMethod === 'online'
                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-200'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-xl">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-xs">پرداخت آنلاین شتابی</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                تمامی کارت‌های عضو شتاب
              </div>
            </div>
          </label>

          <label
            onClick={() => updateField('paymentMethod', 'cod')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
              formData.paymentMethod === 'cod'
                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-200'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-xl">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-xs">پرداخت در محل (COD)</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                پرداخت هنگام دریافت سفارش
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
