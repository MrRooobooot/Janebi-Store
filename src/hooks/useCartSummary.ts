import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { authFetch } from '../lib/api';
import { FREE_SHIPPING_THRESHOLD } from '../lib/constants';

export function useCartSummary() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal, appliedCoupon, couponDetails, couponDiscount, setAppliedCoupon } = useCart();
  const { addToast } = useToast();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponLabel, setCouponLabel] = useState(() => couponDetails?.label || couponDetails?.code || appliedCoupon || '');
  const [couponError, setCouponError] = useState('');

  const isFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD;
  const amountLeft = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const progressPercentage = Math.min(
    100,
    Math.round((cartTotal / FREE_SHIPPING_THRESHOLD) * 100)
  );

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponLoading(true);
    setCouponError('');
    authFetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponInput.trim(), cartTotal }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.coupon) {
          const coupon = data.coupon;
          setCouponLabel(coupon.label || coupon.code);
          setAppliedCoupon(coupon.code, {
            code: coupon.code,
            percent: coupon.percent,
            amount: coupon.amount,
            minTotal: coupon.minTotal,
            label: coupon.label || coupon.code,
            usageLimit: coupon.usageLimit,
            usedCount: coupon.usedCount,
          });
          addToast(`کد تخفیف ${coupon.code} با موفقیت اعمال شد`, 'success');
        } else {
          const message = data.message || data.error || 'کد تخفیف نامعتبر است';
          setCouponError(message);
          addToast(message, 'error');
        }
      })
      .catch(() => {
        setCouponError('خطا در اعتبارسنجی کد تخفیف');
        addToast('خطا در اعتبارسنجی کد تخفیف', 'error');
      })
      .finally(() => {
        setCouponLoading(false);
      });
  };

  const finalTotal = Math.max(0, cartTotal - couponDiscount);

  return {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    finalTotal,
    couponInput,
    setCouponInput,
    couponLoading,
    appliedDiscount: couponDiscount,
    couponLabel,
    couponError,
    dismissCouponError: () => setCouponError(''),
    handleApplyCoupon,
    isFreeShipping,
    amountLeft,
    progressPercentage,
  };
}
