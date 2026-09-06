import { authFetch } from '../../lib/api';
import React, { useEffect, useState } from "react";
import { Users, Package, ShoppingCart, DollarSign, Award, TrendingUp, Sparkles, Tag, Rocket, BarChart3, Mail, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { toPersianDigits, formatPrice } from "../../lib/utils";

interface DashboardStats {
 metrics: {
 totalUsers: number;
 totalProducts: number;
 totalRevenue: number;
 totalOrders: number;
 unreadMessages?: number;
 pendingReviews?: number;
 };
 recentOrders: any[];
}

interface AnalyticsData {
  financials: {
    completedRevenue: number;
    totalDiscountGiven: number;
    totalOrdersCount: number;
    averageOrderValue: number;
  };
  loyalty: {
    totalVipUsers: number;
    totalActiveVipPoints: number;
    totalVipPointsDistributed: number;
  };
  categoryPerformance: Array<{ category: string; count: number; revenue: number }>;
  topSellingProducts: Array<{ id: number; title: string; count: number; revenue: number }>;
  salesTrend: Array<{ date: string; revenue: number; orders: number }>;
}

export default function Dashboard() {
  const token = localStorage.getItem("token");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [statsRes, analyticsRes] = await Promise.all([
        authFetch("/api/admin/stats", { headers, credentials: "include" }),
        authFetch("/api/admin/analytics", { headers, credentials: "include" }),
      ]);

      if (!statsRes.ok || !analyticsRes.ok) throw new Error("خطا در دریافت آمار");
      const statsData = await statsRes.json();
      const analyticsData = await analyticsRes.json();

      setStats(statsData);
      setAnalytics(analyticsData);
    } catch {
      setError("مشکلی در دریافت اطلاعات داشبورد پیش آمده است.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-red-500 text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-3">
        <p>{error}</p>
        <button
          onClick={() => { setError(""); setLoading(true); fetchStats(); }}
          className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  const { metrics, recentOrders } = stats;

  const emptyState = metrics.totalProducts === 0 || metrics.totalOrders === 0;

  const statCards = [
    { title: "درآمد کل", value: `${metrics.totalRevenue.toLocaleString()} تومان`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
    { title: "سفارشات", value: metrics.totalOrders, icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/20" },
    { title: "محصولات", value: metrics.totalProducts, icon: Package, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-500/20" },
    { title: "کاربران", value: metrics.totalUsers, icon: Users, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-500/20" },
    { title: "پیام‌های خوانده‌نشده", value: toPersianDigits(metrics.unreadMessages || 0), icon: Mail, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-500/20" },
    { title: "نظرات در انتظار بررسی", value: toPersianDigits(metrics.pendingReviews || 0), icon: MessageSquare, color: "text-sky-500", bg: "bg-sky-100 dark:bg-sky-500/20" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-white mb-1">داشبورد مدیریت و تحلیل</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">نمای کلی از عملکرد فروشگاه، کاتالوگ انبار و باشگاه وفاداری کاربران</p>
        </div>
        
        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Package className="h-3.5 w-3.5" />
            <span>مدیریت کالاها</span>
          </Link>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-surface-light)] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold transition-all shadow-xs"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
            <span>سفارشات جدید</span>
          </Link>
          <Link
            to="/admin/coupons"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-surface-light)] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold transition-all shadow-xs"
          >
            <Tag className="h-3.5 w-3.5 text-emerald-500" />
            <span>کد تخفیف</span>
          </Link>
        </div>
      </div>

      {/* Onboarding Empty-State Card */}
      {emptyState && (
        <div className="rounded-2xl p-6 border border-orange-200 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 shrink-0">
              <Rocket className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-black text-sm text-[var(--color-text-main-light)] dark:text-white">
                {metrics.totalProducts === 0 ? 'فروشگاه شما خالی است' : 'هنوز سفارشی ثبت نشده است'}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {metrics.totalProducts === 0
                  ? 'برای شروع فروش، اولین محصول خود را از بخش مدیریت کالاها اضافه کنید تا مشتریان بتوانند خرید کنند.'
                  : 'محصولات شما آماده است! با افزودن کد تخفیف یا اشتراک‌گذاری فروشگاه، اولین سفارش‌ها را جذب کنید.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to="/admin/products"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Package className="h-4 w-4" />
              <span>افزودن محصول</span>
            </Link>
            <Link
              to="/admin/orders"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-surface-light)] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold transition-all"
            >
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              <span>مشاهده سفارشات</span>
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl p-6 border border-[var(--color-border-light)] dark:border-gray-700 flex items-center gap-4 shadow-xs">
            <div className={`p-4 rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.title}</div>
              <div className="text-xl sm:text-2xl font-bold text-[var(--color-text-main-light)] dark:text-white">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Insights */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend Chart (real data from /api/admin/analytics) */}
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl p-6 border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="h-5 w-5" />
                <h2 className="font-bold text-[var(--color-text-main-light)] dark:text-white text-sm">روند فروش ۱۴ روز اخیر</h2>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                جمع دوره: {formatPrice(analytics.salesTrend.reduce((s, d) => s + d.revenue, 0))}
              </span>
            </div>
            {analytics.salesTrend.every((d) => d.revenue === 0) ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 py-8 text-center">
                در ۱۴ روز گذشته سفارش تکمیل‌شده‌ای ثبت نشده است.
              </p>
            ) : (
              <div className="flex items-end gap-1 sm:gap-1.5 h-40 pt-2" role="img" aria-label="نمودار ستونی فروش روزانه چهارده روز اخیر">
                {analytics.salesTrend.map((day) => {
                  const maxRevenue = Math.max(...analytics.salesTrend.map((d) => d.revenue), 1);
                  const heightPct = Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 4 : 2);
                  const dayLabel = new Date(day.date + "T00:00:00").toLocaleDateString("fa-IR", { day: "numeric", month: "short" });
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full min-w-0 group relative">
                      <div
                        className="w-full rounded-t-md bg-emerald-500/80 hover:bg-emerald-600 dark:bg-emerald-500/60 dark:hover:bg-emerald-400 transition-colors"
                        style={{ height: `${heightPct}%` }}
                      />
                      <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-700 text-white text-[10px] whitespace-nowrap pointer-events-none shadow-lg">
                        {dayLabel} — {formatPrice(day.revenue)} · {toPersianDigits(day.orders)} سفارش
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 rotate-45 origin-top-right translate-x-1 whitespace-nowrap hidden sm:block">
                        {dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Loyalty / VIP Points Card */}
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl p-6 border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-amber-500">
              <Award className="h-5 w-5" />
              <h2 className="font-bold text-[var(--color-text-main-light)] dark:text-white text-sm">باشگاه مشتریان و امتیازات VIP</h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">کاربران دارای امتیاز:</span>
                <span className="font-bold text-[var(--color-text-main-light)] dark:text-white">{analytics.loyalty.totalVipUsers} کاربر</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">مجموع امتیازات فعال:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{analytics.loyalty.totalActiveVipPoints.toLocaleString()} امتیاز</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500 dark:text-gray-400">کل تخفیف اعطایی:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{analytics.financials.totalDiscountGiven.toLocaleString()} تومان</span>
              </div>
            </div>
          </div>

          {/* Category Performance */}
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl p-6 border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-500">
                <TrendingUp className="h-5 w-5" />
                <h2 className="font-bold text-[var(--color-text-main-light)] dark:text-white text-sm">عملکرد دسته‌بندی‌ها</h2>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                میانگین سفارش: {analytics.financials.averageOrderValue.toLocaleString()} تومان
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {analytics.categoryPerformance.map((cat, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800 dark:text-gray-200">{cat.category}</span>
                  <div className="text-left">
                    <div className="font-mono font-bold text-orange-600 dark:text-orange-400">{cat.revenue.toLocaleString()} ت</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">{cat.count} فروش</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders Table */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-[var(--color-border-light)] dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-main-light)] dark:text-white">آخرین سفارشات</h2>
          <Link to="/admin/orders" className="text-xs sm:text-sm font-bold text-orange-600 hover:text-orange-700">مشاهده همه</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs border-b border-[var(--color-border-light)] dark:border-gray-700">
                <th className="p-4 font-medium">شماره سفارش</th>
                <th className="p-4 font-medium">تاریخ</th>
                <th className="p-4 font-medium">مشتری</th>
                <th className="p-4 font-medium">مبلغ کل</th>
                <th className="p-4 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentOrders.map((order) => (
                <tr key={order.id} className="text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4 font-bold text-[var(--color-text-main-light)] dark:text-white dir-ltr text-left w-max inline-block font-mono">{order.id}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">{order.date}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">{order.recipientName}</td>
                  <td className="p-4 font-bold text-[var(--color-text-main-light)] dark:text-white font-mono">{order.total.toLocaleString()} تومان</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      order.status === "delivered" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                      order.status === "processing" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" :
                      order.status === "shipped" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" :
                      order.status === "pending_payment" ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" :
                      "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    }`}>
                      {order.statusText}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">سفارشی یافت نشد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
