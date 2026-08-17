import React, { useState, useEffect } from 'react';
import { Settings, Save, Phone, Mail, MapPin, Clock, Truck, Megaphone, Check } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface StoreSettingsData {
  storeName: string;
  phone: string;
  email: string;
  supportHours: string;
  address: string;
  freeShippingThreshold: number;
  announcement: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettingsData>({
    storeName: 'جانبی آرنا',
    phone: '۰۲۱-۸۸۸۸۹۹۹۹',
    email: 'info@janebi-arena.ir',
    supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
    address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
    freeShippingThreshold: 2000000,
    announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'تنظیمات با موفقیت ذخیره شد', 'success');
      } else {
        addToast('خطا در ذخیره تنظیمات', 'error');
      }
    } catch {
      addToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-400 text-xs">در حال بارگذاری تنظیمات...</div>;
  }

  return (
    <div className="space-y-6 text-right max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-orange-500" />
            تنظیمات کلی فروشگاه
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            پیکربندی اطلاعات تماس، آستانه ارسال رایگان و بنرهای سراسری سایت
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700/60 pb-3 flex items-center gap-2">
            اطلاعات هویتی و تماس فروشگاه
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                نام برند فروشگاه
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-orange-500" />
                تلفن تماس پشتیبانی
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-orange-500" />
                ایمیل رسمی پشتیبانی
              </label>
              <input
                type="email"
                dir="ltr"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs font-mono text-left text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-orange-500" />
                ساعات کاری پاسخگویی
              </label>
              <input
                type="text"
                value={settings.supportHours}
                onChange={(e) => setSettings({ ...settings, supportHours: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
              آدرس فیزیکی دفتر مرکزی
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
              required
            />
          </div>
        </div>

        {/* Shipping & Promo Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700/60 pb-3 flex items-center gap-2">
            تنظیمات لجستیک و نوار اطلاعیه
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-orange-500" />
                سقف مبلغ برای ارسال رایگان (تومان)
              </label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs font-mono font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                required
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                معادل: {settings.freeShippingThreshold.toLocaleString('fa-IR')} تومان
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Megaphone className="h-3.5 w-3.5 text-orange-500" />
                متن بنر بالای سایت (Top Announcement)
              </label>
              <textarea
                rows={2}
                value={settings.announcement}
                onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-all disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                ذخیره تمام تنظیمات
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
