import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../contexts/ToastContext';
import { 
  Plus, Trash2, Tag, Percent, DollarSign, Copy, CheckCircle2, 
  X, Calendar, Sparkles, AlertCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { toEnglishDigits, toPersianDigits, formatPrice } from '../../lib/utils';

export default function AdminCoupons() {
  const token = localStorage.getItem('token');
  const { addToast } = useToast();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percent', // 'percent' | 'amount'
    value: '',
    minTotal: '',
    label: '',
    active: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCoupons(data);
    } catch (err) {
      addToast('خطا در دریافت کدهای تخفیف', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = toEnglishDigits(formData.value);
    const cleanMinTotal = toEnglishDigits(formData.minTotal);
    const parsedVal = parseInt(cleanValue, 10);

    if (isNaN(parsedVal) || parsedVal <= 0) {
      addToast('مقدار تخفیف را به درستی وارد کنید', 'error');
      return;
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      percent: formData.type === 'percent' ? parsedVal : undefined,
      amount: formData.type === 'amount' ? parsedVal : undefined,
      minTotal: parseInt(cleanMinTotal, 10) || 0,
      label: formData.label.trim(),
      active: formData.active
    };

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();

      addToast('کد تخفیف جدید با موفقیت اضافه شد', 'success');
      setIsModalOpen(false);
      setFormData({ code: '', type: 'percent', value: '', minTotal: '', label: '', active: true });
      fetchCoupons();
    } catch (err) {
      addToast('خطا در ثبت کد تخفیف', 'error');
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`آیا از حذف کد تخفیف «${code}» اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/admin/coupons/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      addToast('کد تخفیف با موفقیت حذف شد', 'success');
      fetchCoupons();
    } catch (err) {
      addToast('خطا در حذف کد تخفیف', 'error');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast(`کد تخفیف ${code} کپی شد`, 'success');
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-white mb-1">مدیریت کدهای تخفیف و پروموشن</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">تعریف کوپن‌های درصدی و نقدی با حداقل خرید و مدیریت فعال/غیرفعال‌سازی</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-orange-500/25 transition-all cursor-pointer self-start sm:self-auto hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>افزودن کد تخفیف جدید</span>
        </button>
      </div>

      {/* Coupons Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-gray-400">در حال دریافت کدهای تخفیف...</div>
        ) : coupons.length === 0 ? (
          <div className="col-span-full p-12 bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl text-center text-gray-400 border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs">
            هیچ کد تخفیف فعالی یافت نشد. می‌توانید با دکمه بالا اولین کد را بسازید.
          </div>
        ) : (
          coupons.map((coupon) => (
            <div 
              key={coupon.code}
              className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl p-5 border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
            >
              {/* Ticket Top Notch */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                  coupon.active !== false
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  {coupon.active !== false ? 'فعال و معتبر' : 'غیرفعال'}
                </span>

                <span className="text-[10px] text-gray-400 font-bold">
                  {coupon.percent ? 'تخفیف درصدی' : 'تخفیف نقدی'}
                </span>
              </div>

              {/* Coupon Code Block */}
              <div className="bg-gray-50 dark:bg-[var(--color-surface-dark)]/60 p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-between mb-4">
                <div>
                  <span className="font-mono text-lg font-black text-orange-600 dark:text-orange-400 tracking-wider">
                    {coupon.code}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5 font-bold truncate max-w-[180px]">
                    {coupon.label || 'کد تخفیف اختصاصی'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(coupon.code)}
                  className="p-2.5 rounded-xl bg-[var(--color-surface-light)] dark:bg-gray-800 hover:bg-orange-50 text-gray-500 hover:text-orange-600 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer shadow-xs"
                  title="کپی کردن کد"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              {/* Specs and rules */}
              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-700/60">
                  <span className="text-gray-400">میزان تخفیف:</span>
                  <span className="font-black text-[var(--color-text-main-light)] dark:text-white">
                    {coupon.percent ? `${toPersianDigits(coupon.percent)}٪` : `${toPersianDigits(coupon.amount?.toLocaleString('fa-IR'))} تومان`}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">حداقل خرید:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    {coupon.minTotal > 0 ? `${toPersianDigits(coupon.minTotal.toLocaleString('fa-IR'))} تومان` : 'بدون حداقل خرید'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[var(--color-border-light)] dark:border-gray-700 flex items-center justify-end">
                <button
                  onClick={() => handleDelete(coupon.code)}
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف کد</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modern Add Coupon Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[var(--color-border-light)] dark:border-gray-700 text-right animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-gray-700 mb-5">
              <h3 className="font-black text-[var(--color-text-main-light)] dark:text-white text-base flex items-center gap-2">
                <Tag className="h-5 w-5 text-orange-500" />
                <span>تعریف کد تخفیف جدید</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1.5 font-black">
                  کد تخفیف (لاتین و انگلیسی) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="مثال: OFF20 یا JANEBI100"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 font-mono font-black text-sm text-orange-600 dark:text-orange-400 focus:outline-none focus:border-orange-500 text-left dir-ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1.5">نوع تخفیف *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="percent">درصدی (٪)</option>
                    <option value="amount">مبلغ ثابت (تومان)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1.5">
                    {formData.type === 'percent' ? 'درصد تخفیف (۱ تا ۹۹) *' : 'مبلغ تخفیف (تومان) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={formData.type === 'percent' ? 99 : undefined}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === 'percent' ? '20' : '100000'}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs font-mono font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 text-left dir-ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1.5">حداقل مبلغ سفارش (تومان)</label>
                <input
                  type="text"
                  value={formData.minTotal}
                  onChange={(e) => setFormData({ ...formData, minTotal: e.target.value })}
                  placeholder="500000 (اختیاری)"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 text-left dir-ltr"
                />
                {formData.minTotal ? (
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    معادل: {toPersianDigits(parseInt(formData.minTotal || '0').toLocaleString('fa-IR'))} تومان
                  </span>
                ) : null}
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1.5">عنوان / توضیح کد</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="مثال: ۲۰٪ تخفیف ویژه خرید بالای ۵۰۰ هزار تومان"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-light)] dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 text-white font-extrabold shadow-md shadow-orange-500/20"
                >
                  ایجاد کد تخفیف
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
