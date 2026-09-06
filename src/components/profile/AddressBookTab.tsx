import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plus, Trash2, Edit2, CheckCircle2, Star, X, Building, User, Phone, Check } from 'lucide-react';
import { AddressItem } from '../../contexts/AuthContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { normalizeIranianMobile, toEnglishDigits } from '../../lib/utils';

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

export default function AddressBookTab() {
  const { user, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('خانه');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('تهران');
  const [city, setCity] = useState('تهران');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const addresses = user?.addresses || [];

  const handleOpenAddModal = () => {
    setEditingId(null);
    setTitle('خانه');
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setProvince('تهران');
    setCity('تهران');
    setAddress('');
    setPostalCode('');
    setShowModal(true);
  };

  const handleOpenEditModal = (addr: AddressItem) => {
    setEditingId(addr.id);
    setTitle(addr.title || 'خانه');
    setName(addr.name || '');
    setPhone(addr.phone || '');
    setProvince(addr.province || 'تهران');
    setCity(addr.city || 'تهران');
    setAddress(addr.address || '');
    setPostalCode(addr.postalCode || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizeIranianMobile(phone);
    if (!name.trim() || !normalizedPhone || !address.trim()) {
      addToast('لطفاً نام، شماره تماس و آدرس دقیق را وارد کنید', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateAddress(editingId, {
          title: title.trim(),
          name: name.trim(),
          phone: normalizedPhone,
          province,
          city: city.trim(),
          address: address.trim(),
          postalCode: toEnglishDigits(postalCode.trim()),
        });
      } else {
        await addAddress({
          title: title.trim(),
          name: name.trim(),
          phone: normalizedPhone,
          province,
          city: city.trim(),
          address: address.trim(),
          postalCode: toEnglishDigits(postalCode.trim()),
        });
      }
      setShowModal(false);
    } catch {
      addToast('خطا در ثبت آدرس', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header & Add Button */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <span>آدرس‌های تحویل سفارش ({addresses.length})</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            آدرس‌های ثبت‌شده برای ارسال سریع سفارش‌ها در فرایند خرید مورد استفاده قرار می‌گیرند.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-orange-500/20 active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          افزودن آدرس جدید
        </button>
      </div>

      {/* Address Cards List */}
      {addresses.length === 0 ? (
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-12 text-center text-gray-400 font-bold text-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
            <MapPin className="h-6 w-6" />
          </div>
          <div>هنوز هیچ آدرسی ثبت نکرده‌اید.</div>
          <button
            onClick={handleOpenAddModal}
            className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold"
          >
            ثبت اولین آدرس تحویل
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-2 rounded-3xl p-6 shadow-xs relative flex flex-col justify-between transition-all ${
                addr.isDefault
                  ? 'border-orange-500 shadow-md shadow-orange-500/10'
                  : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-orange-500" />
                      {addr.title}
                    </span>
                    {addr.isDefault && (
                      <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3 fill-orange-500" /> پیش‌فرض
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(addr)}
                      className="text-gray-400 hover:text-blue-500 p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                      title="ویرایش آدرس"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('آیا از حذف این آدرس اطمینان دارید؟')) {
                          deleteAddress(addr.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="حذف آدرس"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed mb-4">
                  {addr.province}، {addr.city}، {addr.address}
                </p>

                <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                  <div className="flex justify-between">
                    <span>تحویل گیرنده:</span>
                    <strong className="text-gray-800 dark:text-gray-200">{addr.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>شماره تماس:</span>
                    <strong className="text-gray-800 dark:text-gray-200 font-mono" dir="ltr">{addr.phone}</strong>
                  </div>
                  {addr.postalCode && (
                    <div className="flex justify-between">
                      <span>کد پستی:</span>
                      <strong className="text-gray-800 dark:text-gray-200 font-mono" dir="ltr">{addr.postalCode}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/60 mt-4 flex items-center justify-between">
                {!addr.isDefault ? (
                  <button
                    onClick={() => setDefaultAddress(addr.id)}
                    className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                  >
                    <Star className="h-3.5 w-3.5" />
                    تنظیم به عنوان آدرس پیش‌فرض
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> آدرس انتخابی برای ثبت سفارش
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="بستن پنجره"
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-default"
          />

          <div className="relative w-full max-w-lg bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-10 text-right space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
              <h3 className="font-extrabold text-base text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                {editingId ? 'ویرایش آدرس تحویل' : 'ثبت آدرس جدید تحویل'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    عنوان آدرس (مثلاً خانه، محل کار) *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="خانه، شرکت..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 px-3 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    نام تحویل‌گیرنده *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="علی رضایی"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 px-3 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    شماره موبایل گیرنده *
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 px-3 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    استان *
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 px-3 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    شهر *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="تهران"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 px-3 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    کد پستی ۱۰ رقمی (اختیاری)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="1234567890"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 px-3 text-left text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  نشانی پستی کامل *
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="خیابان اصلی، کوچه، پلاک، واحد..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'در حال ثبت...' : editingId ? 'ویرایش آدرس' : 'ذخیره آدرس'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
