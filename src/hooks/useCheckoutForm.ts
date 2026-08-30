import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { isValidIranianMobile, normalizeIranianMobile, toEnglishDigits } from '../lib/utils';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEES } from '../lib/constants';

export interface CheckoutFormData {
  name: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  notes: string;
  paymentMethod: 'online' | 'cod';
  shippingMethod: 'express' | 'standard';
}

export function useCheckoutForm() {
  const { cart, cartTotal, clearCart, appliedCoupon, setAppliedCoupon } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CheckoutFormData>({
    name: '',
    phone: '',
    province: 'تهران',
    city: 'تهران',
    address: '',
    postalCode: '',
    notes: '',
    paymentMethod: 'online',
    shippingMethod: 'express',
  });

  const [submitting, setSubmitting] = useState(false);

  const isFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD;
  // Mirror the server exactly (server/routes/orders.ts) — never invent different numbers here.
  const shippingFee = isFreeShipping
    ? 0
    : formData.shippingMethod === 'express'
    ? SHIPPING_FEES.express
    : SHIPPING_FEES.standard;
  const finalPayable = cartTotal + shippingFee;

  const updateField = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedPhone = normalizeIranianMobile(formData.phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      addToast('لطفا یک شماره موبایل معتبر وارد کنید (مثال: ۰۹۱۲۳۴۵۶۷۸۹)', 'error');
      return;
    }

    if (!formData.name.trim() || !formData.province || !formData.city || !formData.address.trim()) {
      addToast('لطفا تمامی اطلاعات ضروری گیرنده را تکمیل کنید', 'error');
      return;
    }

    // Optional field, but if filled it must be a valid 10-digit Iranian postal code.
    const postal = toEnglishDigits(formData.postalCode.trim());
    if (postal && !/^\d{10}$/.test(postal)) {
      addToast('کد پستی باید ۱۰ رقم باشد (یا خالی بگذارید)', 'error');
      return;
    }

    setSubmitting(true);

    const orderPayload = {
      subtotal: cartTotal,
      shippingFee,
      total: finalPayable,
      paymentMethod: formData.paymentMethod,
      shippingMethod: formData.shippingMethod,
      recipient: {
        name: formData.name.trim(),
        phone: normalizedPhone,
        address: `${formData.province}، ${formData.city}، ${formData.address.trim()}`,
        postalCode: postal || undefined,
        notes: formData.notes,
      },
      items: cart.map((item) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        image: item.image,
        qty: item.quantity,
        brand: item.brand,
      })),
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          recipient: orderPayload.recipient,
          items: orderPayload.items.map(item => ({ productId: item.id, quantity: item.qty })),
          paymentMethod: orderPayload.paymentMethod,
          shippingMethod: orderPayload.shippingMethod,
          couponCode: appliedCoupon
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        addToast(data.message || 'خطا در ثبت سفارش', 'error');
        setSubmitting(false);
        return;
      }

      const createdOrder = data.order || {
        id: data.orderId || `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        status: 'processing',
        total: finalPayable,
      };

      clearCart();
      setAppliedCoupon(null);
      
      if (formData.paymentMethod === 'online') {
        try {
          const paymentRes = await fetch('/api/payment/request', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ orderId: createdOrder.id })
          });
          const paymentData = await paymentRes.json().catch(() => ({}));
          if (paymentRes.ok && paymentData.url) {
            window.location.href = paymentData.url;
            return; // Exit here, let the browser redirect
          } else {
            // Surface the server's Persian message (e.g. gateway not configured).
            addToast(paymentData.error || 'خطا در اتصال به درگاه پرداخت.', 'error');
            navigate('/profile?tab=orders');
          }
        } catch (paymentErr) {
          addToast('خطا در ارتباط با درگاه پرداخت.', 'error');
          navigate('/profile?tab=orders');
        }
      } else {
        addToast(`سفارش شما با کد ${createdOrder.id} با موفقیت ثبت شد`, 'success');
        navigate('/profile?tab=orders');
      }
    } catch (err) {
      console.error(err);
      addToast('خطا در ارتباط با سرور.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    cart,
    cartTotal,
    formData,
    updateField,
    isFreeShipping,
    shippingFee,
    finalPayable,
    submitting,
    handleCheckout,
  };
}
