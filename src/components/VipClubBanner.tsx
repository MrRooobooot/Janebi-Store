import React, { useState, useEffect, useRef } from 'react';
import { Gift, CheckCircle2, Check, Copy } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { jsonFetch } from '../lib/jsonFetch';
import { normalizeIranianMobile, isValidIranianMobile } from '../lib/utils';
import { Smartphone } from 'lucide-react';

interface VipClubBannerProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  couponCode?: string;
}

export default function VipClubBanner({ badge, title, subtitle, couponCode }: VipClubBannerProps) {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();
  // R2-09: reset timer is cleared on unmount.
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const copyCoupon = async () => {
    if (!couponCode) return;
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
      addToast('کد تخفیف کپی شد!', 'success');
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('کپی کد انجام نشد — لطفاً دستی کپی کنید', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Phone-only membership (user: «واقعا کار کنه و فقط شماره موبایل») —
    // normalized server-side into newsletter_subscribers with phone: prefix.
    const normalized = normalizeIranianMobile(phone);
    if (!isValidIranianMobile(normalized)) {
      addToast('لطفا شماره موبایل معتبر وارد کنید (۰۹...)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await jsonFetch('/api/contact/newsletter', {
        method: 'POST',
        body: JSON.stringify({ phone: normalized }),
      });
      setSubmitted(true);
      addToast('عضویت شما با موفقیت ثبت شد!', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="reveal-in-view flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
      <div className="max-w-xl text-right">
        <p className="text-xs text-slate-500">{badge}</p>
        <h2 className="mt-1 text-lg font-black leading-tight text-slate-900 dark:text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          {subtitle}
        </p>
      </div>

      <div className="w-full max-w-full lg:w-96">
        {submitted ? (
          <div className="pop-in text-right">
            <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-600" />
            <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">عضویت با موفقیت انجام شد!</h3>
            <p className="mb-3 text-xs font-medium text-slate-600 dark:text-slate-300">از تخفیف‌های اختصاصی باشگاه مشتریان باخبر خواهید شد.</p>
            {couponCode && (
              <button
                type="button"
                onClick={copyCoupon}
                title="کلیک برای کپی کد تخفیف"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 dark:border-white/20"
              >
                <span dir="ltr" className="font-mono text-xl font-bold tracking-widest text-[var(--color-cta)]">{couponCode}</span>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative grow">
              <input
                id="vip-phone"
                name="vipPhone"
                autoComplete="tel"
                aria-label="شماره موبایل برای عضویت در باشگاه"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                dir="ltr"
                placeholder="۰۹۱۲ ××× ××××"
                className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pr-4 pl-10 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[var(--color-cta)] dark:border-white/15 dark:bg-[var(--color-surface-dark)] dark:text-white sm:text-sm"
              />
              <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex shrink-0 cursor-pointer items-center justify-center gap-2 px-6 py-3.5 text-xs font-bold sm:text-sm"
            >
              <Gift className="h-4 w-4" />
              {submitting ? 'در حال ثبت...' : 'دریافت هدیه'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
