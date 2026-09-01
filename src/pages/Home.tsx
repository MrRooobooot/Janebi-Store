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
  Clock, TrendingUp, Award, CheckCircle2, Navigation, Layers, ShieldAlert, PackageCheck
} from 'lucide-react';
import { Product } from '../types';
import { toPersianDigits, formatPrice, getAssetUrl } from '../lib/utils';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { STORE_SETTINGS_DEFAULTS } from '../lib/constants';
import PictureImage from '../components/PictureImage';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'holders' | 'cables' | 'cases' | 'protectors'>('all');
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
      tag: 'مرجع تخصصی هولدر و استند موبایل',
      title: settings.heroSlide1Title || STORE_SETTINGS_DEFAULTS.heroSlide1Title,
      subtitle: settings.heroSlide1Subtitle || STORE_SETTINGS_DEFAULTS.heroSlide1Subtitle,
      buttonText: 'مشاهده انواع هولدر و استند',
      buttonLink: settings.heroSlide1Link || STORE_SETTINGS_DEFAULTS.heroSlide1Link,
      badge: settings.heroSlide1Badge || STORE_SETTINGS_DEFAULTS.heroSlide1Badge,
      image: '/products/hld-13.svg',
      borderColor: 'border-orange-500/40',
      badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    },
    {
      id: 2,
      tag: 'محافظت ۱۰۰٪ از بدنه، لنز و صفحه نمایش',
      title: settings.heroSlide2Title || STORE_SETTINGS_DEFAULTS.heroSlide2Title,
      subtitle: settings.heroSlide2Subtitle || STORE_SETTINGS_DEFAULTS.heroSlide2Subtitle,
      buttonText: 'انتخاب قاب و محافظ صفحه',
      buttonLink: settings.heroSlide2Link || STORE_SETTINGS_DEFAULTS.heroSlide2Link,
      badge: settings.heroSlide2Badge || STORE_SETTINGS_DEFAULTS.heroSlide2Badge,
      image: '/products/cas-4.svg',
      borderColor: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    },
    {
      id: 3,
      tag: 'کابل‌های فست و محافظ‌های ضدقطعی',
      title: settings.heroSlide3Title || STORE_SETTINGS_DEFAULTS.heroSlide3Title,
      subtitle: settings.heroSlide3Subtitle || STORE_SETTINGS_DEFAULTS.heroSlide3Subtitle,
      buttonText: 'مشاهده کابل‌ها و محافظ‌ها',
      buttonLink: settings.heroSlide3Link || STORE_SETTINGS_DEFAULTS.heroSlide3Link,
      badge: settings.heroSlide3Badge || STORE_SETTINGS_DEFAULTS.heroSlide3Badge,
      image: '/products/cbl-1.svg',
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
    'هولدر و پایه': Navigation,
    'قاب و کاور': Smartphone,
    'گلس': Shield,
    'کابل': Cable,
    'محافظ کابل': Layers,
    'شارژر': Zap,
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
    if (activeTab === 'holders') return products.filter((p) => p.category === 'هولدر و پایه');
    if (activeTab === 'cables') return products.filter((p) => p.category === 'کابل' || p.category === 'محافظ کابل');
    if (activeTab === 'cases') return products.filter((p) => p.category === 'قاب و کاور');
    if (activeTab === 'protectors') return products.filter((p) => p.category === 'گلس' || p.category === 'محافظ کابل');
    return products.slice(0, 8);
  }, [products, activeTab]);

  const valueProps = [
    {
      title: 'فروش تک و عمده همکاران',
      desc: 'قیمت رقابتی بازار و ارسال کارتنی برای فروشگاه‌ها',
      icon: PackageCheck,
      color: 'text-orange-500 bg-orange-500/15 border-orange-500/30',
    },
    {
      title: 'ارسال فوری پیشتاز',
      desc: 'تحویل سریع در بسته‌بندی ضدضربه به سراسر کشور',
      icon: Truck,
      color: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30',
    },
    {
      title: 'تضمین سلامت فیزیکی',
      desc: 'مهلت تست ۷ روزه و امکان تعویض در صورت مغایرت',
      icon: ShieldCheck,
      color: 'text-blue-500 bg-blue-500/15 border-blue-500/30',
    },
    {
      title: 'مشاوره خرید هولدر و قاب',
      desc: 'راهنمایی انتخاب مدل متناسب با خودرو و مدل گوشی',
      icon: Headset,
      color: 'text-purple-500 bg-purple-500/15 border-purple-500/30',
    },
  ];

  const currentSlide = heroSlides[activeSlide];

  return (
    <div className="space-y-8 sm:space-y-12 pb-16 w-full max-w-full overflow-hidden box-border">
      
      {/* 1. Hero Showcase Section */}
      <section className="w-full box-border">
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-b from-orange-50/70 via-white to-zinc-50 dark:from-[#0e1422] dark:via-[#090d16] dark:to-[#05070c] border border-orange-200/80 dark:${currentSlide.borderColor} shadow-xl dark:shadow-2xl p-6 sm:p-8 lg:p-10 transition-all duration-700 min-h-[360px] sm:min-h-[420px] flex flex-col justify-between`}>
          
          {/* Subtle Ambient Dot Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#0000000a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* Grid: Text Column & Graphic Column */}
          <div className="relative z-10 w-full grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            
            {/* Text & Actions */}
            <div className="md:col-span-7 space-y-4 text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-zinc-800/90 border border-orange-200 dark:border-zinc-700 text-orange-700 dark:text-amber-400 text-xs font-black shadow-xs">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-orange-600 dark:text-amber-400 shrink-0" />
                <span>{currentSlide.tag}</span>
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-zinc-900 dark:text-white leading-snug tracking-tight">
                {currentSlide.title}
              </h1>

              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
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

                <div className={`text-xs font-black px-4 py-2.5 rounded-2xl border bg-orange-100 text-orange-800 border-orange-200 dark:${currentSlide.badgeBg} flex items-center gap-2`}>
                  <Award className="h-4 w-4 shrink-0 text-orange-600 dark:text-inherit" />
                  <span>{currentSlide.badge}</span>
                </div>
              </div>
            </div>

            {/* Visual 3D Asset Showcase Column (Desktop/Tablet) */}
            <div className="hidden md:flex md:col-span-5 items-center justify-center relative">
              <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-3xl p-6 bg-white/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 backdrop-blur-md flex items-center justify-center shadow-lg dark:shadow-2xl group">
                <PictureImage
                  src={currentSlide.image}
                  alt={currentSlide.title}
                  width="320"
                  height="320"
                  priority={true}
                  className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          {/* Slide Indicator Dots (Centered) */}
          <div className="relative z-10 flex items-center justify-center gap-2 mt-6 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
            {heroSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-8 bg-orange-500 shadow-md shadow-orange-500/50' : 'w-2.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-500'
                }`}
                aria-label={`اسلاید ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Wholesale / B2B Banner Strip */}
      <section className="w-full">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-amber-500/10 dark:from-amber-600/20 dark:via-orange-600/20 dark:to-amber-600/20 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 text-right">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">فروش عمده، کارتنی و همکاران سراسر ایران</h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5">قیمت همکاری ویژه برای مغازه‌داران و خریداران عمده هولدر، قاب، گلس و کابل</p>
            </div>
          </div>
          <Link
            to="/contact?type=wholesale"
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition-all shadow-md shadow-orange-600/25 shrink-0 cursor-pointer"
          >
            استعلام لیست قیمت عمده
          </Link>
        </div>
      </section>

      {/* 3. Value Propositions Bar */}
      <section className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {valueProps.map((item, i) => {
            const Icon = item.icon;
            return (
              <div 
                key={i} 
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--color-surface-light)] dark:bg-[#0d121c] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-orange-500/40 transition-colors"
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

      {/* 4. Amazing Deals Section */}
      <section className="w-full">
        <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50/40 dark:from-[#121827] dark:via-[#0b0f19] dark:to-[#06080e] rounded-3xl p-5 sm:p-8 text-zinc-900 dark:text-white border border-orange-200/80 dark:border-orange-500/30 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
          
          {/* Section Header */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-orange-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Flame className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-zinc-900 dark:text-white">پیشنهادات شگفت‌انگیز روز</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">تخفیف‌های محدود با تضمین کمترین قیمت بازار</p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 border border-orange-200/80 dark:border-zinc-700/80 px-3.5 py-1.5 rounded-2xl text-xs font-bold font-mono shadow-xs">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="text-zinc-700 dark:text-zinc-200">فرصت باقی‌مانده:</span>
              <div className="flex items-center gap-1 text-sm font-black text-orange-600 dark:text-orange-400">
                <span className="bg-orange-100/70 dark:bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-orange-200 dark:border-zinc-700 text-orange-700 dark:text-orange-300">{toPersianDigits(timeLeft.hours.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="bg-orange-100/70 dark:bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-orange-200 dark:border-zinc-700 text-orange-700 dark:text-orange-300">{toPersianDigits(timeLeft.minutes.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="bg-orange-100/70 dark:bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-orange-200 dark:border-zinc-700 text-orange-700 dark:text-orange-300">{toPersianDigits(timeLeft.seconds.toString().padStart(2, '0'))}</span>
              </div>
            </div>
          </div>

          {/* Deal Cards */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-64 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-2xl animate-pulse" />
              ))
            ) : dealProducts.length > 0 ? (
              dealProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="bg-white/90 hover:bg-white dark:bg-zinc-800/70 dark:hover:bg-zinc-800 border border-zinc-200/80 hover:border-orange-500/50 dark:border-zinc-700/60 dark:hover:border-orange-500/40 rounded-2xl p-3.5 text-zinc-900 dark:text-white flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md group"
                >
                  <div className="relative aspect-square rounded-xl bg-zinc-50 dark:bg-zinc-900/80 p-3 mb-3 flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-transparent">
                    <PictureImage 
                      src={p.image} 
                      alt={p.title} 
                      width="160"
                      height="160"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.06)] dark:drop-shadow-none" 
                    />
                    <span className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs">
                      {toPersianDigits(p.discount || 0)}٪
                    </span>
                  </div>

                  <h3 className="text-xs font-bold line-clamp-2 leading-relaxed min-h-[36px] text-zinc-800 dark:text-zinc-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {p.title}
                  </h3>

                  <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-700/50 flex flex-col items-end">
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-[10px] text-zinc-400 line-through">
                        {formatPrice(p.originalPrice)}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-black text-orange-600 dark:text-orange-400">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm font-medium text-zinc-500 dark:text-zinc-300">
                در حال حاضر تمام شگفت‌انگیزها به پایان رسیده‌اند.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Category Visual Circles */}
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
                className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-[var(--color-surface-light)] dark:bg-[#0d121c] border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 dark:hover:border-orange-500 transition-colors group text-center shadow-xs"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:bg-orange-600 group-hover:text-white transition-all mb-2">
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

      {/* 6. Trending Products Tabs Focus on Core Categories */}
      <section className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">کالاهای برگزیده بازار</h2>
          </div>

          {/* Core Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'همه محصولات' },
              { id: 'holders', label: 'هولدر و پایه' },
              { id: 'cases', label: 'قاب و کاور' },
              { id: 'protectors', label: 'گلس و محافظ کابل' },
              { id: 'cables', label: 'کابل و شارژر' },
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

      {/* 7. VIP Loyalty Club Banner */}
      <VipClubBanner />

      {/* 8. Brands Showcase */}
      <BrandShowcase />

      {/* 9. FAQ Section */}
      <FAQ />

      {/* 10. Recently Viewed */}
      <RecentlyViewed />
    </div>
  );
}
