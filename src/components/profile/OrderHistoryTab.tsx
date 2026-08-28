import React, { useState } from 'react';
import { Package, Search, Printer, XCircle, Clock, CheckCircle2, MapPin, Calendar } from 'lucide-react';
import { Order } from '../../types';
import { toPersianDigits, formatPrice } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';

interface OrderHistoryTabProps {
  orders: Order[];
  onCancelOrder: (orderId: string) => void;
}

export default function OrderHistoryTab({ orders, onCancelOrder }: OrderHistoryTabProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'processing' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    const matchesQuery =
      !searchQuery.trim() ||
      order.id.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      order.items.some((i) => i.title.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    return matchesTab && matchesQuery;
  });

  const handlePrint = (orderId: string) => {
    addToast(`فاکتور سفارش ${orderId} در حال آماده‌سازی برای چاپ است...`, 'info');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header & Search */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <h2 className="font-extrabold text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
          <Package className="h-5 w-5 text-orange-500" />
          <span>سفارش‌های من ({toPersianDigits(orders.length)})</span>
        </h2>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو کد سفارش یا عنوان کالا..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-2.5 px-4 pr-10 text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'all', label: 'همه سفارش‌ها', count: orders.length },
          { id: 'processing', label: 'در حال پردازش', count: orders.filter((o) => o.status === 'processing').length },
          { id: 'delivered', label: 'تحویل داده شده', count: orders.filter((o) => o.status === 'delivered').length },
          { id: 'cancelled', label: 'لغو شده', count: orders.filter((o) => o.status === 'cancelled').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-[var(--color-surface-light)]/20 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              {toPersianDigits(tab.count)}
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-12 text-center text-gray-400 font-bold text-sm">
          هیچ سفارشی متناسب با جستجوی شما یافت نشد.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 shadow-xs space-y-4"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                    کد سفارش: {order.id}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      order.status === 'delivered'
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {order.statusText}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {order.date}
                  </span>
                  <span className="font-black text-orange-600 dark:text-orange-400 text-sm">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              {/* Order Items Horizontal Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-12 rounded-xl object-contain bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-1 border border-gray-200 dark:border-gray-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {toPersianDigits(item.qty)} عدد × {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recipient details & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-xs">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>تحویل گیرنده: {order.recipient.name} ({order.recipient.address})</span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handlePrint(order.id)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5 text-gray-500" />
                    چاپ فاکتور
                  </button>

                  {order.status === 'processing' && (
                    <button
                      onClick={() => onCancelOrder(order.id)}
                      className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      لغو سفارش
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
