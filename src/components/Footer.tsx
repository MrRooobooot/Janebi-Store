import React, { useState } from 'react';
import { Truck, HeadphonesIcon, Shield, CheckCircle, Send, Phone, Mail, Award, Smartphone } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { FREE_SHIPPING_THRESHOLD } from '../lib/constants';
import { useStoreSettings } from '../hooks/useStoreSettings';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { addToast } = useToast();
  const settings = useStoreSettings();

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
    <footer className="bg-[var(--color-surface-light)]/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800 mt-16 transition-colors duration-300 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Value Propositions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pb-12">
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-[var(--color-border-light)]/80 dark:border-[var(--color-border-dark)]">
            <div className="p-2.5 rounded-xl bg-orange-100/80 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 shrink-0">
              <Truck className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-xs sm:text-sm mb-0.5">ارسال سریع و رایگان</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">سفارش‌های بالای {settings.freeShippingThreshold.toLocaleString('fa-IR')} تومان</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-[var(--color-border-light)]/80 dark:border-[var(--color-border-dark)]">
            <div className="p-2.5 rounded-xl bg-blue-100/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
              <HeadphonesIcon className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-xs sm:text-sm mb-0.5">پشتیبانی تخصصی</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{settings.supportHours || '۷ روز هفته، ۹ صبح تا ۹ شب'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-[var(--color-border-light)]/80 dark:border-[var(--color-border-dark)]">
            <div className="p-2.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Shield className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-xs sm:text-sm mb-0.5">۷ روز ضمانت بازگشت</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">تضمین سلامت فنی کالا</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-[var(--color-border-light)]/80 dark:border-[var(--color-border-dark)]">
            <div className="p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
              <CheckCircle className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-xs sm:text-sm mb-0.5">ضمانت اصالت کالا</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">۱۰۰٪ اورجینال با گارانتی معتبر</p>
            </div>
          </div>
        </div>

        {/* Newsletter & Info & Trust Seal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-10 items-stretch">
          {/* About & Contact Info */}
          <div className="lg:col-span-4 space-y-4 text-right flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-600/25 shrink-0">
                  <Smartphone className="h-4 w-4 stroke-[2.4]" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-base font-black text-zinc-900 dark:text-white">جانبی</span>
                  <span className="text-base font-black bg-gradient-to-l from-orange-600 to-amber-500 bg-clip-text text-transparent">آرنا</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                مرجع تخصصی عرضه مستقیم انواع لوازم جانبی موبایل، شارژر، گلس، قاب و تجهیزات دیجیتال با ضمانت اصالت و سلامت فیزیکی.
              </p>
            </div>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 pt-2 font-medium border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/60">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-orange-500 shrink-0" />
                <span>تلفن پشتیبانی: <span dir="ltr" className="font-bold font-mono">{settings.phone}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-500 shrink-0" />
                <span>ایمیل: <span dir="ltr" className="font-bold font-mono">{settings.email}</span></span>
              </div>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800/80 dark:to-gray-800/40 p-6 rounded-3xl border border-orange-100/80 dark:border-gray-700/60 text-right">
            <div>
              <h4 className="text-base font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-1">عضویت در خبرنامه جانبی آرنا</h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">از جدیدترین تخفیف‌ها، پکیج‌ها و کدهای تخفیف اختصاصی باخبر شوید.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full mt-4">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="آدرس ایمیل شما..." 
                className="grow bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-r-2xl px-4 py-3 focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 text-left dir-ltr text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                required
              />
              <button 
                type="submit" 
                aria-label="ارسال عضویت در خبرنامه"
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white px-5 rounded-l-2xl flex items-center justify-center transition-colors font-medium cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Enamad Trust Seal Badge - Responsive Card */}
          <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center p-6 rounded-3xl bg-[var(--color-surface-light)] dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700 shadow-xs text-center">
            <span className="text-xs font-black text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-orange-500" />
              نماد اعتماد الکترونیکی
            </span>
            
            <a
              referrerPolicy="origin"
              target="_blank"
              rel="noreferrer"
              href="https://trustseal.enamad.ir/?id=7152119&Code=m5ul5GVYe8T1P3vUR5nqi0IJeI1JvnPU"
              title="نماد اعتماد الکترونیکی جانبی آرنا"
              className="w-28 h-28 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-2xl border border-gray-200/80 dark:border-gray-700 flex items-center justify-center p-2 shadow-inner hover:scale-105 transition-all duration-300 relative group overflow-hidden"
            >
              {!imgLoaded && !imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 animate-pulse text-[10px] text-gray-400 font-bold p-1">
                  <span>در حال بارگذاری نماد...</span>
                </div>
              )}
              <img
                referrerPolicy="origin"
                src="https://trustseal.enamad.ir/logo.aspx?id=7152119&Code=m5ul5GVYe8T1P3vUR5nqi0IJeI1JvnPU"
                alt="اینماد جانبی آرنا"
                onLoad={() => setImgLoaded(true)}
                onError={() => {
                  setImgError(true);
                  setImgLoaded(true);
                }}
                className={`max-w-full max-h-full object-contain cursor-pointer transition-opacity duration-300 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-gray-800 text-center">
                  <Award className="h-6 w-6 text-orange-500 mb-1" />
                  <span className="text-[10px] font-black text-gray-700 dark:text-gray-300">دارای اینماد رسمی</span>
                  <span className="text-[8px] text-gray-400">کلیک برای استعلام</span>
                </div>
              )}
            </a>

            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 font-bold">
              تایید هویت و صلاحیت کسب‌وکار
            </span>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          تمامی حقوق مادی و معنوی این سایت متعلق به فروشگاه آنلاین <span className="font-bold text-gray-700 dark:text-gray-300">جانبی آرنا</span> می‌باشد.
        </div>
      </div>
    </footer>
  );
}
