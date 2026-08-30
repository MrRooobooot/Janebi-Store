import { authFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { Settings, Save, Phone, Mail, MapPin, Clock, Truck, Megaphone, Check, Loader2, Database, Download, Sparkles, Layers } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface StoreSettingsData {
  storeName: string;
  phone: string;
  email: string;
  supportHours: string;
  address: string;
  freeShippingThreshold: number;
  announcement: string;
  heroSlide1Title?: string;
  heroSlide1Subtitle?: string;
  heroSlide1Link?: string;
  heroSlide1Badge?: string;
  heroSlide2Title?: string;
  heroSlide2Subtitle?: string;
  heroSlide2Link?: string;
  heroSlide2Badge?: string;
  heroSlide3Title?: string;
  heroSlide3Subtitle?: string;
  heroSlide3Link?: string;
  heroSlide3Badge?: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettingsData>({
    storeName: 'جانبی آرنا',
    phone: '۰۲۱-۸۸۸۸۹۹۹۹',
    email: 'info@janebi-arena.ir',
    supportHours: 'همه‌روزه از ساعت ۹:۰۰ الی ۲۱:۰۰',
    address: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع نور، طبقه ۲، واحد ۱۰۴',
    freeShippingThreshold: 2000000,
    announcement: 'ارسال رایگان برای تمامی سفارش‌های بالای ۲ میلیون تومان | کد تخفیف: WELCOME10',
    heroSlide1Title: 'فست‌شارژهای هوشمند با محافظت ولتاژ',
    heroSlide1Subtitle: 'شارژرهای اورجینال انکر، باسئوس و مک‌دودو مجهز به فناوری GaN و قطع‌کن خودکار برای سلامت باتری گوشی',
    heroSlide1Link: '/products?category=شارژر',
    heroSlide1Badge: 'گارانتی تعویض ۶ ماهه',
    heroSlide2Title: 'کاورهای مگ‌سیف و گلس‌های ضدضربه سوپردی',
    heroSlide2Subtitle: 'تنوع بی‌نظیر قاب‌های ضدضربه، شفاف و چرمی سازگار با شارژ بیسیم برای تمامی مدل‌های آیفون، سامسونگ و شیائومی',
    heroSlide2Link: '/products?category=قاب و کاور',
    heroSlide2Badge: 'تست فیزیکی قبل از ارسال',
    heroSlide3Title: 'ایرپادها و هندزفری‌های مجهز به نویز کنسلینگ',
    heroSlide3Subtitle: 'مکالمه بدون نویز محیطی، درایورهای بیس تقویت‌شده و ماندگاری باتری تا ۳۰ ساعت برای مکالمه و موسیقی',
    heroSlide3Link: '/products?category=هندزفری',
    heroSlide3Badge: 'مهلت تست ۷ روزه',
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
      const res = await authFetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
      addToast('خطا در دریافت تنظیمات فروشگاه', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await authFetch('/api/admin/settings', {
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
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-orange-600" />
          تنظیمات عمومی و محتوای فروشگاه
        </h1>
        <p className="text-sm text-gray-500 mt-1">مدیریت اطلاعات تماس، آستانه ارسال رایگان، بنرها و اسلایدرهای صفحه اصلی</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* ۱. اطلاعات اصلی و ارتباطی */}
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[var(--color-text-main-light)] dark:text-white border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pb-3 flex items-center gap-2">
            <Phone className="h-5 w-5 text-orange-500" />
            اطلاعات تماس و هویت سایت
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">نام فروشگاه</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">شماره تماس پشتیبانی</label>
              <input
                type="text"
                value={settings.phone}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ایمیل پشتیبانی</label>
              <input
                type="email"
                value={settings.email}
                onChange={e => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 text-left dir-ltr"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ساعات پاسخگویی</label>
              <input
                type="text"
                value={settings.supportHours}
                onChange={e => setSettings({ ...settings, supportHours: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">آدرس پستی دفتر</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => setSettings({ ...settings, address: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                required
              />
            </div>
          </div>
        </div>

        {/* ۲. بنر اعلان و آستانه ارسال */}
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[var(--color-text-main-light)] dark:text-white border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pb-3 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-500" />
            پیام اعلان سراسری و آستانه ارسال رایگان
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">متن نوار بالای سایت (Announcement Bar)</label>
              <input
                type="text"
                value={settings.announcement}
                onChange={e => setSettings({ ...settings, announcement: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">حداقل مبلغ برای ارسال رایگان (تومان)</label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={e => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 text-left dir-ltr"
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">
                معادل: {settings.freeShippingThreshold.toLocaleString('fa-IR')} تومان
              </p>
            </div>
          </div>
        </div>

        {/* ۳. مدیریت ۳ اسلایدر هیرو صفحه اول */}
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-6">
          <h2 className="text-base font-bold text-[var(--color-text-main-light)] dark:text-white border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pb-3 flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-600" />
            مدیریت اسلایدرهای هیرو صفحه اول
          </h2>

          {/* اسلاید ۱ */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
            <span className="text-xs font-black text-orange-600">اسلاید شماره ۱ (شارژر و آداپتور)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="عنوان اصلی"
                value={settings.heroSlide1Title || ''}
                onChange={e => setSettings({ ...settings, heroSlide1Title: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="بج / برچسب (مثلاً گارانتی ۶ ماهه)"
                value={settings.heroSlide1Badge || ''}
                onChange={e => setSettings({ ...settings, heroSlide1Badge: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="توضیحات کوتاه"
                value={settings.heroSlide1Subtitle || ''}
                onChange={e => setSettings({ ...settings, heroSlide1Subtitle: e.target.value })}
                className="col-span-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* اسلاید ۲ */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
            <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">اسلاید شماره ۲ (قاب و کاور)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="عنوان اصلی"
                value={settings.heroSlide2Title || ''}
                onChange={e => setSettings({ ...settings, heroSlide2Title: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="بج / برچسب"
                value={settings.heroSlide2Badge || ''}
                onChange={e => setSettings({ ...settings, heroSlide2Badge: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="توضیحات کوتاه"
                value={settings.heroSlide2Subtitle || ''}
                onChange={e => setSettings({ ...settings, heroSlide2Subtitle: e.target.value })}
                className="col-span-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* اسلاید ۳ */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
            <span className="text-xs font-black text-blue-600">اسلاید شماره ۳ (هندزفری و صوتی)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="عنوان اصلی"
                value={settings.heroSlide3Title || ''}
                onChange={e => setSettings({ ...settings, heroSlide3Title: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="بج / برچسب"
                value={settings.heroSlide3Badge || ''}
                onChange={e => setSettings({ ...settings, heroSlide3Badge: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="توضیحات کوتاه"
                value={settings.heroSlide3Subtitle || ''}
                onChange={e => setSettings({ ...settings, heroSlide3Subtitle: e.target.value })}
                className="col-span-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>

        {/* ۴. پشتیبان‌گیری از دیتابیس */}
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[var(--color-text-main-light)] dark:text-white border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-500" />
            پشتیبان‌گیری از دیتابیس فروشگاه
          </h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">دریافت فایل کامل دیتابیس (SQLite Backup)</h4>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">دانلود نسخه پشتیبان زنده از کلیه محصولات، کاربران، سفارشات و نظرات</p>
            </div>

            <a
              href="/api/admin/backup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0"
            >
              <Download className="h-4 w-4" />
              دانلود بک‌آپ (janebi.db)
            </a>
          </div>
        </div>

        {/* دکمه ذخیره */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-8 py-3.5 rounded-2xl transition-all shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? 'در حال ذخیره...' : 'ذخیره تمام تنظیمات'}
          </button>
        </div>
      </form>
    </div>
  );
}
