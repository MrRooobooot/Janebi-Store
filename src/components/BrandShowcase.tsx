import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Award, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { toPersianDigits } from '../lib/utils';

interface Brand {
  name: string;
  faName?: string;
  nameFa?: string;
  logo?: string;
  count: number;
}

// No fake defaults: counts render only from the live /api/brands response,
// so the showcase never shows numbers the DB doesn't back.
const DEFAULT_BRANDS: Brand[] = [];

export default function BrandShowcase() {
  const [brands, setBrands] = useState<Brand[]>(DEFAULT_BRANDS);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/brands')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setBrands(data.map((b: any) => ({
            name: typeof b === 'string' ? b : (b.name || b.title),
            faName: b.faName || b.nameFa || b.name,
            count: Number(b.count) || 0
          })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-6 sm:py-8 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <Award className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
              اصالت ۱۰۰٪ تضمین‌شده
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            برندهای معتبر و نمایندگی‌های رسمی
          </h2>
        </div>

        <Link
          to="/brands"
          className="group inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
        >
          <span>مشاهده تمام برندها</span>
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </Link>
      </div>

      {/* Modern Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {brands.slice(0, 8).map((brand, idx) => {
          const displayName = brand.faName || brand.name;
          return (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
            >
              <Link
                to={`/products?brand=${encodeURIComponent(brand.name)}`}
                className="group relative flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 hover:border-orange-500/40 dark:hover:border-orange-500/40 shadow-xs hover:shadow-lg hover:shadow-orange-500/5 dark:hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300 h-full"
              >
                {/* Logo Frame */}
                <div className="w-full h-14 rounded-xl bg-gray-50/80 dark:bg-gray-700/40 group-hover:bg-orange-50/50 dark:group-hover:bg-orange-950/20 border border-gray-100/80 dark:border-gray-700/40 flex items-center justify-center p-2 transition-colors duration-300">
                  <BrandLogo name={brand.name} size="md" />
                </div>

                {/* Info */}
                <div className="mt-3 text-center w-full">
                  <div className="font-extrabold text-xs text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                    {displayName}
                  </div>
                  <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                    {toPersianDigits(brand.count)} محصول
                  </div>
                </div>

                {/* Subtle indicator dot */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 block" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
