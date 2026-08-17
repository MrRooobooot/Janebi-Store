import React, { useEffect, useState } from 'react';
import { 
  Users, Package, ShoppingCart, DollarSign, AlertTriangle, 
  TrendingUp, CheckCircle, Clock, Truck, ShieldAlert, ArrowRight, 
  PlusCircle, Tag, MessageSquare, Mail 
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  metrics: {
    totalUsers: number;
    totalProducts: number;
    totalRevenue: number;
    totalOrders: number;
    lowStockCount?: number;
  };
  statusCounts?: {
    pending_payment: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  lowStockProducts?: Array<{
    id: number;
    title: string;
    stockQuantity: number;
    image: string;
    price: number;
  }>;
  recentOrders: any[];
}

export default function Dashboard() {
  const token = localStorage.getItem('token');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('خطا در دریافت آمار');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError('مشکلی پیش آمده است.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (error || !stats) {
    return <div className="text-red-500 text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">{error}</div>;
  }

  const { metrics, recentOrders, statusCounts, lowStockProducts = [] } = stats;

  const statCards = [
    { title: 'درآمد کل پرداخت‌شده', value: `${metrics.totalRevenue.toLocaleString()} تومان`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
    { title: 'کل سفارشات', value: metrics.totalOrders, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20' },
    { title: 'تنوع محصولات', value: metrics.totalProducts, icon: Package, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/20' },
    { title: 'تعداد کل کاربران', value: metrics.totalUsers, icon: Users, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20' },
  ];

  return (
    <div className="space-y-8 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-1">
            داشبورد مدیریت فروشگاه
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            خلاصه آمار عملکرد، تحلیل سفارشات و هشدارهای انبار
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/admin/products"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            افزودن محصول جدید
          </Link>
          <Link
            to="/admin/coupons"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 text-xs font-bold transition-all"
          >
            <Tag className="h-4 w-4" />
            کوپن جدید
          </Link>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700/70 shadow-xs flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl ${stat.bg} shrink-0`}>
              <stat.icon className={`h-7 w-7 ${stat.color}`} />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{stat.title}</div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Status Distribution & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/70 shadow-xs">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-500" />
            تفکیک وضعیت سفارشات
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300">
              <span className="flex items-center gap-2 font-medium"><Clock className="h-4 w-4" /> در حال پردازش</span>
              <span className="font-mono font-bold text-sm">{statusCounts?.processing || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300">
              <span className="flex items-center gap-2 font-medium"><Truck className="h-4 w-4" /> ارسال شده به پست</span>
              <span className="font-mono font-bold text-sm">{statusCounts?.shipped || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-2 font-medium"><CheckCircle className="h-4 w-4" /> تحویل داده شده</span>
              <span className="font-mono font-bold text-sm">{statusCounts?.delivered || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-2 font-medium"><Clock className="h-4 w-4" /> در انتظار پرداخت</span>
              <span className="font-mono font-bold text-sm">{statusCounts?.pending_payment || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
              <span className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4" /> لغو شده</span>
              <span className="font-mono font-bold text-sm">{statusCounts?.cancelled || 0}</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alert Widget */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/70 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                هشدارهای کسری موجودی انبار (۵ عدد یا کمتر)
              </h2>
              <Link to="/admin/products" className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1">
                مدیریت انبار <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/20 rounded-xl">
                تمامی کالاها موجودی کافی دارند و کسری انبار وجود ندارد.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img src={p.image} alt={p.title} className="w-10 h-10 object-contain rounded-lg bg-white p-1 shrink-0" />
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{p.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{p.price.toLocaleString()} تومان</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-mono shrink-0">
                      {p.stockQuantity} عدد
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-500 flex items-center justify-between">
            <span>سیستم به صورت خودکار کالاهای زیر ۵ عدد را در این بخش مانیتور می‌کند.</span>
            <span className="font-bold text-amber-600">تعداد نیازمند شارژ: {lowStockProducts.length}</span>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/70 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-500" />
            آخرین سفارشات ثبت‌شده
          </h2>
          <Link to="/admin/orders" className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
            مشاهده تمام سفارشات <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                <th className="p-4 font-bold">شماره سفارش</th>
                <th className="p-4 font-bold">تاریخ</th>
                <th className="p-4 font-bold">مشتری</th>
                <th className="p-4 font-bold">مبلغ کل</th>
                <th className="p-4 font-bold">وضعیت سفارش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="p-4 font-bold text-gray-900 dark:text-white dir-ltr text-left font-mono">{order.id}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">{order.date}</td>
                  <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{order.recipientName}</td>
                  <td className="p-4 font-bold text-gray-900 dark:text-white font-mono">{order.total.toLocaleString()} تومان</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                      order.status === 'pending_payment' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                    }`}>
                      {order.statusText}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">سفارشی یافت نشد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
