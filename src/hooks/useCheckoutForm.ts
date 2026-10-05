import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { isValidIranianMobile, normalizeIranianMobile, toEnglishDigits } from '../lib/utils';
import { authFetch } from '../lib/api';
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

export type CheckoutFieldErrorKey = 'name' | 'phone' | 'province' | 'city' | 'address' | 'postalCode';
export type CheckoutFieldErrors = Partial<Record<CheckoutFieldErrorKey, string>>;

const FIELD_ORDER: CheckoutFieldErrorKey[] = ['name', 'phone', 'province', 'city', 'address', 'postalCode'];
const FIELD_IDS: Record<CheckoutFieldErrorKey, string> = {
  name: 'checkout-name',
  phone: 'checkout-phone',
  province: 'checkout-province',
  city: 'checkout-city',
  address: 'checkout-address',
  postalCode: 'checkout-postal',
};

function collectFieldErrors(formData: CheckoutFormData): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  if (!formData.name.trim()) errors.name = 'نام تحویل‌گیرنده را وارد کنید';
  if (!isValidIranianMobile(normalizeIranianMobile(formData.phone))) {
    errors.phone = 'لطفا یک شماره موبایل معتبر وارد کنید (مثال: ۰۹۱۲۳۴۵۶۷۸۹)';
  }
  if (!formData.province) errors.province = 'استان را انتخاب کنید';
  if (!formData.city.trim()) errors.city = 'شهر را وارد کنید';
  if (!formData.address.trim()) errors.address = 'آدرس را وارد کنید';
  const postal = toEnglishDigits(formData.postalCode.trim());
  if (postal && !/^\d{10}$/.test(postal)) {
    errors.postalCode = 'کد پستی باید ۱۰ رقم باشد (یا خالی بگذارید)';
  }
  return errors;
}

export function useCheckoutForm() {
  const { cart, cartTotal, clearCart, appliedCoupon, couponDetails, couponDiscount, setAppliedCoupon } = useCart();
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
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});

  const isFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD;
  // Mirror the server exactly (server/routes/orders.ts) — never invent different numbers here.
  const shippingFee = isFreeShipping
    ? 0
    : formData.shippingMethod === 'express'
    ? SHIPPING_FEES.express
    : SHIPPING_FEES.standard;
  const finalPayable = Math.max(0, cartTotal + shippingFee - couponDiscount);

  const updateField = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field in FIELD_IDS) {
      setFieldErrors((prev) => {
        if (!prev[field as CheckoutFieldErrorKey]) return prev;
        const next = { ...prev };
        delete next[field as CheckoutFieldErrorKey];
        return next;
      });
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = collectFieldErrors(formData);
    const firstInvalid = FIELD_ORDER.find((key) => errors[key]);
    if (firstInvalid) {
      setFieldErrors(errors);
      addToast(errors[firstInvalid]!, 'error');
      document.getElementById(FIELD_IDS[firstInvalid])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFieldErrors({});

    const normalizedPhone = normalizeIranianMobile(formData.phone);
    const postal = toEnglishDigits(formData.postalCode.trim());

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
      const res = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
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

      // 401 = no session at all (refresh cookie failed) — Persian copy + login,
      // never the raw server string ("Unauthorized: No token provided").
      if (res.status === 401) {
        addToast('برای ثبت سفارش ابتدا وارد حساب خود شوید', 'error');
        navigate('/login?next=/checkout');
        return;
      }

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
          const paymentRes = await authFetch('/api/payment/request', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
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
    appliedCoupon,
    couponDetails,
    couponDiscount,
    formData,
    updateField,
    isFreeShipping,
    shippingFee,
    finalPayable,
    submitting,
    fieldErrors,
    handleCheckout,
  };
}
