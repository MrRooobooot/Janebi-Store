import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, ArrowRight, ShoppingBag } from 'lucide-react';

export default function CheckoutCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const status = searchParams.get('status');
  const orderId = searchParams.get('orderId');
  const refId = searchParams.get('ref_id');
  const message = searchParams.get('message');

  const isSuccess = status === 'success';

  useEffect(() => {
    if (!status) {
      navigate('/');
    }
  }, [status, navigate]);

  if (!status) return null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-8 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xl text-center"
      >
        <div className="mb-6 flex justify-center">
          {isSuccess ? (
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full"></div>
              <CheckCircle2 className="h-20 w-20 text-emerald-500 relative z-10" />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 rounded-full"></div>
              <XCircle className="h-20 w-20 text-red-500 relative z-10" />
            </div>
          )}
        </div>

        <h1 className={`text-2xl font-black mb-2 ${isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {isSuccess ? 'پرداخت با موفقیت انجام شد' : 'پرداخت ناموفق بود'}
        </h1>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {isSuccess 
            ? 'سفارش شما با موفقیت ثبت شد و در اسرع وقت پردازش خواهد شد.' 
            : message || 'متأسفانه در فرآیند پرداخت خطایی رخ داد یا پرداخت توسط شما لغو شد.'}
        </p>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-8 space-y-3 text-right">
          {orderId && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">شماره سفارش:</span>
              <span className="font-bold text-[var(--color-text-main-light)] dark:text-white dir-ltr">{orderId}</span>
            </div>
          )}
          {refId && isSuccess && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">کد پیگیری تراکنش:</span>
              <span className="font-bold text-[var(--color-text-main-light)] dark:text-white dir-ltr">{refId}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Link 
            to="/profile?tab=orders"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ShoppingBag className="h-5 w-5" />
            مشاهده سفارشات من
          </Link>
          
          <Link 
            to="/"
            className="w-full bg-[var(--color-surface-light)] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>بازگشت به صفحه اصلی</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
