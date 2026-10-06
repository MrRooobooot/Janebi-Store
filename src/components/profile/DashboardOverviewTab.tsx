import React from 'react';
import { Package, MapPin, Heart, Gift, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../../contexts/AuthContext';
import { Order } from '../../types';
import { toPersianDigits, formatPrice, totalSpentOf } from '../../lib/utils';
import { ProfileTabType } from './ProfileSidebar';

interface DashboardOverviewTabProps {
  user: UserProfile;
  orders: Order[];
  setActiveTab: (tab: ProfileTabType) => void;
}

export default function DashboardOverviewTab({
  user,
  orders,
  setActiveTab,
}: DashboardOverviewTabProps) {
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const totalSpent = totalSpentOf(orders);

  return (
    <div className="space-y-6 text-right">
      {/* Welcome Hero Banner */}
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs text-slate-500">حساب</p>
          <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-2xl">
            سلام {user.name} عزیز، خوش آمدید!
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            از این بخش می‌توانید سفارش‌ها، آدرس‌های ارسال و تنظیمات حساب خود را به راحتی مدیریت کنید.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          امتیاز باشگاه VIP
          <span className="mr-2 text-xl font-bold text-[var(--color-cta)]">{toPersianDigits(user.vipPoints || 0)}</span>
        </p>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className="w-full text-right bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-5 shadow-xs cursor-pointer hover:border-[var(--color-cta)]/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">سفارش‌های در حال پردازش</span>
            <div className="p-2.5 rounded-2xl bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="font-black text-2xl text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {toPersianDigits(processingCount)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className="w-full text-right bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-5 shadow-xs cursor-pointer hover:border-[var(--color-cta)]/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">تحویل داده شده</span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="font-black text-2xl text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {toPersianDigits(deliveredCount)}
          </div>
        </button>

        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">مجموع خریدهای شما</span>
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="font-bold text-lg text-[var(--color-emphasis-text)]">
            {formatPrice(totalSpent)}
          </div>
        </div>
      </div>

      {/* Recent Order Preview */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <h3 className="font-bold text-base text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
            <Package className="h-5 w-5 text-[var(--color-emphasis-text)]" />
            <span>آخرین سفارش ثبت‌شده</span>
          </h3>

          <button
            onClick={() => setActiveTab('orders')}
            className="text-xs font-bold text-[var(--color-emphasis-text)] hover:underline flex items-center gap-1"
          >
            مشاهده همه سفارش‌ها <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {orders.length > 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">کد سفارش: <span dir="ltr" className="latin-nums">{orders[0].id}</span></span>
              <span className={`px-3 py-1 rounded-full text-xs ${
                  orders[0].status === 'delivered' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : orders[0].status === 'cancelled' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  : orders[0].status === 'processing' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  : 'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'
                }`}>
                {orders[0].statusText}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {orders[0].items.slice(0, 3).map((item, idx) => (
                <img
                  key={idx}
                  src={item.image}
                  alt={item.title}
                  width="48"
                  height="48"
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 rounded-xl object-contain bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-1 border border-gray-200 dark:border-gray-700"
                />
              ))}
              {orders[0].items.length > 3 && (
                <span className="text-xs font-bold text-gray-400">
                  +{toPersianDigits(orders[0].items.length - 3)} کالا دیگر
                </span>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 text-xs font-bold text-gray-600 dark:text-gray-400">
              <span>تاریخ: {orders[0].date}</span>
              <span className="text-[var(--color-emphasis-text)] text-sm">{formatPrice(orders[0].total)}</span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs font-bold text-gray-400">
            هنوز سفارشی ثبت نکرده‌اید.
          </div>
        )}
      </div>
    </div>
  );
}
