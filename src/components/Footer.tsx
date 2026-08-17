import React, { useState } from 'react';
import { Truck, HeadphonesIcon, Shield, CheckCircle, Send } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { FREE_SHIPPING_THRESHOLD } from '../lib/constants';

export default function Footer() {
  const [email, setEmail] = useState('');
  const { addToast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addToast('لطفا یک آدرس ایمیل معتبر وارد کنید', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/contact/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'با موفقیت در خبرنامه عضو شدید', 'success');
        setEmail('');
      } else {
        addToast(data.error || 'خطا در ثبت عضویت خبرنامه', 'error');
      }
    } catch {
      addToast('خطا در برقراری ارتباط با سرور', 'error');
    }
  };

  return (
    <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800 mt-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Value Propositions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 border-b border-gray-100 dark:border-gray-800 pb-12">
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100/80 dark:border-gray-800">
            <div className="p-2.5 rounded-xl bg-orange-100/80 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 shrink-0">
              <Truck className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm mb-0.5">ارسال سریع و رایگان</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">سفارش‌های بالای {FREE_SHIPPING_THRESHOLD.toLocaleString('fa-IR')} تومان</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100/80 dark:border-gray-800">
            <div className="p-2.5 rounded-xl bg-blue-100/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
              <HeadphonesIcon className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm mb-0.5">پشتیبانی تخصصی</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">۷ روز هفته، ۹ صبح تا ۹ شب</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100/80 dark:border-gray-800">
            <div className="p-2.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Shield className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm mb-0.5">۷ روز ضمانت بازگشت</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">تضمین سلامت فنی کالا</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100/80 dark:border-gray-800">
            <div className="p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
              <CheckCircle className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm mb-0.5">ضمانت اصالت کالا</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">۱۰۰٪ اورجینال با گارانتی معتبر</p>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800/80 dark:to-gray-800/40 p-6 rounded-2xl border border-orange-100/80 dark:border-gray-700/60">
           <div className="text-right">
              <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 mb-1">عضویت در خبرنامه جانبی آرنا</h4>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">از جدیدترین تخفیف‌ها و کدهای تخفیف ویژه باخبر شوید</p>
           </div>
           <form onSubmit={handleSubscribe} className="flex w-full md:w-auto max-w-md">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="آدرس ایمیل شما..." 
                className="grow bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-r-xl px-4 py-3 focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 text-left dir-ltr text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                required
              />
              <button type="submit" className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white px-5 rounded-l-xl flex items-center justify-center transition-colors font-medium">
                 <Send className="h-4 w-4" />
              </button>
           </form>
        </div>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-6 border-t border-gray-100 dark:border-gray-800">
          تمامی حقوق مادی و معنوی این سایت متعلق به فروشگاه آنلاین <span className="font-bold text-gray-700 dark:text-gray-300">جانبی آرنا</span> می‌باشد.
        </div>
      </div>
    </footer>
  );
}
