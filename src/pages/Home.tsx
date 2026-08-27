import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton, CategoryCardSkeleton } from '../components/Skeletons';
import FAQ from '../components/FAQ';
import RecentlyViewed from '../components/RecentlyViewed';
import BrandShowcase from '../components/BrandShowcase';
import VipClubBanner from '../components/VipClubBanner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ArrowLeft, Smartphone, Shield, Zap, Cable, Headphones, 
  BatteryCharging, Truck, ShieldCheck, RefreshCw, Headset, Flame, Star, Award,
  ChevronLeft, ChevronRight, Clock, Timer
} from 'lucide-react';
import { Product } from '../types';
import { toPersianDigits } from '../lib/utils';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('همه');
  const [activeSlide, setActiveSlide] = useState(0);

  // Countdown timer for daily deals (hours, minutes, seconds)
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 20 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const heroSlides = [
    {
      id: 1,
      tag: 'تخفیف ویژه جشنواره لوازم جانبی',
      title: 'جدیدترین شارژرها و کابل‌های فست‌شارژ',
      subtitle: 'شارژرهای اورجینال ۲۰ تا ۱۰۰ وات انکر، سامسونگ و مک‌دودو با چیپست محافظ باتری و گارانتی تعویض',
      buttonText: 'خرید انواع شارژر و کابل',
      buttonLink: '/products?category=شارژر',
      badge: 'تا ۴۰٪ تخفیف',
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1000&q=80',
      bgColor: 'bg-gradient-to-l from-orange-600 to-amber-700',
    },
    {
      id: 2,
      tag: 'محافظت ۳۶۰ درجه از گوشی',
      title: 'کاورهای ضدضربه و گلس‌های سرامیکی',
      subtitle: 'مجموعه قاب‌های سیلیکونی، چرمی و مگنتیف سازگار با شارژ بیسیم Magsafe برای تمام مدل‌های آیفون و سامسونگ',
      buttonText: 'مشاهده قاب و گلس',
      buttonLink: '/products?category=قاب و کاور',
      badge: 'ضمانت اصالت فیزیکی',
      image: 'https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?auto=format&fit=crop&w=1000&q=80',
      bgColor: 'bg-gradient-to-l from-blue-700 to-indigo-900',
    },
    {
      id: 3,
      tag: 'صدای شفاف و بی‌نقص',
      title: 'هندزفری‌های بلوتوثی و ایرپادهای گیمینگ',
      subtitle: 'حذف نویز فعال (ANC)، باتری پرقدرت تا ۳۰ ساعت پخش مداوم و کیفیت مکالمه استودیویی',
      buttonText: 'مشاهده هندزفری‌ها',
      buttonLink: '/products?category=هندزفری',
      badge: 'ارسال فوری',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80',
      bgColor: 'bg-gradient-to-l from-purple-800 to-rose-800',
    },
  ];

  // Auto slide effect
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

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
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => setProducts([]));

    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((cat: any) => ({
            ...cat,
            icon: categoryIconMap[cat.title] || Smartphone,
            count: `${toPersianDigits(cat.count)} کالا`,
          }));
          setCategories(mapped);
        }
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const valueProps = [
    {
      title: 'تحویل اکسپرس کشوری',
      desc: 'ارسال سریع به تمام نقاط ایران با بسته‌بندی ایمن',
      icon: Truck,
      color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40'
    },
    {
      title: 'ضمانت ۱۰۰٪ اصالت کالا',
      desc: 'تضمین سلامت فیزیکی و کالای کاملاً اورجینال',
      icon: ShieldCheck,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
    },
    {
      title: '۷ روز ضمانت بازگشت',
      desc: 'امکان تعویض یا بازگشت بی‌قید و شرط در صورت نارضایتی',
      icon: RefreshCw,
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
    },
    {
      title: 'مشاوره و پشتیبانی تخصصی',
      desc: 'راهنمایی تلفنی و آنلاین قبل و بعد از ثبت سفارش',
      icon: Headset,
      color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40'
    },
  ];

  const categoryTabs = ['همه', ...Array.from(new Set(categories.map((c: any) => c.title)))];

  const filteredProducts = activeCategoryTab === 'همه'
    ? products.slice(0, 8)
    : products.filter(p => p.category === activeCategoryTab).slice(0, 8);

  const discountedProducts = products.filter(p => p.discount && p.discount > 0).slice(0, 6);

  return (
    <div className="space-y-16">
      
      {/* 1. Clean High-Converting Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Main Slider (8 Columns) */}
        <div className={`lg:col-span-8 relative rounded-3xl overflow-hidden shadow-lg border border-gray-200/60 dark:border-gray-800 min-h-[380px] sm:min-h-[420px] flex flex-col justify-between ${heroSlides[activeSlide].bgColor} transition-colors duration-700 group`}>
          
          {/* Background Photo with soft overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroSlides[activeSlide].image}
              alt={heroSlides[activeSlide].title}
              className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>

          {/* Slide Text & Actions */}
          <div className="relative z-10 p-6 sm:p-10 md:p-12 text-white flex flex-col justify-between h-full">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black mb-4 border border-white/30 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                <span>{heroSlides[activeSlide].tag}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 leading-tight tracking-tight max-w-xl text-white">
                {heroSlides[activeSlide].title}
              </h1>

              <p className="text-xs sm:text-sm text-gray-100 font-medium max-w-lg leading-relaxed mb-6 opacity-95">
                {heroSlides[activeSlide].subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/15">
              <Link
                to={heroSlides[activeSlide].buttonLink}
                className="inline-flex items-center gap-2 bg-white hover:bg-orange-50 text-gray-900 px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>{heroSlides[activeSlide].buttonText}</span>
                <ArrowLeft className="h-4 w-4 text-orange-600" />
              </Link>

              {/* Slider Dots */}
              <div className="flex items-center gap-2">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      activeSlide === idx ? 'w-8 bg-white shadow-sm' : 'w-2.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Slider Chevrons */}
          <button
            onClick={() => setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setActiveSlide((prev) => (prev + 1) % heroSlides.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Side Banners (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-4">
          {/* Banner 1: Powerbanks */}
          <Link
            to="/products?category=پاوربانک"
            className="flex-1 relative rounded-3xl overflow-hidden p-6 text-white flex flex-col justify-between group shadow-sm border border-gray-200/60 dark:border-gray-800 bg-gradient-to-br from-amber-600 to-slate-900 min-h-[190px]"
          >
            <div className="relative z-10">
              <span className="text-[10px] font-extrabold bg-amber-400 text-gray-950 px-2.5 py-1 rounded-full mb-2 inline-block shadow-xs">
                انرژی بی‌پایان
              </span>
              <h2 className="text-lg font-black mt-1 text-white">پاوربانک‌های ظرفیت بالا</h2>
              <p className="text-xs text-amber-100 mt-1 font-medium">فست‌شارژ ۲۰،۰۰۰ و ۳۰،۰۰۰ میلی‌آمپر</p>
            </div>
            <div className="relative z-10 flex items-center gap-1.5 text-xs font-bold text-amber-300 group-hover:translate-x-[-4px] transition-transform">
              <span>خرید انواع پاوربانک</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </div>
          </Link>

          {/* Banner 2: Wireless Earphones */}
          <Link
            to="/products?category=هندزفری"
            className="flex-1 relative rounded-3xl overflow-hidden p-6 text-white flex flex-col justify-between group shadow-sm border border-gray-200/60 dark:border-gray-800 bg-gradient-to-br from-purple-700 to-slate-950 min-h-[190px]"
          >
            <div className="relative z-10">
              <span className="text-[10px] font-extrabold bg-rose-500 text-white px-2.5 py-1 rounded-full mb-2 inline-block shadow-xs">
                پیشنهاد برگزیده
              </span>
              <h2 className="text-lg font-black mt-1 text-white">هندزفری‌های نویزکنسلینگ</h2>
              <p className="text-xs text-purple-100 mt-1 font-medium">تفکیک صدای حرفه‌ای و مکالمه شفاف</p>
            </div>
            <div className="relative z-10 flex items-center gap-1.5 text-xs font-bold text-rose-300 group-hover:translate-x-[-4px] transition-transform">
              <span>مشاهده و مقایسه مدل‌ها</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>
      </section>

      {/* 2. Incredible Deals Bar with Live Countdown Timer */}
      {discountedProducts.length > 0 && (
        <section className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 rounded-3xl p-6 sm:p-8 shadow-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                <Flame className="h-6 w-6 text-amber-300 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                  <span>پیشنهادهای شگفت‌انگیز روز</span>
                  <span className="text-xs bg-white text-rose-600 px-2.5 py-0.5 rounded-full font-extrabold">تخفیف ویژه</span>
                </h2>
                <p className="text-xs text-rose-100 mt-0.5 font-medium">فرصت محدود خرید لوازم جانبی منتخب با بیشترین تخفیف</p>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 font-mono text-sm font-black">
                <Timer className="h-4 w-4 text-amber-300 shrink-0 ml-1" />
                <span className="bg-white/20 px-2 py-0.5 rounded-lg">{toPersianDigits(timeLeft.hours.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-lg">{toPersianDigits(timeLeft.minutes.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-lg">{toPersianDigits(timeLeft.seconds.toString().padStart(2, '0'))}</span>
              </div>

              <Link
                to="/offers"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl text-xs font-extrabold text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer"
              >
                <span>مشاهده همه</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {discountedProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="bg-white dark:bg-gray-900 rounded-2xl p-3 text-gray-900 dark:text-gray-100 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:scale-[1.03] group relative overflow-hidden"
              >
                <div className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-xs">
                  {toPersianDigits(product.discount || 0)}٪
                </div>
                <div className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl p-2 mb-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.title}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold line-clamp-1 mb-2 group-hover:text-orange-600 transition-colors">
                    {product.title}
                  </h3>
                  <div className="flex flex-col items-end">
                    {product.originalPrice && (
                      <span className="text-[10px] text-gray-400 line-through">
                        {toPersianDigits(product.originalPrice.toLocaleString('fa-IR'))}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
                      {toPersianDigits(product.price.toLocaleString('fa-IR'))} <span className="text-[9px] font-normal text-gray-500">تومان</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Value Proposition Bar (۴ ستون اعتماد و خدمات) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {valueProps.map((prop, idx) => {
          const Icon = prop.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md transition-all duration-300 group"
            >
              <div className={`p-3.5 rounded-2xl border ${prop.color} shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-right">
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 mb-0.5">{prop.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{prop.desc}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* 4. Visual Circular Categories (دسته‌بندی‌های بصری گرد و مدرن) */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2.5 tracking-tight">
              <span className="w-2.5 h-7 bg-orange-600 rounded-full shadow-xs"></span>
              دسته‌بندی‌های برگزیده
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">دسترسی مستقیم به کامل‌ترین کاتالوگ لوازم جانبی</p>
          </div>
          <Link to="/products" className="text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
            مشاهده تمام کالاها <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, idx) => (
                <CategoryCardSkeleton key={idx} />
              ))
            : categories.map((cat, idx) => {
                const CategoryIcon = cat.icon;
                return (
                  <Link 
                    key={idx}
                    to={`/products?category=${encodeURIComponent(cat.title)}`} 
                    className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 flex flex-col items-center justify-center hover:shadow-lg dark:hover:shadow-black/40 hover:border-orange-200 dark:hover:border-orange-500/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer group text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl p-3.5 mb-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-800/60 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center border border-orange-100/60 dark:border-gray-700">
                      <CategoryIcon className="h-7 w-7" />
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-gray-800 dark:text-gray-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors mb-1">{cat.title}</span>
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">{cat.count}</span>
                  </Link>
                );
              })}
        </div>
      </section>

      {/* 5. Best Sellers Section with Dynamic Category Tabs */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2.5 tracking-tight">
              <span className="w-2.5 h-7 bg-orange-600 rounded-full shadow-xs"></span>
              پرفروش‌ترین‌های جانبی آرنا
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">محبوب‌ترین انتخاب‌های خریداران در ماه گذشته</p>
          </div>

          {/* Interactive Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {categoryTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveCategoryTab(tab)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategoryTab === tab
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/25 scale-105'
                    : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
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
            <div className="col-span-full py-12 text-center text-gray-400 font-bold bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
              محصولی در این دسته‌بندی پیدا نشد.
            </div>
          )}
        </div>
      </section>

      {/* 6. Brand Showcase Carousel */}
      <BrandShowcase />

      {/* 7. VIP Loyalty Club Banner */}
      <VipClubBanner />

      {/* 8. Recently Viewed Items */}
      <RecentlyViewed title="آخرین کالاهای بازدیدشده" limit={4} />

      {/* 9. FAQ Section */}
      <FAQ />
    </div>
  );
}
