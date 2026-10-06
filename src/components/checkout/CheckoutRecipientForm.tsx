import React, { useState } from 'react';
import { User as UserIcon, Phone, MapPin, Building, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { CheckoutFormData, CheckoutFieldErrors } from '../../hooks/useCheckoutForm';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeIranianMobile, isValidIranianMobile, toEnglishDigits } from '../../lib/utils';

interface CheckoutRecipientFormProps {
  formData: CheckoutFormData;
  updateField: (field: keyof CheckoutFormData, value: string) => void;
  fieldErrors?: CheckoutFieldErrors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-400" role="alert">
      {message}
    </p>
  );
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
  fieldErrors = {},
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
    <div className="bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <h3 className="font-bold text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[var(--color-emphasis-text)]" />
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
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            انتخاب سریع آدرس ارسال:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedAddresses.map((addr) => {
              const isSelected = selectedAddrId === addr.id;
              return (
                <button
                  key={addr.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectSavedAddress(addr)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between text-right ${
                    isSelected
                      ? 'border-[var(--color-cta)] bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/15 shadow-xs'
                      : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-[var(--color-emphasis-text)]" />
                      {addr.title}
                    </span>
                    {addr.isDefault && (
                      <span className="text-xs bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/10 text-[var(--color-emphasis-text)] px-2 py-0.5 rounded-md font-bold">
                        پیش‌فرض
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2 font-medium">
                    {addr.province}، {addr.city}، {addr.address}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between font-bold border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/60 pt-2">
                    <span>{addr.name}</span>
                    <span dir="ltr" className="font-mono">{addr.phone}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label htmlFor="checkout-name" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
            نام و نام خانوادگی تحویل‌گیرنده <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="مثلا: علی محمدی"
              className={`field w-full py-3 px-4 pr-10 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none transition-colors ${
                fieldErrors.name
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-gray-200/80 dark:border-gray-700 focus:border-[var(--color-cta)]/30'
              }`}
              required
            id="checkout-name"
            name="recipientName"
            autoComplete="name"
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? 'checkout-name-error' : undefined}
            />
            <UserIcon className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <FieldError id="checkout-name-error" message={fieldErrors.name} />
        </div>

        {/* Phone */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="checkout-phone" className="text-xs font-bold text-gray-700 dark:text-gray-300">
              شماره موبایل گیرنده <span className="text-rose-500">*</span>
            </label>
            {!isPhoneValid && (
              <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
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
              onBlur={(e) => updateField('phone', normalizeIranianMobile(e.target.value))}
              placeholder="09123456789"
              className={`field w-full py-3 px-4 pl-10 text-left font-mono text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none transition-colors ${
                !isPhoneValid || fieldErrors.phone
                  ? 'border-rose-400 focus:border-rose-500 text-rose-600'
                  : 'border-gray-200/80 dark:border-gray-700 focus:border-[var(--color-cta)]/30'
              }`}
              required
            id="checkout-phone"
            name="recipientPhone"
            autoComplete="tel"
            aria-invalid={!!fieldErrors.phone || !isPhoneValid}
            aria-describedby={fieldErrors.phone ? 'checkout-phone-error' : undefined}
            />
            <Phone className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <FieldError id="checkout-phone-error" message={fieldErrors.phone} />
        </div>

        {/* Province */}
        <div>
          <label htmlFor="checkout-province" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
            استان مقصد <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.province}
            onChange={(e) => updateField('province', e.target.value)}
            className={`field w-full py-3 px-4 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none cursor-pointer transition-colors ${
              fieldErrors.province
                ? 'border-rose-400 focus:border-rose-500'
                : 'border-gray-200/80 dark:border-gray-700 focus:border-[var(--color-cta)]/30'
            }`}
          id="checkout-province"
          name="province"
          aria-invalid={!!fieldErrors.province}
          aria-describedby={fieldErrors.province ? 'checkout-province-error' : undefined}
          >
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <FieldError id="checkout-province-error" message={fieldErrors.province} />
        </div>

        {/* City */}
        <div>
          <label htmlFor="checkout-city" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
            شهر مقصد <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="مثلا: تهران"
            className={`field w-full py-3 px-4 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none transition-colors ${
              fieldErrors.city
                ? 'border-rose-400 focus:border-rose-500'
                : 'border-gray-200/80 dark:border-gray-700 focus:border-[var(--color-cta)]/30'
            }`}
            required
          id="checkout-city"
          name="recipientCity"
          autoComplete="address-level2"
          aria-invalid={!!fieldErrors.city}
          aria-describedby={fieldErrors.city ? 'checkout-city-error' : undefined}
          />
          <FieldError id="checkout-city-error" message={fieldErrors.city} />
        </div>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="checkout-address" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
          آدرس پستی کامل و دقیق <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={3}
          value={formData.address}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="خیابان اصلی، بلوار، کوچه، پلاک، زنگ یا شماره واحد..."
          className={`field w-full p-4 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none resize-none transition-colors leading-relaxed ${
            fieldErrors.address
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-gray-200/80 dark:border-gray-700 focus:border-[var(--color-cta)]/30'
          }`}
          required
        id="checkout-address"
        name="recipientAddress"
        autoComplete="street-address"
        aria-invalid={!!fieldErrors.address}
        aria-describedby={fieldErrors.address ? 'checkout-address-error' : undefined}
        />
        <FieldError id="checkout-address-error" message={fieldErrors.address} />
      </div>

      {/* Postal Code & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="checkout-postal" className="text-xs font-bold text-gray-700 dark:text-gray-300">
              کد پستی ۱۰ رقمی (اختیاری)
            </label>
            {!isPostalCodeValid && (
              <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
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
            className={`field w-full py-3 px-4 text-left font-mono text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none transition-colors ${
              !isPostalCodeValid || fieldErrors.postalCode
                ? 'border-rose-400 focus:border-rose-500 text-rose-600'
                : 'border-gray-200/80 dark:border-gray-700 focus:border-[var(--color-cta)]/30'
            }`}
          id="checkout-postal"
          name="recipientPostal"
          autoComplete="postal-code"
          aria-invalid={!!fieldErrors.postalCode || !isPostalCodeValid}
          aria-describedby={fieldErrors.postalCode ? 'checkout-postal-error' : undefined}
          />
          <FieldError id="checkout-postal-error" message={fieldErrors.postalCode} />
        </div>

        <div>
          <label htmlFor="checkout-notes" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
            توضیحات و هماهنگی تحویل (اختیاری)
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="مثلا: تحویل به لابی یا هماهنگی قبل از مراجعه..."
            className="field w-full py-3 px-4 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-[var(--color-cta)]/30 transition-colors"
          id="checkout-notes"
          name="recipientNotes"
          autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
