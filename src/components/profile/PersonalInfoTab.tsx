import React, { useState } from 'react';
import { User, Phone, Mail, Lock, ShieldCheck, Camera, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { normalizeIranianMobile } from '../../lib/utils';
import { authFetch } from '../../lib/api';

const AVATARS = [
  '/avatar.svg',
];

export default function PersonalInfoTab() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATARS[0]);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('نام نمی‌تواند خالی باشد', 'error');
      return;
    }

    updateProfile({
      name: name.trim(),
      phone: normalizeIranianMobile(phone),
      email: email.trim(),
      avatar: selectedAvatar,
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      addToast('لطفاً همه فیلدهای کلمه عبور را تکمیل کنید', 'error');
      return;
    }
    if (newPassword.length < 4) {
      addToast('کلمه عبور جدید باید حداقل ۴ کاراکتر باشد', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      addToast('لطفاً ابتدا وارد حساب کاربری شوید', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authFetch('/api/users/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'کلمه عبور با موفقیت تغییر یافت', 'success');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        addToast(data.error || data.message || 'خطا در به‌روزرسانی کلمه عبور', 'error');
      }
    } catch (err) {
      addToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Profile Form */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <h2 className="font-extrabold text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <User className="h-5 w-5 text-orange-500" />
          <span>اطلاعات حساب کاربری</span>
        </h2>

        {/* Avatar Picker */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            تصویر پروفایل
          </label>
          <div className="flex items-center gap-4">
            {AVATARS.map((av, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedAvatar(av)}
                className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                  selectedAvatar === av
                    ? 'border-orange-500 scale-105 shadow-md shadow-orange-500/20'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={av} alt="آواتار" width="56" height="56" loading="lazy" decoding="async" className="w-14 h-14 object-cover" />
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                نام و نام خانوادگی
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl py-3 px-4 pr-10 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                  required
                />
                <User className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                شماره موبایل
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl py-3 px-4 pl-10 text-left font-mono text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                  required
                />
                <Phone className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              آدرس ایمیل (اختیاری)
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl py-3 px-4 pr-10 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
              />
              <Mail className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            ذخیره تغییرات حساب
          </button>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <h2 className="font-extrabold text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <ShieldCheck className="h-5 w-5 text-orange-500" />
          <span>تغییر کلمه عبور</span>
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                کلمه عبور فعلی
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="ltr"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl py-3 px-4 pl-10 text-left font-mono text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                />
                <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                کلمه عبور جدید
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl py-3 px-4 pl-10 text-left font-mono text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                />
                <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="bg-gray-900 dark:bg-orange-500 hover:bg-black dark:hover:bg-orange-600 text-white font-bold text-xs px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {passwordLoading ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی کلمه عبور'}
          </button>
        </form>
      </div>
    </div>
  );
}
