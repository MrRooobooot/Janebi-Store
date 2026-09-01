import React, { useEffect, useState } from 'react';
import ProductCard from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/Skeletons';
import { Sparkles, Clock, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { buildProductQuery } from '../../lib/productQuery';

export default function Offers() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Real weekly-deal countdown: ticks down to the end of the current week
  // (Saturday 23:59:59, Persian retail week) instead of a frozen fake string.
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      // daysUntilSaturday: JS getDay() 0=Sun..6=Sat → Saturday is day 6.
      const daysToSaturday = (6 - now.getDay() + 7) % 7;
      end.setDate(now.getDate() + daysToSaturday);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const fa = (n: number) => n.toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });
      setRemaining(`${fa(d)} روز و ${fa(h)}:${fa(m)}:${fa(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products?${buildProductQuery({ onlyDiscounted: true, sortBy: 'discount-desc' })}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError('خطا در دریافت پیشنهادهای ویژه. لطفاً صفحه را دوباره بارگذاری کنید.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-lg shadow-rose-600/20">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-[var(--color-surface-light)]/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold mb-3">
            <Flame className="h-4 w-4 text-amber-300 animate-pulse" /> جشنواره تخفیف‌های شگفت‌انگیز
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tight">پیشنهادهای ویژه و محدود</h1>
          <p className="text-rose-100 text-sm leading-relaxed mb-4">
            بهترین لوازم جانبی موبایل با بالاترین میزان تخفیف و تضمین اصالت کالا. فرصت را از دست ندهید!
          </p>
          <div className="inline-flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>زمان باقی‌مانده پیشنهاد هفته: {remaining}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            محصولات دارنده تخفیف ویژه
          </h2>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {products.length} کالا
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))
          ) : error ? (
            <div className="col-span-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-red-100 dark:border-red-900/40 rounded-2xl p-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors">
                تلاش مجدد
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">در حال حاضر محصول تخفیف‌داری موجود نیست — به‌زودی جشنواره بعدی شروع می‌شود!</p>
            </div>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
