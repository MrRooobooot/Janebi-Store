import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeletons';
import FAQ from '../components/FAQ';
import RecentlyViewed from '../components/RecentlyViewed';
import BrandShowcase from '../components/BrandShowcase';
import VipClubBanner from '../components/VipClubBanner';
import { 
  Sparkles, ArrowLeft, Smartphone, Shield, Zap, Cable, Headphones, 
  BatteryCharging, Truck, ShieldCheck, RefreshCw, Headset, Flame, Star, 
  Clock, TrendingUp, Award, CheckCircle2
} from 'lucide-react';
import { Product } from '../types';
import { toPersianDigits, formatPrice, getAssetUrl } from '../lib/utils';
import { useStoreSettings } from '../hooks/useStoreSettings';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'chargers' | 'audio' | 'covers'>('all');
  const [activeSlide, setActiveSlide] = useState(0);
  const settings = useStoreSettings();

  // Live timer for daily deals
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

  const heroSlides = useMemo(() => [
    {
      id: 1,
      tag: 'تخصصی‌ترین مرجع شارژ در ایران',
      title: settings.heroSlide1Title || 'فست‌شارژهای هوشمند با محافظت ولتاژ',
      subtitle: settings.heroSlide1Subtitle || 'شارژرهای اورجینال انکر، باسئوس و مک‌دودو مجهز به فناوری GaN و قطع‌کن خودکار برای سلامت باتری گوشی',
      buttonText: 'مشاهده شارژرها و آداپتورها',
      buttonLink: settings.heroSlide1Link || '/products?category=شارژر',
      badge: settings.heroSlide1Badge || 'گارانتی تعویض ۶ ماهه',
      image: '/products/chg-2.svg',
      borderColor: 'border-orange-500/40',
      badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    },
    {
      id: 2,
      tag: 'محافظت ۱۰۰٪ از نمایشگر و بدنه',
      title: settings.heroSlide2Title || 'کاورهای مگ‌سیف و گلس‌های ضدضربه سوپردی',
      subtitle: settings.heroSlide2Subtitle || 'تنوع بی‌نظیر قاب‌های ضدضربه، شفاف و چرمی سازگار با شارژ بیسیم برای تمامی مدل‌های آیفون، سامسونگ و شیائومی',
      buttonText: 'انتخاب قاب و محافظ صفحه',
      buttonLink: settings.heroSlide2Link || '/products?category=قاب و کاور',
      badge: settings.heroSlide2Badge || 'تست فیزیکی قبل از ارسال',
      image: '/products/cas-4.svg',
      borderColor: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    },
    {
      id: 3,
      tag: 'تجربه صدای عمیق و بدون نویز',
      title: settings.heroSlide3Title || 'ایرپادها و هندزفری‌های مجهز به نویز کنسلینگ',
      subtitle: settings.heroSlide3Subtitle || 'مکالمه بدون نویز محیطی، درایورهای بیس تقویت‌شده و ماندگاری باتری تا ۳۰ ساعت برای مکالمه و موسیقی',
      buttonText: 'مشاهده هدفون و هندزفری',
      buttonLink: settings.heroSlide3Link || '/products?category=هندزفری',
      badge: settings.heroSlide3Badge || 'مهلت تست ۷ روزه',
      image: '/products/ear-6.svg',
      borderColor: 'border-purple-500/40',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
  ], [settings]);

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

  const dealProducts = useMemo(() => {
    return products
      .filter((p) => (p.discount || 0) > 0 && (p.stockQuantity || 0) > 0)
      .sort((a, b) => (b.discount || 0) - (a.discount || 0))
      .slice(0, 5);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeTab === 'chargers') return products.filter((p) => p.category === 'شارژر' || p.category === 'کابل').slice(0, 8);
    if (activeTab === 'audio') return products.filter((p) => p.category === 'هندزفری').slice(0, 8);
    if (activeTab === 'covers') return products.filter((p) => p.category === 'قاب و کاور' || p.category === 'گلس').slice(0, 8);
    return products.slice(0, 8);
  }, [products, activeTab]);

  const valueProps = [
    {
      title: 'ارسال فوری پیشتاز',
      desc: 'تحویل سریع در بسته‌بندی ایمن به تمام نقاط کشور',
      icon: Truck,
      color: 'text-orange-500 bg-orange-500/15 border-orange-500/30',
    },
    {
      title: 'ضمانت اصالت ۱۰۰٪',
      desc: 'تضمین اصالت کالا و مهلت تست سلامت فیزیکی',
      icon: ShieldCheck,
      color: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30',
    },
    {
      title: '۷ روز بازگشت وجه',
      desc: 'امکان مرجوعی بدون قید و شرط در صورت مغایرت',
      icon: RefreshCw,
      color: 'text-blue-500 bg-blue-500/15 border-blue-500/30',
    },
    {
      title: 'مشاوره تخصصی خرید',
      desc: 'راهنمایی انتخاب توان، پورت و مدل متناسب با گوشی',
      icon: Headset,
      color: 'text-purple-500 bg-purple-500/15 border-purple-500/30',
    },
  ];

  const currentSlide = heroSlides[activeSlide];

  return (
    <div className="space-y-8 sm:space-y-12 pb-16 w-full max-w-full overflow-hidden box-border">
      
      {/* 1. Hero Showcase Section */}
      <section className="w-full box-border">
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#0e1422] via-[#090d16] to-[#05070c] border ${currentSlide.borderColor} shadow-2xl p-6 sm:p-8 lg:p-10 transition-all duration-700 min-h-[360px] sm:min-h-[420px] flex flex-col justify-between`}>
          
          {/* Subtle Ambient Dot Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* Grid: Text Column & Graphic Column */}
          <div className="relative z-10 w-full grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            
            {/* Text & Actions */}
            <div className="md:col-span-7 space-y-4 text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/90 border border-zinc-700 text-amber-400 text-xs font-black shadow-xs">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-400 shrink-0" />
                <span>{currentSlide.tag}</span>
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-snug tracking-tight">
                {currentSlide.title}
              </h1>

              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal">
                {currentSlide.subtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to={currentSlide.buttonLink}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-black px-6 py-3 rounded-2xl text-xs sm:text-sm transition-all duration-200 shadow-lg shadow-orange-600/30 flex items-center gap-2 group active:scale-95"
                >
                  <span>{currentSlide.buttonText}</span>
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                </Link>

                <div className={`text-xs font-black px-4 py-2.5 rounded-2xl border ${currentSlide.badgeBg} flex items-center gap-2`}>
                  <Award className="h-4 w-4 shrink-0" />
                  <span>{currentSlide.badge}</span>
                </div>
              </div>
            </div>

            {/* Visual 3D Asset Showcase Column (Desktop/Tablet) */}
            <div className="hidden md:flex md:col-span-5 items-center justify-center relative">
              <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-3xl p-6 bg-zinc-800/60 border border-zinc-700/60 backdrop-blur-md flex items-center justify-center shadow-2xl group">
                <img
                  src={getAssetUrl(currentSlide.image)}
                  alt={currentSlide.title}
                  className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          {/* Slide Indicator Dots (Centered) */}
          <div className="relative z-10 flex items-center justify-center gap-2 mt-6 pt-3 border-t border-zinc-800/80">
            {heroSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-8 bg-orange-500 shadow-md shadow-orange-500/50' : 'w-2.5 bg-zinc-700 hover:bg-zinc-500'
                }`}
                aria-label={`اسلاید ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Value Propositions Bar */}
      <section className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {valueProps.map((item, i) => {
            const Icon = item.icon;
            return (
              <div 
                key={i} 
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-orange-500/40 transition-colors"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${item.color}`}>
                  <Icon className="h-6 w-6 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">{item.title}</h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-snug">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Amazing Deals Section */}
      <section className="w-full">
        <div className="bg-gradient-to-br from-[#121827] via-[#0b0f19] to-[#06080e] rounded-3xl p-5 sm:p-8 text-white border border-orange-500/30 shadow-2xl relative overflow-hidden">
          
          {/* Section Header */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Flame className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-white">پیشنهادات شگفت‌انگیز روز</h2>
                <p className="text-xs text-zinc-300 mt-0.5">تخفیف‌های محدود با تضمین کمترین قیمت بازار</p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-2 bg-zinc-800/90 border border-zinc-700/80 px-3.5 py-1.5 rounded-2xl text-xs font-bold font-mono">
              <Clock className="h-4 w-4 text-orange-400 shrink-0" />
              <span className="text-zinc-200">فرصت باقی‌مانده:</span>
              <div className="flex items-center gap-1 text-sm font-black text-orange-400">
                <span className="bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-zinc-700">{toPersianDigits(timeLeft.hours.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-zinc-700">{toPersianDigits(timeLeft.minutes.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-zinc-700">{toPersianDigits(timeLeft.seconds.toString().padStart(2, '0'))}</span>
              </div>
            </div>
          </div>

          {/* Deal Cards */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-64 bg-zinc-800/50 rounded-2xl animate-pulse" />
              ))
            ) : dealProducts.length > 0 ? (
              dealProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/60 hover:border-orange-500/40 rounded-2xl p-3.5 text-white flex flex-col justify-between transition-all duration-200 shadow-md group"
                >
                  <div className="relative aspect-square rounded-xl bg-zinc-900/80 p-3 mb-3 flex items-center justify-center overflow-hidden">
                    <img 
                      src={getAssetUrl(p.image)} 
                      alt={p.title} 
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" 
                    />
                    <span className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">
                      {toPersianDigits(p.discount || 0)}٪
                    </span>
                  </div>

                  <h3 className="text-xs font-bold line-clamp-2 leading-relaxed min-h-[36px] text-zinc-100 group-hover:text-orange-400 transition-colors">
                    {p.title}
                  </h3>

                  <div className="mt-3 pt-2 border-t border-zinc-700/50 flex flex-col items-end">
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-[10px] text-zinc-400 line-through">
                        {formatPrice(p.originalPrice)}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-black text-orange-400">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm font-medium text-zinc-300">
                در حال حاضر تمام شگفت‌انگیزها به پایان رسیده‌اند.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Category Visual Circles */}
      <section className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">دسته‌بندی‌های تخصصی</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">انتخاب تجهیزات بر اساس دسته‌بندی</p>
          </div>
          <Link to="/products" className="text-xs font-black text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
            <span>مشاهده کاتالوگ کامل</span>
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
                className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 dark:hover:border-orange-500 transition-colors group text-center shadow-xs"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:bg-orange-600 group-hover:text-white transition-all mb-2">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.8]" />
                </div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {cat.title}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {toPersianDigits(cat.count || 0)} کالا
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Trending Products Tabs */}
      <section className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">کالاهای برگزیده بازار</h2>
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-colors shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-zinc-400">
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
