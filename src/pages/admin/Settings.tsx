import { authFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { Settings, Save, Phone, Mail, MapPin, Clock, Truck, Megaphone, Check, Loader2, Database, Download, Sparkles, Layers, Zap, Building2, Crown, Star } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { STORE_SETTINGS_DEFAULTS } from '../../lib/constants';
import { toEnglishDigits } from '../../lib/utils';

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
  heroSlide1Image?: string;
  heroSlide2Image?: string;
  heroSlide3Image?: string;
  announcementBarEnabled: string;
  dealsTitle: string;
  dealsSubtitle: string;
  b2bTitle: string;
  b2bDesc: string;
  b2bLink: string;
  b2bButtonText: string;
  vipBadge: string;
  vipTitle: string;
  vipSubtitle: string;
  vipCouponCode: string;
  valueProp1Title: string;
  valueProp1Desc: string;
  valueProp2Title: string;
  valueProp2Desc: string;
  valueProp3Title: string;
  valueProp3Desc: string;
  valueProp4Title: string;
  valueProp4Desc: string;
  heroSlide1Tag: string;
  heroSlide2Tag: string;
  heroSlide3Tag: string;
  heroSlide1ButtonText: string;
  heroSlide2ButtonText: string;
  heroSlide3ButtonText: string;
}

const FIELD =
  'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500';
const FIELD_SM =
  'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs';
const SECTION_CARD =
  'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xs space-y-4';

