import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, Lock, Eye, EyeOff, LogIn, UserPlus, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { isValidIranianMobile, normalizeIranianMobile } from '../../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialMode]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedPhone = normalizeIranianMobile(phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      addToast('لطفاً شماره موبایل معتبر وارد کنید (مثلا ۰۹۱۲۳۴۵۶۷۸۹)', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        if (!password || password.length < 4) {
          addToast('رمز عبور باید حداقل ۴ کاراکتر باشد', 'error');
          setLoading(false);
          return;
        }
        const success = await login(normalizedPhone, password);
        if (success) {
          addToast('با موفقیت وارد شدید', 'success');
          onClose();
        }
      } else {
        if (!name.trim()) {
          addToast('لطفاً نام و نام خانوادگی خود را وارد کنید', 'error');
          setLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          addToast('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error');
          setLoading(false);
          return;
        }
        const success = await register(name, normalizedPhone, password);
        if (success) {
          addToast('حساب کاربری با موفقیت ایجاد شد', 'success');
          onClose();
        }
      }
    } catch (err: any) {
      addToast(err.message || 'خطایی رخ داد', 'error');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-right z-10 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Decorative subtle glows */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80 mb-5 relative">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-black text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                {mode === 'login' ? 'ورود به حساب کاربری' : 'ایجاد حساب کاربری جدید'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-2xl mb-6 border border-gray-200/50 dark:border-gray-700/50">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              ورود به حساب
            </button>

            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              ثبت‌نام جدید
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  نام و نام خانوادگی *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: علی رضایی"
                    className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 pr-10 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    required
                  />
                  <User className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

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
                  className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 pl-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  autoComplete="username"
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
                  className="w-full bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 pl-10 pr-10 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm mt-6 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'ورود به حساب کاربری' : 'تکمیل ثبت‌نام و ورود'}</span>
                  <ArrowLeft className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-4 pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/60 text-center text-[11px] text-gray-400 dark:text-gray-500 space-y-2">
            {mode === 'login' ? (
              <>
                <div>
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="font-bold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    رمز عبور خود را فراموش کرده‌اید؟
                  </Link>
                </div>
                <span>ورود شما به منزله پذیرش قوانین جانبی آرنا است.</span>
              </>
            ) : (
              <span>با ثبت‌نام، از تخفیف‌های ویژه مشتریان بهره‌مند می‌شوید.</span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
