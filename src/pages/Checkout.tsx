import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import EmptyState from '../components/EmptyState';
import { useCheckoutForm } from '../hooks/useCheckoutForm';
import CheckoutStepsBar from '../components/checkout/CheckoutStepsBar';
import CheckoutRecipientForm from '../components/checkout/CheckoutRecipientForm';
import CheckoutShippingPaymentForm from '../components/checkout/CheckoutShippingPaymentForm';
import CheckoutOrderSummary from '../components/checkout/CheckoutOrderSummary';

export default function Checkout() {
  const shouldReduceMotion = useReducedMotion();
  const {
    cart,
    cartTotal,
    formData,
    updateField,
    isFreeShipping,
    shippingFee,
    finalPayable,
    submitting,
    handleCheckout,
  } = useCheckoutForm();

  if (cart.length === 0) {
    return (
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <EmptyState
          icon={<ShoppingCart className="h-16 w-16 text-gray-300 dark:text-gray-600 drop-shadow-xs" />}
          title="سبد خرید شما خالی است!"
          description="برای ثبت سفارش ابتدا باید محصولاتی را به سبد خرید اضافه کنید."
          actionText="مشاهده محصولات"
          actionLink="/products"
          className="bg-[var(--color-surface-light)]/80 dark:bg-[var(--color-surface-dark)]/80 backdrop-blur-xl rounded-3xl p-12 shadow-xs border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]"
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-right"
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-3">
          <span className="relative">
            اطلاعات ارسال
            <span className="absolute bottom-1 left-0 right-0 h-3 bg-orange-200/50 dark:bg-orange-500/20 -z-10 rounded-sm"></span>
          </span>
        </h1>
      </div>

      <CheckoutStepsBar />

      <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recipient details + Shipping & Payment Selection */}
        <div className="lg:col-span-8 space-y-8">
          <CheckoutRecipientForm formData={formData} updateField={updateField} />
          <CheckoutShippingPaymentForm
            formData={formData}
            updateField={updateField}
            isFreeShipping={isFreeShipping}
          />
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4">
          <CheckoutOrderSummary
            cart={cart}
            cartTotal={cartTotal}
            shippingFee={shippingFee}
            finalPayable={finalPayable}
            submitting={submitting}
            isFreeShipping={isFreeShipping}
          />
        </div>
      </form>
    </motion.div>
  );
}
