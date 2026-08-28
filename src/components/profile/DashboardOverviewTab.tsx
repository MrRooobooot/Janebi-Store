import React from 'react';
import { Package, MapPin, Heart, Gift, Clock, ShieldCheck, ArrowLeft, Sparkles } from 'lucide-react';
import { UserProfile } from '../../contexts/AuthContext';
import { Order } from '../../types';
import { toPersianDigits, formatPrice } from '../../lib/utils';
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
  const totalSpent = orders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-6 text-right">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-orange-500/20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-[var(--color-surface-light)]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black mb-2 flex items-center gap-2">
              <span>سلام {user.name} عزیز، خوش آمدید!</span>
              <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
            </h2>
            <p className="text-xs sm:text-sm text-orange-100 font-medium max-w-xl leading-relaxed">
              از این بخش می‌توانید سفارش‌ها، آدرس‌های ارسال و تنظیمات حساب خود را به راحتی مدیریت کنید.
            </p>
          </div>

          <div className="bg-[var(--color-surface-light)]/15 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center shrink-0">
            <span className="text-[10px] font-bold text-orange-100 block">امتیاز باشگاه VIP</span>
            <span className="text-xl font-black text-white">{toPersianDigits(user.vipPoints || 0)}</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('orders')}
          className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-5 shadow-xs cursor-pointer hover:border-orange-500/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">سفارش‌های در حال پردازش</span>
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="font-black text-2xl text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {toPersianDigits(processingCount)}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('orders')}
          className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-5 shadow-xs cursor-pointer hover:border-orange-500/30 transition-all group"
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
        </div>

        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">مجموع خریدهای شما</span>
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="font-black text-lg text-orange-600 dark:text-orange-400">
            {formatPrice(totalSpent)}
          </div>
        </div>
      </div>

      {/* Recent Order Preview */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <h3 className="font-extrabold text-base text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            <span>آخرین سفارش ثبت‌شده</span>
          </h3>

          <button
            onClick={() => setActiveTab('orders')}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
          >
            مشاهده همه سفارش‌ها <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {orders.length > 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">کد سفارش: {orders[0].id}</span>
              <span className="px-3 py-1 rounded-full text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                {orders[0].statusText}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {orders[0].items.slice(0, 3).map((item, idx) => (
                <img
                  key={idx}
                  src={item.image}
                  alt={item.title}
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
              <span className="text-orange-600 dark:text-orange-400 text-sm">{formatPrice(orders[0].total)}</span>
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
