import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import SmartImage from '../components/SmartImage';
import { ProductCardSkeleton, CategoryCardSkeleton } from '../components/Skeletons';
import FAQ from '../components/FAQ';
import Testimonials from '../components/Testimonials';
import RecentlyViewed from '../components/RecentlyViewed';
import PromotionalBanner from '../components/PromotionalBanner';
import BrandShowcase from '../components/BrandShowcase';
import VipClubBanner from '../components/VipClubBanner';
import { motion } from 'motion/react';
import { 
  Sparkles, ArrowLeft, Smartphone, Shield, Zap, Cable, Headphones, 
  BatteryCharging, Truck, ShieldCheck, RefreshCw, Headset, Flame, Star, Award
} from 'lucide-react';
import { Product } from '../types';

import { toPersianDigits } from '../lib/utils';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('همه');

  const categoryIconMap: Record<string, any> = {
    'قاب و کاور': Smartphone,
    'گلس': Shield,
    'شارژر': Zap,
    'کابل': Cable,
    'هندزفری': Headphones,
    'پاوربانک': BatteryCharging,
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/products?limit=12').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
    ])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData);
        if (Array.isArray(categoriesData)) {
          const mapped = categoriesData.map((cat: any) => ({
            ...cat,
            icon: categoryIconMap[cat.title] || Smartphone,
            count: `${toPersianDigits(cat.count)} کالا`,
          }));
          setCategories(mapped);
        }
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const valueProps = [
    {
      title: 'تحویل اکسپرس کشوری',
      desc: 'ارسال فوق‌العاده سریع ۱ تا ۲ روزه',
      icon: Truck,
      color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40'
    },
    {
      title: 'ضمانت ۱۰۰٪ اصالت کالا',
      desc: 'تضمین سلامت و اورجینال بودن',
      icon: ShieldCheck,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
    },
    {
      title: '۷ روز ضمانت بازگشت',
      desc: 'تعویض یا استرداد بی‌قید و شرط',
      icon: RefreshCw,
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
    },
    {
      title: 'پشتیبانی تخصصی ۲۴/۷',
      desc: 'مشاوره آنلاین رایگان قبل از خرید',
      icon: Headset,
      color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40'
    },
  ];

  // Dynamic tabs from real categories (deduped) — hardcoded lists went stale
  // the moment the operator added a category like "audio".
  const categoryTabs = ['همه', ...Array.from(new Set(categories.map((c: any) => c.title)))];

  const filteredProducts = activeCategoryTab === 'همه'
    ? products.slice(0, 8)
    : products.filter(p => p.category === activeCategoryTab).slice(0, 8);

  return (
    <div className="space-y-16">
      <PromotionalBanner />

      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-gradient-to-br from-orange-50/90 via-amber-50/50 to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 rounded-3xl p-6 sm:p-10 md:p-14 flex flex-col md:flex-row items-center justify-between overflow-hidden relative shadow-sm border border-orange-100/80 dark:border-gray-800 transition-colors"
      >
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10 md:w-1/2 text-right">
           <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 text-xs font-extrabold mb-5 border border-orange-200/60 dark:border-orange-800/60 shadow-xs">
             <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-spin" style={{ animationDuration: '6s' }} /> مرجع تخصصی لوازم جانبی اورجینال
           </div>
           
           <motion.h1 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2, duration: 0.5 }}
             className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-gray-100 mb-5 leading-tight tracking-tight"
           >
             لوازم جانبی مطمئن <br/>
             <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 dark:from-orange-400 dark:via-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
               برای گوشی هوشمند تو
             </span>
           </motion.h1>

           <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.4, duration: 0.5 }}
             className="text-gray-600 dark:text-gray-300 mb-8 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-xl"
           >
             تنوع بی‌نظیر انواع کاور، گلس، کابل شارژ سریع، پاوربانک و هندزفری با گارانتی اصالت و ارسال اکسپرس به تمام ایران.
           </motion.p>

           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.6, duration: 0.3 }}
             className="flex flex-wrap items-center gap-3"
           >
             <Link to="/products" className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-8 py-4 rounded-2xl font-extrabold text-sm shadow-xl shadow-orange-600/25 transition-all duration-300 hover:scale-[1.02] active:scale-95">
               مشاهده همه محصولات <ArrowLeft className="h-4 w-4" />
             </Link>
             <Link to="/offers" className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-800 dark:text-gray-200 px-7 py-4 rounded-2xl font-bold text-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
               <Flame className="h-4 w-4 text-orange-500" /> تخفیف‌های شگفت‌انگیز
             </Link>
           </motion.div>

           {/* Stats badge counter */}
           <div className="mt-10 pt-6 border-t border-gray-200/60 dark:border-gray-800 flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>بیش از <strong>۵,۰۰۰</strong> مشتری راضی</span>
              </div>
              <div>•</div>
              <div>ارسال <strong>۱۰۰٪</strong> سریع</div>
           </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="md:w-1/2 mt-10 md:mt-0 flex justify-end w-full relative"
        >
          <div className="w-full max-w-md aspect-4/3 relative rounded-3xl overflow-hidden shadow-2xl border border-white/30 dark:border-gray-800 group">
            <SmartImage
              src="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80"
              alt="لوازم جانبی اورجینال"
              priority
              fallbackIcon={Smartphone}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
            
            <div className="absolute bottom-4 right-4 left-4 p-4 rounded-2xl bg-white/15 dark:bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-between shadow-lg">
              <div>
                <p className="text-xs font-extrabold flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-400" />
                  محصولات برندهای انکر، اپل، سامسونگ
                </p>
                <p className="text-[11px] text-gray-200 mt-0.5">ضمانت اصالت فیزیکی و تعویض ۷ روزه</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                ★ 4.9
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Trust & Value Proposition Bar */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {valueProps.map((prop, idx) => {
          const Icon = prop.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-5 border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`p-3.5 rounded-2xl border ${prop.color} shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 mb-0.5">{prop.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{prop.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
            <span className="w-2.5 h-8 bg-orange-600 dark:bg-orange-500 rounded-full shadow-sm"></span>
            دسته‌بندی‌های محبوب
          </h2>
          <Link to="/products" className="text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
            مشاهده همه <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, idx) => (
                <CategoryCardSkeleton key={idx} />
              ))
            : categories.map((cat, idx) => {
                const CategoryIcon = cat.icon;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                    key={idx}
                  >
                    <Link 
                      to={`/products?category=${encodeURIComponent(cat.title)}`} 
                      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 flex flex-col items-center justify-center hover:shadow-md dark:hover:shadow-black/30 hover:border-orange-200 dark:hover:border-orange-500/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                    >
                      <div className={`rounded-2xl p-3 mb-2 bg-gradient-to-br ${cat.color} group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors mb-0.5">{cat.title}</span>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{cat.count}</span>
                    </Link>
                  </motion.div>
                );
              })}
        </div>
      </section>

      {/* Best Sellers Section with Category Tabs */}
      <section>
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
           <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
             <span className="w-2.5 h-8 bg-orange-600 dark:bg-orange-500 rounded-full shadow-xs"></span>
             پرفروش‌ترین محصولات
           </h2>

           {/* Tabs */}
           <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
             {categoryTabs.map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveCategoryTab(tab)}
                 className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                   activeCategoryTab === tab
                     ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                     : 'bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                 }`}
               >
                 {tab}
               </button>
             ))}
           </div>
         </div>

         <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <ProductCardSkeleton key={idx} />
              ))
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400 font-bold">
                محصولی در این دسته‌بندی پیدا نشد.
              </div>
            )}
         </div>
      </section>

      {/* Brand Showcase */}
      <BrandShowcase />

      {/* VIP Club Newsletter */}
      <VipClubBanner />

      {/* Customer Testimonials */}
      <Testimonials />

      {/* Recently Viewed */}
      <RecentlyViewed title="آخرین بازدیدهای شما" limit={4} />

      {/* FAQ */}
      <FAQ />
    </div>
  );
}
