import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Award, Search, Star } from 'lucide-react';
import { motion } from 'motion/react';
import BrandLogo from '../../components/BrandLogo';
import { toPersianDigits } from '../../lib/utils';

// Live brand directory from GET /api/brands (real per-brand product counts
// computed by the server). The previous static 8-brand array with invented
// counts promised products that didn't exist.
interface BrandInfo {
  name: string;
  faName: string;
  image?: string;
  logo?: string;
  count: number;
  desc: string;
}

export default function Brands() {
  const [brands, setBrands] = useState<BrandInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/brands')
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setBrands(
          Array.isArray(data)
            ? data.map((b: any) => ({
                name: b.name,
                faName: b.faName || b.name,
                image: b.image,
                logo: b.logo,
                count: Number(b.count) || 0,
                desc: b.desc || '',
              }))
            : []
        );
      })
      .catch(() => {
        if (!cancelled) setError('خطا در دریافت برندها. لطفاً صفحه را دوباره بارگذاری کنید.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBrands = brands.filter((b) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.faName.includes(searchQuery.trim()) ||
      b.desc.includes(searchQuery.trim())
    );
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 text-right"
    >
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-gray-950 via-slate-900 to-gray-900 text-white p-6 sm:p-10 overflow-hidden shadow-xl border border-gray-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold mb-4">
            <Award className="h-4 w-4" />
            <span>۱۰۰٪ محصولات اصلی با هولوگرام اصالت</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black mb-3 tracking-tight">
            برندهای معتبر و شرکای تجاری
          </h1>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            تمامی محصولات عرضه‌شده در جانبی‌آرنا مستقیماً از نمایندگی‌های رسمی تأمین شده و دارای گارانتی معتبر شرکتی و مهلت تست می‌باشند.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="جستجوی برند (مثلاً: انکر، اپل، بیسوس)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3.5 pr-9 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/60 p-5 animate-pulse">
              <div className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-700/60 mb-4" />
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-16 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700/60" />
                <div className="space-y-2 grow">
                  <div className="h-4 w-28 bg-gray-100 dark:bg-gray-700/60 rounded" />
                  <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700/60 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-gray-100 dark:bg-gray-700/60 rounded mb-2" />
              <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-700/60 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/40 rounded-2xl p-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredBrands.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {searchQuery ? 'برندی مطابق جستجوی شما یافت نشد.' : 'هنوز برندی ثبت نشده است.'}
          </p>
        </div>
      )}

      {/* Brands Grid */}
      {!loading && !error && filteredBrands.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.map((b, idx) => (
            <motion.div
              key={b.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.4) }}
            >
              <Link 
                to={`/products?brand=${encodeURIComponent(b.name)}`}
                className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/60 p-5 flex flex-col justify-between hover:shadow-xl hover:border-orange-500/40 dark:hover:border-orange-500/40 hover:-translate-y-1.5 transition-all duration-300 group h-full relative overflow-hidden"
              >
                <div>
                  {/* Cover Banner */}
                  <div className="relative h-40 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                    {b.image ? (
                      <>
                        <img 
                          src={b.image} 
                          alt={b.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {/* Item count tag */}
                        <div className="absolute top-3 left-3">
                          <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full border border-white/10 shadow-xs">
                            {toPersianDigits(b.count)} کالا
                          </span>
                        </div>
                      </>
                    ) : (
                      <BrandLogo name={b.name} size="lg" />
                    )}
                  </div>

                  {/* Brand Logo & Name Header */}
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-16 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700/60 flex items-center justify-center p-2 group-hover:scale-105 transition-transform shrink-0">
                      <BrandLogo name={b.name} size="md" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {b.faName} <span className="font-sans text-xs text-gray-400 font-medium">({b.name})</span>
                      </h3>
                      <span className="text-[11px] text-orange-600/80 dark:text-orange-400/80 font-bold">
                        نمایندگی رسمی <Star className="inline h-3 w-3 fill-current -mt-0.5" />
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {b.desc && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">
                      {b.desc}
                    </p>
                  )}
                </div>

                {/* Card Footer Action */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/60 text-xs font-bold text-orange-600 dark:text-orange-400">
                  <span className="flex items-center gap-1 text-gray-400 font-medium text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> گارانتی معتبر شرکتی
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                    مشاهده تمام کالاها <ArrowLeft className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
