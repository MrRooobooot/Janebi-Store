import React, { useEffect, useState } from 'react';
import { History, Trash2, ChevronLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard from './ProductCard';
import {
  getRecentlyViewed,
  clearRecentlyViewed,
  RecentlyViewedProduct,
} from '../lib/recentlyViewed';
import { Link } from 'react-router-dom';

interface RecentlyViewedProps {
  currentProductId?: number;
  title?: string;
  limit?: number;
}

export default function RecentlyViewed({
  currentProductId,
  title = 'بازدیدهای اخیر شما',
  limit = 4,
}: RecentlyViewedProps) {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);

  const refreshList = () => {
    let list = getRecentlyViewed();
    if (currentProductId) {
      list = list.filter((p) => p.id !== currentProductId);
    }
    setItems(list.slice(0, limit));
  };

  useEffect(() => {
    refreshList();

    // Listen to custom storage events if navigated across tabs or pages
    const handleStorage = () => refreshList();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentProductId, limit]);

  const handleClear = () => {
    clearRecentlyViewed();
    setItems([]);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-12 text-right"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200/70 dark:border-[var(--color-border-dark)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tight flex items-center gap-2">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              محصولاتی که اخیراً بررسی کرده‌اید
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="پاک کردن تاریخچه بازدیدها"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">پاک کردن</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <AnimatePresence>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </AnimatePresence>
    </motion.section>
  );
}
