import React, { useState } from 'react';
import { User as UserIcon, Phone, MapPin, Building, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { CheckoutFormData } from '../../hooks/useCheckoutForm';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeIranianMobile, isValidIranianMobile, toEnglishDigits } from '../../lib/utils';

interface CheckoutRecipientFormProps {
  formData: CheckoutFormData;
  updateField: (field: keyof CheckoutFormData, value: string) => void;
}

const PROVINCES = [
  'تهران',
  'اصفهان',
  'خراسان رضوی',
  'فارس',
  'آذربایجان شرقی',
  'مازندران',
  'البرز',
  'گیلان',
  'خوزستان',
  'کرمان',
  'قم',
  'یزد',
  'قزوین',
  'همدان',
  'سایر استان‌ها',
];

export default function CheckoutRecipientForm({
  formData,
  updateField,
}: CheckoutRecipientFormProps) {
  const { user } = useAuth();
  const savedAddresses = user?.addresses || [];
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);

  const handleSelectSavedAddress = (addr: any) => {
    setSelectedAddrId(addr.id);
    updateField('name', addr.name || '');
    updateField('phone', normalizeIranianMobile(addr.phone || ''));
    updateField('province', addr.province || 'تهران');
    updateField('city', addr.city || 'تهران');
    updateField('address', addr.address || '');
    updateField('postalCode', addr.postalCode || '');
  };

  const isPhoneValid = !formData.phone || isValidIranianMobile(formData.phone.trim());
  const isPostalCodeValid = !formData.postalCode || /^\d{10}$/.test(toEnglishDigits(formData.postalCode.trim()));

  return (
    <div className="bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <h3 className="font-black text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
          <MapPin className="h-5 w-5 text-orange-500" />
          <span>آدرس و مشخصات تحویل‌گیرنده</span>
        </h3>
        {savedAddresses.length > 0 && (
          <span className="text-xs text-gray-400 font-bold">
            انتخاب از دفترچه آدرس‌های ثبت‌شده
          </span>
        )}
      </div>

      {/* Saved Addresses Quick Selector */}
      {savedAddresses.length > 0 && (
        <div className="space-y-2.5 pb-2">
          <label className="block text-xs font-black text-gray-700 dark:text-gray-300">
            انتخاب سریع آدرس ارسال:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedAddresses.map((addr) => {
              const isSelected = selectedAddrId === addr.id;
              return (
                <div
                  key={addr.id}
                  onClick={() => handleSelectSavedAddress(addr)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 shadow-xs'
                      : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-orange-500" />
                      {addr.title}
                    </span>
                    {addr.isDefault && (
                      <span className="text-[10px] bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md font-black">
                        پیش‌فرض
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate mb-2 font-medium">
                    {addr.province}، {addr.city}، {addr.address}
                  </p>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-between font-bold border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/60 pt-2">
                    <span>{addr.name}</span>
                    <span dir="ltr" className="font-mono">{addr.phone}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-black text-gray-700 dark:text-gray-300 mb-2">
            نام و نام خانوادگی تحویل‌گیرنده <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="مثلا: علی محمدی"
              className="w-full bg-gray-50/80 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700 rounded-2xl py-3 px-4 pr-10 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 transition-colors"
              required
            />
            <UserIcon className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Phone */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-gray-700 dark:text-gray-300">
              شماره موبایل گیرنده <span className="text-rose-500">*</span>
            </label>
            {!isPhoneValid && (
              <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> باید با 09 شروع شود و ۱۱ رقم باشد
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="tel"
              dir="ltr"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="09123456789"
              className={`w-full bg-gray-50/80 dark:bg-gray-800/70 border rounded-2xl py-3 px-4 pl-10 text-left font-mono text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none transition-colors ${
                !isPhoneValid
                  ? 'border-rose-400 focus:border-rose-500 text-rose-600'
                  : 'border-gray-200/80 dark:border-gray-700 focus:border-orange-500'
              }`}
              required
            />
            <Phone className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Province */}
        <div>
          <label className="block text-xs font-black text-gray-700 dark:text-gray-300 mb-2">
            استان مقصد <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.province}
            onChange={(e) => updateField('province', e.target.value)}
            className="w-full bg-gray-50/80 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700 rounded-2xl py-3 px-4 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 cursor-pointer transition-colors"
          >
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block text-xs font-black text-gray-700 dark:text-gray-300 mb-2">
            شهر مقصد <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="مثلا: تهران"
            className="w-full bg-gray-50/80 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700 rounded-2xl py-3 px-4 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 transition-colors"
            required
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-black text-gray-700 dark:text-gray-300 mb-2">
          آدرس پستی کامل و دقیق <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={3}
          value={formData.address}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="خیابان اصلی، بلوار، کوچه، پلاک، زنگ یا شماره واحد..."
          className="w-full bg-gray-50/80 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700 rounded-2xl p-4 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 resize-none transition-colors leading-relaxed"
          required
        />
      </div>

      {/* Postal Code & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-gray-700 dark:text-gray-300">
              کد پستی ۱۰ رقمی (اختیاری)
            </label>
            {!isPostalCodeValid && (
              <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> باید ۱۰ رقم عدد انگلیسی باشد
              </span>
            )}
          </div>
          <input
            type="text"
            dir="ltr"
            maxLength={10}
            value={formData.postalCode}
            onChange={(e) => updateField('postalCode', e.target.value)}
            placeholder="1234567890"
            className={`w-full bg-gray-50/80 dark:bg-gray-800/70 border rounded-2xl py-3 px-4 text-left font-mono text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none transition-colors ${
              !isPostalCodeValid
                ? 'border-rose-400 focus:border-rose-500 text-rose-600'
                : 'border-gray-200/80 dark:border-gray-700 focus:border-orange-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-700 dark:text-gray-300 mb-2">
            توضیحات و هماهنگی تحویل (اختیاری)
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="مثلا: تحویل به لابی یا هماهنگی قبل از مراجعه..."
            className="w-full bg-gray-50/80 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700 rounded-2xl py-3 px-4 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
