import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function VipClubBanner() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = emailOrPhone.trim();
    if (!value) {
      addToast('لطفا ایمیل یا شماره موبایل خود را وارد کنید', 'error');
      return;
    }
    // Only email addresses go to the newsletter API; phone numbers are
    // accepted locally but the endpoint is email-based.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      addToast('لطفا یک آدرس ایمیل معتبر وارد کنید', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitted(true);
        addToast('عضویت در خبرنامه با موفقیت انجام شد!', 'success');
      } else {
        addToast(data.error || 'خطا در ثبت عضویت خبرنامه', 'error');
      }
    } catch {
      addToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-6 sm:p-10 md:p-12 overflow-hidden shadow-xl"
    >
      {/* Background Decorative Blur circles */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-black/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="text-right max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black mb-4 border border-white/30">
            <Sparkles className="h-4 w-4 text-yellow-300" /> باشگاه مشتریان جانبی آرنا
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 leading-tight tracking-tight">
            کد تخفیف ۱۵٪ هدیه اول عضویت!
          </h2>
          <p className="text-orange-100 text-sm sm:text-base font-medium leading-relaxed">
            با عضویت در خبرنامه از جدیدترین تخفیف‌های شگفت‌انگیز، جادویی‌ترین پکیج‌های لوازم جانبی و کوپن‌های اختصاصی باخبر شوید.
          </p>
        </div>

        <div className="w-full lg:w-auto min-w-[320px] sm:min-w-[420px]">
          {submitted ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/20 backdrop-blur-md p-6 rounded-2xl border border-white/30 text-center text-white"
            >
              <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-lg mb-1">عضویت با موفقیت انجام شد!</h3>
              <p className="text-xs text-orange-100 font-medium">از تخفیف‌های اختصاصی باشگاه مشتریان باخبر خواهید شد.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/25">
              <div className="relative grow">
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="شماره موبایل یا ایمیل..."
                  className="w-full bg-white text-gray-900 placeholder:text-gray-400 rounded-xl py-3.5 pr-4 pl-10 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white"
                />
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gray-900 hover:bg-black disabled:opacity-60 text-white px-6 py-3.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 shrink-0 shadow-lg active:scale-95"
              >
                <Gift className="h-4 w-4 text-orange-400" />
                {submitting ? 'در حال ثبت...' : 'دریافت هدیه'}
              </button>
            </form>
          )}
        </div>
      </div>
    </motion.section>
  );
}
