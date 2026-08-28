import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Phone, Lock, Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { isValidIranianMobile, normalizeIranianMobile } from '../lib/utils';

export default function Register() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast('لطفاً نام و نام خانوادگی را وارد کنید', 'error');
      return;
    }

    const normalizedPhone = normalizeIranianMobile(phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      addToast('لطفاً شماره موبایل معتبر وارد کنید (مثلا ۰۹۱۲۳۴۵۶۷۸۹)', 'error');
      return;
    }

    if (!password || password.length < 6) {
      addToast('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error');
      return;
    }

    if (password !== confirmPassword) {
      addToast('تکرار رمز عبور مطابقت ندارد', 'error');
      return;
    }

    if (!agreeTerms) {
      addToast('لطفاً قوانین و شرایط استفاده را تأیید کنید', 'error');
      return;
    }

    const success = await register(name, normalizedPhone, password);
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
        className="w-full max-w-md bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 mb-3">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            ایجاد حساب جدید
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
            به خانواده مشتریان جانبی استور بپیوندید!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              نام و نام خانوادگی *
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلا: علی رضایی"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 pr-10 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                required
              />
              <User className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

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
                className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
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
                className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 pr-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
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

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              تکرار رمز عبور *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 pl-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                required
              />
              <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400 font-medium pt-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="rounded-md border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span>
              قوانین و حریم خصوصی را مطالعه کرده و می‌پذیرم
            </span>
          </label>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 text-sm mt-6"
          >
            <span>ثبت‌نام و عضویت</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-center text-xs font-medium text-gray-500">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link to="/login" className="font-extrabold text-orange-600 dark:text-orange-400 hover:underline">
            وارد شوید
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
