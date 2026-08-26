import React, { useEffect, useState } from 'react';
import ProductCard from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/Skeletons';
import { Sparkles, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export default function NewProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/products?sort=newest')
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError('خطا در دریافت محصولات. لطفاً صفحه را دوباره بارگذاری کنید.'); })
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
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-lg shadow-blue-600/20">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold mb-3">
            <Zap className="h-4 w-4 text-amber-300" /> تازه رسیده‌ها
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tight">جدیدترین محصولات جانبی آرنا</h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            جدیدترین قاب‌ها، گلس‌ها، هندزفری‌ها و شارژرهای دیواری متناسب با جدیدترین گوشی‌های بازار.
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            جدیدترین کالاهای موجود
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))
          ) : error ? (
            <div className="col-span-full bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/40 rounded-2xl p-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors">
                تلاش مجدد
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">در حال حاضر محصولی برای نمایش وجود ندارد.</p>
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
