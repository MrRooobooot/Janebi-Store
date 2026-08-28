import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCartSummary } from '../hooks/useCartSummary';
import EmptyState from '../components/EmptyState';
import FreeShippingBar from '../components/cart/FreeShippingBar';
import CartItemList from '../components/cart/CartItemList';
import CartSummaryCard from '../components/cart/CartSummaryCard';
import { motion } from 'motion/react';
import { toPersianDigits } from '../lib/utils';

export default function Cart() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    finalTotal,
    couponInput,
    setCouponInput,
    couponLoading,
    appliedDiscount,
    couponLabel,
    handleApplyCoupon,
    isFreeShipping,
    amountLeft,
    progressPercentage,
  } = useCartSummary();

  if (cart.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <EmptyState
          icon={<ShoppingCart className="h-16 w-16 text-gray-300 dark:text-gray-600 drop-shadow-xs" />}
          title="سبد خرید شما خالی است!"
          description="می‌توانید برای مشاهده محصولات و اضافه کردن آن‌ها به سبد خرید، به صفحه فروشگاه سر بزنید."
          actionText="مشاهده محصولات"
          actionLink="/products"
          className="bg-[var(--color-surface-light)]/80 dark:bg-[var(--color-surface-dark)]/80 backdrop-blur-xl rounded-3xl p-12 shadow-xs border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]"
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-right"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-3">
          <span className="relative">
            سبد خرید
            <span className="absolute bottom-1 left-0 right-0 h-3 bg-orange-200/50 dark:bg-orange-500/20 -z-10 rounded-sm"></span>
          </span>
          <span className="text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full">
            {toPersianDigits(cart.length)} کالا
          </span>
        </h1>
      </div>

      {/* Checkout Stepper Progress */}
      <div className="flex items-center justify-between max-w-2xl mx-auto mb-12 relative px-4">
        <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-gray-200 dark:bg-gray-800 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 w-1/4 rounded-full"></div>
        </div>

        <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-950 px-2 sm:px-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-orange-500/30">
            ۱
          </div>
          <span className="text-xs font-black text-orange-600 dark:text-orange-400">سبد خرید</span>
        </div>
        <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-950 px-2 sm:px-4">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-surface-light)] dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-base">
            ۲
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">اطلاعات ارسال</span>
        </div>
        <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-950 px-2 sm:px-4">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-surface-light)] dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-base">
            ۳
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">پرداخت</span>
        </div>
      </div>

      {/* Free Shipping Progress Indicator */}
      <FreeShippingBar
        isFreeShipping={isFreeShipping}
        amountLeft={amountLeft}
        progressPercentage={progressPercentage}
      />

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Item List */}
        <div className="lg:col-span-8">
          <CartItemList
            cart={cart}
            removeFromCart={removeFromCart}
            updateQuantity={updateQuantity}
            clearCart={clearCart}
          />
        </div>

        {/* Summary Card Sidebar */}
        <div className="lg:col-span-4">
          <CartSummaryCard
            cartTotal={cartTotal}
            finalTotal={finalTotal}
            couponInput={couponInput}
            setCouponInput={setCouponInput}
            couponLoading={couponLoading}
            appliedDiscount={appliedDiscount}
            couponLabel={couponLabel}
            handleApplyCoupon={handleApplyCoupon}
            isFreeShipping={isFreeShipping}
          />
        </div>
      </div>
    </motion.div>
  );
}
