import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Phone, Mail, Award, PackageSearch } from 'lucide-react';
import Logo from './Logo';
import { useToast } from '../contexts/ToastContext';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { toPersianDigits } from '../lib/utils';
import { jsonFetch } from '../lib/jsonFetch';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [sealSrc, setSealSrc] = useState('https://trustseal.enamad.ir/logo.aspx?id=7152119&Code=m5ul5GVYe8T1P3vUR5nqi0IJeI1JvnPU');
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
      const data = await jsonFetch<{ message?: string }>('/api/contact/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      addToast(data.message || 'با موفقیت در خبرنامه عضو شدید', 'success');
      setEmail('');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور', 'error');
    }
  };

  return (
    <footer className="bg-zinc-50/90 dark:bg-[var(--color-surface-footer-dark)]/95 border-t border-zinc-200/80 dark:border-white/[0.08] mt-16 transition-colors duration-300 w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-3 py-8 sm:px-6 lg:px-8">
        {/* Newsletter & Info & Trust Seal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-8 mb-8">
          {/* About & Contact Info */}
          <div className="lg:col-span-3 flex flex-col space-y-4 text-right">
            <div className="space-y-2">
              <Logo size="sm" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                مرجع تخصصی عرضه مستقیم هولدر و نگهدارنده، کابل و سیم موبایل با ضمانت اصالت و سلامت فیزیکی.
              </p>
            </div>
            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 pt-2 font-medium border-t border-zinc-200/80 dark:border-zinc-800">
              {settings.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[var(--color-emphasis-text)] shrink-0" />
                  <span>تلفن پشتیبانی: <span dir="ltr" className="font-bold tabular-nums">{toPersianDigits(settings.phone)}</span></span>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--color-emphasis-text)] shrink-0" />
                <span>ایمیل: <span dir="ltr" className="font-bold tabular-nums">{settings.email}</span></span>
              </div>
            </div>
          </div>

          {/* Links column (§2.7 / §9): quick customer links incl. order tracking */}
          <div className="space-y-3 text-right lg:col-span-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">دسترسی سریع</h3>
            <nav className="grid grid-cols-2 gap-x-4 gap-y-0 text-xs text-zinc-600 dark:text-zinc-400" aria-label="لینک‌های فوتر">
              {[
                { to: '/profile?tab=orders', label: 'پیگیری سفارش', icon: true },
                { to: '/about', label: 'درباره ما' },
                { to: '/contact', label: 'تماس با ما' },
                { to: '/faq', label: 'پرسش‌های متداول' },
                { to: '/blog', label: 'مجله' },
                { to: '/terms', label: 'قوانین' },
                { to: '/privacy', label: 'حریم خصوصی' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="inline-flex items-center gap-2 min-h-11 py-1 font-bold whitespace-nowrap hover:text-[var(--color-emphasis-text)] transition-colors"
                >
                  {item.icon ? <PackageSearch className="h-4 w-4 text-[var(--color-emphasis-text)] shrink-0" /> : null}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Newsletter Section */}
          <div className="flex flex-col text-right lg:col-span-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">عضویت در خبرنامه جانبی آرنا</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">از جدیدترین تخفیف‌ها، پکیج‌ها و کدهای تخفیف اختصاصی باخبر شوید.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full mt-4">
              <label htmlFor="newsletter-email" className="sr-only">ایمیل خبرنامه</label>
              <input 
                id="newsletter-email"
                name="newsletter-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="آدرس ایمیل شما..." 
                className="grow min-w-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-r-2xl px-4 py-3 focus:outline-none focus:border-[var(--color-cta)] text-left dir-ltr text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                required
              />
              <button 
                type="submit" 
                aria-label="ارسال عضویت در خبرنامه"
                className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] active:bg-[var(--color-cta-active)] text-white px-4 min-h-11 min-w-11 rounded-l-2xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Enamad Trust Seal Badge - Responsive Card */}
          <div className="flex flex-col items-center md:items-start lg:items-center text-center md:col-span-2 lg:col-span-3">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[var(--color-emphasis-text)]" />
              نماد اعتماد الکترونیکی
            </span>
            
            <a
              referrerPolicy="origin"
              target="_blank"
              rel="noopener"
              href="https://trustseal.enamad.ir/?id=7152119&Code=m5ul5GVYe8T1P3vUR5nqi0IJeI1JvnPU"
              title="نماد اعتماد الکترونیکی جانبی آرنا"
              className="enamad-tile relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2"
            >
              {!imgLoaded && !imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 text-xs text-zinc-600 dark:text-zinc-400 font-bold p-1">
                  <span>در حال بارگذاری نماد...</span>
                </div>
              )}
              <img
                referrerPolicy="origin"
                loading="lazy"
                src={sealSrc}
                alt="نماد اعتماد الکترونیکی جانبی آرنا"
                width="112"
                height="112"
                decoding="async"
                onLoad={() => {
                  setImgLoaded(true);
                  setImgError(false);
                }}
                onError={() => {
                  if (sealSrc !== '/enamad-logo.png') {
                    setSealSrc('/enamad-logo.png');
                  } else {
                    setImgError(true);
                    setImgLoaded(true);
                  }
                }}
                className={`w-full h-full object-contain cursor-pointer transition-opacity duration-300 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-zinc-100 text-center">
                  <Award className="h-6 w-6 text-[var(--color-emphasis-text)] mb-1" />
                  <span className="text-xs font-bold text-zinc-700">دارای اینماد رسمی</span>
                  <span className="text-[8px] text-zinc-400">کلیک برای استعلام</span>
                </div>
              )}
            </a>

            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 font-bold">
              تایید هویت و صلاحیت کسب‌وکار
            </span>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 pt-6 border-t border-zinc-200/80 dark:border-zinc-800">
          تمامی حقوق مادی و معنوی این سایت متعلق به فروشگاه آنلاین <span className="font-bold text-zinc-700 dark:text-zinc-300">جانبی آرنا</span> می‌باشد.
        </div>
      </div>
    </footer>
  );
}
