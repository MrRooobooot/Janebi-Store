import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, LogIn, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { isValidIranianMobile, normalizeIranianMobile } from '../lib/utils';

export default function Login() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password OTP states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeIranianMobile(forgotPhone);
    if (!isValidIranianMobile(normalized)) {
      addToast('لطفاً شماره موبایل معتبر وارد کنید', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'کد تایید ارسال شد', 'success');
        setForgotStep(2);
      } else {
        addToast(data.message || 'خطا در ارسال کد تایید', 'error');
      }
    } catch {
      addToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeIranianMobile(forgotPhone);
    if (!resetOtpCode || resetOtpCode.length < 5) {
      addToast('کد تایید باید ۵ رقمی باشد', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      addToast('رمز عبور جدید باید حداقل ۴ کاراکتر باشد', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalized,
          code: resetOtpCode.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'رمز عبور با موفقیت تغییر کرد', 'success');
        setShowForgotModal(false);
        setForgotStep(1);
        setResetOtpCode('');
        setNewPassword('');
      } else {
        addToast(data.message || 'خطا در تغییر رمز عبور', 'error');
      }
    } catch {
      addToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedPhone = normalizeIranianMobile(phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      addToast('لطفاً شماره موبایل معتبر وارد کنید (مثلا ۰۹۱۲۳۴۵۶۷۸۹)', 'error');
      return;
    }

    if (!password || password.length < 4) {
      addToast('رمز عبور باید حداقل ۴ کاراکتر باشد', 'error');
      return;
    }

    const success = await login(normalizedPhone, password);
    if (success) {
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-right">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 mb-3">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
            ورود به حساب کاربری
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
            خوش آمدید! برای مدیریت سفارش‌ها وارد شوید.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              شماره موبایل *
            </label>
            <div className="relative">
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-left text-xs font-mono font-bold text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                required
              />
              <Phone className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              رمز عبور *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 pr-10 text-left text-xs font-mono font-bold text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                required
              />
              <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded-md border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span>مرا به خاطر داشته باش</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)} 
              className="text-orange-600 dark:text-orange-400 hover:underline font-bold"
            >
              رمز عبور را فراموش کرده‌اید؟
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 text-sm mt-6"
          >
            <span>ورود به حساب</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center text-xs font-medium text-gray-500">
          حساب کاربری ندارید؟{' '}
          <Link to="/register" className="font-extrabold text-orange-600 dark:text-orange-400 hover:underline">
            ثبت‌نام کنید
          </Link>
        </div>
      </motion.div>

      {/* Forgot Password OTP Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-2">بازیابی رمز عبور</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              {forgotStep === 1 
                ? 'شماره موبایل خود را وارد کنید تا کد تایید پیامک شود.' 
                : 'کد تایید پیامک شده و رمز عبور جدید خود را وارد کنید.'}
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">شماره موبایل</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 text-xs font-mono font-bold text-gray-900 dark:text-gray-100 text-left focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 disabled:opacity-60"
                  >
                    {forgotLoading ? 'در حال ارسال...' : 'ارسال کد تایید'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">کد تایید ۵ رقمی</label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={5}
                    value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value)}
                    placeholder="12345"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 text-center text-sm font-mono font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 tracking-widest"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">رمز عبور جدید</label>
                  <input
                    type="password"
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 text-xs font-mono font-bold text-gray-900 dark:text-gray-100 text-left focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 disabled:opacity-60"
                  >
                    {forgotLoading ? 'در حال ثبت...' : 'تغییر رمز عبور'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
