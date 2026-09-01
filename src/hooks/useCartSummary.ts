import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { authFetch } from '../lib/api';
import { FREE_SHIPPING_THRESHOLD } from '../lib/constants';

export function useCartSummary() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal, appliedCoupon, setAppliedCoupon } = useCart();
  const { addToast } = useToast();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponLabel, setCouponLabel] = useState('');
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
          let discount = 0;
          if (coupon.percent) {
            discount = Math.round(cartTotal * (coupon.percent / 100));
          } else if (coupon.amount) {
            discount = coupon.amount;
          }
          setAppliedDiscount(discount);
          setCouponLabel(coupon.label || coupon.code);
          setAppliedCoupon(coupon.code);
          addToast(`کد تخفیف ${coupon.code} با موفقیت اعمال شد`, 'success');
        } else {
          const message = data.message || 'کد تخفیف نامعتبر است';
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

  const finalTotal = Math.max(0, cartTotal - appliedDiscount);

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
    appliedDiscount,
    couponLabel,
    couponError,
    dismissCouponError: () => setCouponError(''),
    handleApplyCoupon,
    isFreeShipping,
    amountLeft,
    progressPercentage,
  };
}
