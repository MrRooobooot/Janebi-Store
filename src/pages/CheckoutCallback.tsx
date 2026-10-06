import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, ArrowRight, ShoppingBag, Clock } from 'lucide-react';
import { authFetch } from '../lib/api';

export default function CheckoutCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const status = searchParams.get('status');
  const orderId = searchParams.get('orderId');
  const refId = searchParams.get('ref_id');
  const message = searchParams.get('message');

  const isSuccess = status === 'success';
  // Gateway session died (expired authority / our 45min window): the order is
  // still payable, so this is a "retry" screen — not a payment failure.
  const isExpired = status === 'expired';
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  useEffect(() => {
    if (!status) {
      navigate('/', { replace: true });
    }
  }, [status, navigate]);

  // The previous history entry is the bank or Zarinpal. Back from here must
  // stay on the store: that gateway page rejects a request with no Referer.
  useEffect(() => {
    if (!status) return;
    const leaveGateway = () => navigate('/profile?tab=orders', { replace: true });
    window.history.pushState({ storeCallback: true }, '');
    window.addEventListener('popstate', leaveGateway);
    return () => window.removeEventListener('popstate', leaveGateway);
  }, [status, navigate]);

  const retryPayment = async () => {
    if (!orderId || retrying) return;
    setRetrying(true);
    setRetryError('');
    try {
      const res = await authFetch('/api/payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setRetryError(data.error || 'اتصال به درگاه برقرار نشد. از سفارش‌های من دوباره پرداخت کنید.');
    } catch {
      setRetryError('اتصال به درگاه برقرار نشد. از سفارش‌های من دوباره پرداخت کنید.');
    } finally {
      setRetrying(false);
    }
  };

  if (!status) return null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-2xl p-8 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xl text-center"
      >
        <div className="mb-6 flex justify-center">
          {isSuccess ? (
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full"></div>
              <CheckCircle2 className="h-20 w-20 text-emerald-500 relative z-10" />
            </div>
          ) : isExpired ? (
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full"></div>
              <Clock className="h-20 w-20 text-amber-500 relative z-10" />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 rounded-full"></div>
              <XCircle className="h-20 w-20 text-red-500 relative z-10" />
            </div>
          )}
        </div>

        <h1 className={`text-2xl font-black mb-2 ${isSuccess ? 'text-emerald-600 dark:text-emerald-400' : isExpired ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
          {isSuccess ? 'پرداخت با موفقیت انجام شد' : isExpired ? 'زمان پرداخت این سفارش به پایان رسید' : 'پرداخت ناموفق بود'}
        </h1>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {isSuccess 
            ? 'سفارش شما با موفقیت ثبت شد و در اسرع وقت پردازش خواهد شد.' 
            : isExpired
              ? ((message && /[\u0600-\u06FF]/.test(message)) ? message : 'سفارش شما همچنان فعال است؛ می‌توانید همین سفارش را دوباره پرداخت کنید.')
              : (message && /[\u0600-\u06FF]/.test(message)) ? message : 'متأسفانه در فرآیند پرداخت خطایی رخ داد یا پرداخت توسط شما لغو شد.'}
        </p>

        <div className="bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] rounded-2xl p-4 mb-8 space-y-3 text-right">
          {orderId && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">شماره سفارش:</span>
              <span className="font-bold text-[var(--color-text-main-light)] dark:text-white dir-ltr latin-nums">{orderId}</span>
            </div>
          )}
          {refId && isSuccess && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">کد پیگیری تراکنش:</span>
              <span className="font-bold text-[var(--color-text-main-light)] dark:text-white dir-ltr latin-nums">{refId}</span>
            </div>
          )}
        </div>

        {retryError && (
          <p className="mb-4 text-sm font-bold text-rose-600 dark:text-rose-400">{retryError}</p>
        )}

        <div className="flex flex-col gap-3">
          {!isSuccess && orderId && (
            <button
              type="button"
              onClick={retryPayment}
              disabled={retrying}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white disabled:opacity-60"
            >
              {retrying ? 'در حال اتصال به درگاه…' : 'پرداخت دوبارهٔ همین سفارش'}
            </button>
          )}
          <Link 
            to="/profile?tab=orders"
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-cta)] py-3.5 font-bold text-white hover:bg-[var(--color-cta-hover)]"
          >
            <ShoppingBag className="h-5 w-5" />
            مشاهده سفارشات من
          </Link>
          
          <Link 
            to="/"
            className="w-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-gray-700 dark:text-gray-300 hover:bg-[var(--color-canvas-light)] dark:hover:bg-gray-800 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>بازگشت به صفحه اصلی</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
