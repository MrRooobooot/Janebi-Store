import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton, CategoryCardSkeleton } from '../components/Skeletons';
import FAQ from '../components/FAQ';
import RecentlyViewed from '../components/RecentlyViewed';
import BrandShowcase from '../components/BrandShowcase';
import VipClubBanner from '../components/VipClubBanner';
import { 
  Sparkles, ArrowLeft, Smartphone, Shield, Zap, Cable, Headphones, 
  BatteryCharging, Truck, ShieldCheck, RefreshCw, Headset, Flame, Star, Award,
  ChevronLeft, ChevronRight, Clock, Percent, CheckCircle2, TrendingUp
} from 'lucide-react';
import { Product } from '../types';
import { toPersianDigits, formatPrice } from '../lib/utils';
import { useStoreSettings } from '../hooks/useStoreSettings';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'chargers' | 'audio' | 'covers'>('all');
  const [activeSlide, setActiveSlide] = useState(0);
  const settings = useStoreSettings();

  // Live timer for deal of the day
  const [timeLeft, setTimeLeft] = useState({ hours: 16, minutes: 42, seconds: 15 });

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
      tag: 'تخصصی‌ترین مرجع شارژ در ایران',
      title: 'فست‌شارژهای هوشمند با محافظت ولتاژ',
      subtitle: 'شارژرهای اورجینال انکر، باسئوس و مک‌دودو مجهز به فناوری GaN و قطع‌کن خودکار برای سلامت باتری گوشی',
      buttonText: 'مشاهده شارژرها و آداپتورها',
      buttonLink: '/products?category=شارژر',
      badge: 'گارانتی تعویض ۶ ماهه',
      theme: 'from-orange-600 to-amber-700',
    },
    {
      id: 2,
      tag: 'محافظت ۱۰۰٪ از نمایشگر و بدنه',
      title: 'کاورهای مگ‌سیف و گلس‌های ضدضربه سوپردی',
      subtitle: 'تنوع بی‌نظیر قاب‌های ضدضربه، شفاف و چرمی سازگار با شارژ بیسیم برای تمامی مدل‌های آیفون، سامسونگ و شیائومی',
      buttonText: 'انتخاب قاب و محافظ صفحه',
      buttonLink: '/products?category=قاب و کاور',
      badge: 'تست فیزیکی قبل از ارسال',
      theme: 'from-zinc-800 to-zinc-950',
    },
    {
      id: 3,
      tag: 'تجربه صدای عمیق و بی‌سیم',
      title: 'ایرپادها و هندزفری‌های مجهز به نویز کنسلینگ',
      subtitle: 'مکالمه بدون نویز محیطی، درایورهای بیس تقویت‌شده و ماندگاری باتری تا ۳۰ ساعت برای مکالمه و موسیقی',
      buttonText: 'مشاهده هدفون و هندزفری',
      buttonLink: '/products?category=هندزفری',
      badge: 'مهلت تست ۷ روزه',
      theme: 'from-blue-700 to-indigo-900',
    },
  ];

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
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
    Promise.all([
      fetch('/api/products').then((r) => r.json()).catch(() => []),
      fetch('/api/categories').then((r) => r.json()).catch(() => [])
    ]).then(([prods, cats]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      if (Array.isArray(cats)) {
        setCategories(cats.map((c: any) => ({
          ...c,
          icon: categoryIconMap[c.title] || Smartphone,
        })));
      }
    }).finally(() => setLoading(false));
  }, []);

  // Algorithm: In-stock discounted deals for Amazing Deal Section
  const dealProducts = useMemo(() => {
    return products
      .filter((p) => (p.discount || 0) > 0 && (p.stockQuantity || 0) > 0)
      .sort((a, b) => (b.discount || 0) - (a.discount || 0))
      .slice(0, 5);
  }, [products]);

  // Algorithm: Filtered products by tab
  const filteredProducts = useMemo(() => {
    if (activeTab === 'chargers') return products.filter((p) => p.category === 'شارژر' || p.category === 'کابل').slice(0, 8);
    if (activeTab === 'audio') return products.filter((p) => p.category === 'هندزفری').slice(0, 8);
    if (activeTab === 'covers') return products.filter((p) => p.category === 'قاب و کاور' || p.category === 'گلس').slice(0, 8);
    return products.slice(0, 8);
  }, [products, activeTab]);

  const valueProps = [
    {
      title: 'ارسال سریع با پست پیشتاز',
      desc: 'تحویل در کمترین زمان ممکن به سراسر شهرهای کشور',
      icon: Truck,
    },
    {
      title: 'تضمین سلامت فیزیکی کالا',
      desc: 'بسته‌بندی ضربه‌گیر استاندارد و تست قبل از ارسال',
      icon: ShieldCheck,
    },
    {
      title: '۷ روز ضمانت بازگشت وجه',
      desc: 'امکان مرجوعی کالا در صورت عدم رضایت یا مغایرت',
      icon: RefreshCw,
    },
    {
      title: 'پشتیبانی فنی و تخصصی',
      desc: 'مشاوره انتخاب سوکت و توان شارژر با کارشناس',
      icon: Headset,
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      
      {/* 1. Hero Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative rounded-3xl overflow-hidden shadow-xl bg-zinc-900 border border-zinc-800 text-white min-h-[380px] md:min-h-[420px] flex items-center">
          
          {/* Background Gradient & Pattern */}
          <div className={`absolute inset-0 bg-gradient-to-r ${heroSlides[activeSlide].theme} opacity-90 transition-all duration-700`} />
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

          {/* Slide Content */}
          <div className="relative z-10 max-w-2xl px-6 sm:px-12 py-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-300 text-xs font-black">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{heroSlides[activeSlide].tag}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight text-white tracking-tight">
              {heroSlides[activeSlide].title}
            </h1>

            <p className="text-sm sm:text-base text-zinc-100/90 leading-relaxed max-w-xl font-normal">
              {heroSlides[activeSlide].subtitle}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                to={heroSlides[activeSlide].buttonLink}
                className="bg-white text-zinc-900 hover:bg-amber-400 font-black px-6 py-3 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-black/20 flex items-center gap-2 group"
              >
                <span>{heroSlides[activeSlide].buttonText}</span>
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              </Link>
              <span className="text-xs text-white/80 font-medium px-3 py-2 rounded-xl bg-black/20 backdrop-blur-xs">
                {heroSlides[activeSlide].badge}
              </span>
            </div>
          </div>

          {/* Slide Navigation Buttons */}
          <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2">
            {heroSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-8 bg-amber-400' : 'w-2.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`اسلاید ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Value Propositions Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {valueProps.map((item, i) => {
            const Icon = item.icon;
            return (
              <div 
                key={i} 
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">{item.title}</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Amazing Deals Carousel / Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-orange-600 via-rose-600 to-orange-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Flame className="h-6 w-6 text-amber-300 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black">پیشنهادات شگفت‌انگیز روز</h2>
                <p className="text-xs text-orange-100 mt-0.5">تخفیف‌های استثنایی با مهلت خرید محدود</p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold font-mono">
              <Clock className="h-4 w-4 text-amber-300" />
              <span>فرصت باقی‌مانده:</span>
              <div className="flex items-center gap-1 text-sm font-black text-amber-300">
                <span className="bg-black/30 px-2 py-0.5 rounded-lg">{toPersianDigits(timeLeft.hours.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="bg-black/30 px-2 py-0.5 rounded-lg">{toPersianDigits(timeLeft.minutes.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="bg-black/30 px-2 py-0.5 rounded-lg">{toPersianDigits(timeLeft.seconds.toString().padStart(2, '0'))}</span>
              </div>
            </div>
          </div>

          {/* Deal Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-64 bg-white/10 rounded-2xl animate-pulse" />
              ))
            ) : dealProducts.length > 0 ? (
              dealProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 text-zinc-900 dark:text-white flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200 shadow-md group"
                >
                  <div className="relative aspect-square rounded-xl bg-zinc-50 dark:bg-zinc-800 p-2 mb-3 flex items-center justify-center overflow-hidden">
                    <img 
                      src={p.image} 
                      alt={p.title} 
                      className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-200" 
                    />
                    <span className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg">
                      {toPersianDigits(p.discount || 0)}٪
                    </span>
                  </div>

                  <h3 className="text-xs font-bold line-clamp-2 leading-relaxed min-h-[36px]">
                    {p.title}
                  </h3>

                  <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-end">
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-[10px] text-zinc-400 line-through">
                        {formatPrice(p.originalPrice)}
                      </span>
                    )}
                    <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm font-medium text-white/80">
                در حال حاضر تمام شگفت‌انگیزها به پایان رسیده‌اند.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Visual Category Circles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">دسته‌بندی‌های منتخب</h2>
            <p className="text-xs text-zinc-500 mt-0.5">جستجو بر اساس نوع لوازم جانبی</p>
          </div>
          <Link to="/products" className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
            <span>مشاهده همه</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon || Smartphone;
            return (
              <Link
                key={idx}
                to={`/products?category=${encodeURIComponent(cat.title)}`}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 hover:border-orange-500 dark:hover:border-orange-500 transition-colors group text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-xs flex items-center justify-center text-zinc-700 dark:text-zinc-300 group-hover:bg-orange-600 group-hover:text-white transition-colors mb-2.5">
                  <Icon className="h-6 w-6 stroke-[1.8]" />
                </div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {cat.title}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {toPersianDigits(cat.count || 0)} کالا
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Featured Products with Smart Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">کالاهای پرطرفدار و جدید</h2>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'همه محصولات' },
              { id: 'chargers', label: 'شارژر و کابل' },
              { id: 'audio', label: 'صوتی و هندزفری' },
              { id: 'covers', label: 'قاب و محافظ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-zinc-500">
              کالایی در این دسته‌بندی یافت نشد.
            </div>
          )}
        </div>
      </section>

      {/* 6. VIP Loyalty Club Banner */}
      <VipClubBanner />

      {/* 7. Brands Showcase */}
      <BrandShowcase />

      {/* 8. FAQ Section */}
      <FAQ />

      {/* 9. Recently Viewed */}
      <RecentlyViewed />
    </div>
  );
}