/** Collapsible settings card (details/summary) — open by default. */
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className={`${SECTION_CARD} group`}>
      <summary className="text-base font-bold text-[var(--color-text-main-light)] dark:text-white border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pb-3 flex items-center gap-2 cursor-pointer list-none select-none">
        {icon}
        {title}
        <span className="ms-auto text-[10px] font-normal text-gray-400 group-open:hidden">نمایش ▾</span>
        <span className="ms-auto text-[10px] font-normal text-gray-400 hidden group-open:inline">بستن ▴</span>
      </summary>
      <div className="pt-4 space-y-4">{children}</div>
    </details>
  );
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettingsData>({
    ...STORE_SETTINGS_DEFAULTS,
    freeShippingThreshold: parseInt(STORE_SETTINGS_DEFAULTS.freeShippingThreshold) || 0,
  } as StoreSettingsData);
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
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">مدیریت اطلاعات تماس، آستانه ارسال رایگان، بنرها و اسلایدرهای صفحه اصلی</p>
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

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.announcementBarEnabled !== 'false'}
                onChange={e => setSettings({ ...settings, announcementBarEnabled: e.target.checked ? 'true' : 'false' })}
                className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                نمایش نوار اعلان بالای سایت {settings.announcementBarEnabled !== 'false' ? '(فعال)' : '(غیرفعال)'}
              </span>
            </label>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">حداقل مبلغ برای ارسال رایگان (تومان)</label>
              <input
                type="text"
                inputMode="numeric"
                value={settings.freeShippingThreshold}
                onChange={e => setSettings({ ...settings, freeShippingThreshold: parseInt(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''), 10) || 0 })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 text-left dir-ltr"
                required
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
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
              <input
                type="text"
                placeholder="لینک دکمه"
                value={settings.heroSlide1Link || ''}
                onChange={e => setSettings({ ...settings, heroSlide1Link: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-left dir-ltr"
              />
              <input
                type="text"
                placeholder="مسیر تصویر (مثلاً /products/hld-13.svg)"
                value={settings.heroSlide1Image || ''}
                onChange={e => setSettings({ ...settings, heroSlide1Image: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-left dir-ltr"
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
              <input
                type="text"
                placeholder="لینک دکمه"
                value={settings.heroSlide2Link || ''}
                onChange={e => setSettings({ ...settings, heroSlide2Link: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-left dir-ltr"
              />
              <input
                type="text"
                placeholder="مسیر تصویر (مثلاً /products/cas-4.svg)"
                value={settings.heroSlide2Image || ''}
                onChange={e => setSettings({ ...settings, heroSlide2Image: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-left dir-ltr"
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
              <input
                type="text"
                placeholder="لینک دکمه"
                value={settings.heroSlide3Link || ''}
                onChange={e => setSettings({ ...settings, heroSlide3Link: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-left dir-ltr"
              />
              <input
                type="text"
                placeholder="مسیر تصویر (مثلاً /products/cbl-1.svg)"
                value={settings.heroSlide3Image || ''}
                onChange={e => setSettings({ ...settings, heroSlide3Image: e.target.value })}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-left dir-ltr"
              />
            </div>
          </div>
        </div>

        {/* ۴. بخش‌های محتوایی صفحه اصلی (تاشو) */}
        <CollapsibleSection
          title="پیشنهادات شگفت‌انگیز"
          icon={<Zap className="h-5 w-5 text-red-500" />}
          defaultOpen
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">عنوان بخش</label>
              <input type="text" value={settings.dealsTitle} onChange={e => setSettings({ ...settings, dealsTitle: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">زیرعنوان بخش</label>
              <input type="text" value={settings.dealsSubtitle} onChange={e => setSettings({ ...settings, dealsSubtitle: e.target.value })} className={FIELD} />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="بنر فروش عمده (B2B)"
          icon={<Building2 className="h-5 w-5 text-emerald-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">عنوان بنر</label>
              <input type="text" value={settings.b2bTitle} onChange={e => setSettings({ ...settings, b2bTitle: e.target.value })} className={FIELD} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">توضیحات بنر</label>
              <input type="text" value={settings.b2bDesc} onChange={e => setSettings({ ...settings, b2bDesc: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">لینک دکمه</label>
              <input type="text" value={settings.b2bLink} onChange={e => setSettings({ ...settings, b2bLink: e.target.value })} className={`${FIELD} text-left dir-ltr`} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">متن دکمه</label>
              <input type="text" value={settings.b2bButtonText} onChange={e => setSettings({ ...settings, b2bButtonText: e.target.value })} className={FIELD} />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="بنر باشگاه مشتریان (VIP)"
          icon={<Crown className="h-5 w-5 text-amber-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">بج / برچسب</label>
              <input type="text" value={settings.vipBadge} onChange={e => setSettings({ ...settings, vipBadge: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">کد تخفیف هدیه</label>
              <input type="text" value={settings.vipCouponCode} onChange={e => setSettings({ ...settings, vipCouponCode: e.target.value })} className={`${FIELD} text-left dir-ltr`} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">عنوان</label>
              <input type="text" value={settings.vipTitle} onChange={e => setSettings({ ...settings, vipTitle: e.target.value })} className={FIELD} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
              <textarea rows={2} value={settings.vipSubtitle} onChange={e => setSettings({ ...settings, vipSubtitle: e.target.value })} className={FIELD} />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="کارت‌های ارزش برند"
          icon={<Star className="h-5 w-5 text-purple-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(n => {
              const tKey = `valueProp${n}Title` as keyof StoreSettingsData;
              const dKey = `valueProp${n}Desc` as keyof StoreSettingsData;
              return (
                <div key={n} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
                  <span className="text-xs font-black text-purple-600">کارت ارزش {n}</span>
                  <input
                    type="text"
                    placeholder="عنوان کارت"
                    value={(settings[tKey] as string) || ''}
                    onChange={e => setSettings({ ...settings, [tKey]: e.target.value })}
                    className={FIELD_SM}
                  />
                  <input
                    type="text"
                    placeholder="توضیح کارت"
                    value={(settings[dKey] as string) || ''}
                    onChange={e => setSettings({ ...settings, [dKey]: e.target.value })}
                    className={FIELD_SM}
                  />
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* ۵. پشتیبان‌گیری از دیتابیس */}
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
