import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeletons';
import FAQ from '../components/FAQ';
import LatestReviews from '../components/LatestReviews';
import RecentlyViewed from '../components/RecentlyViewed';
import VipClubBanner from '../components/VipClubBanner';
import {
  ArrowLeft, Smartphone, Truck, ShieldCheck, Headset,
  PackageCheck, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getJson } from '../lib/jsonFetch';
import { getCategoryIcon, getCategoryWell } from '../lib/categoryIcons';
import { Product } from '../types';
import { toPersianDigits, normalizePersianTypography } from '../lib/utils';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { STORE_SETTINGS_DEFAULTS } from '../lib/constants';

/** Homepage slides. Copy is HTML type; photos are product-only so old settings art cannot return. */
const HERO_COPY: Record<string, { kicker: string; title: string; line: string; action: string; image: string }> = {
  'هولدر و نگهدارنده': {
    kicker: 'هولدر',
    title: 'گوشی سر جایش می‌ماند',
    line: 'مگنتی، برای خودرو و میز',
    action: 'دیدن هولدرها',
    image: '/images/hero/holder.webp',
  },
  'کابل و سیم': {
    kicker: 'کابل',
    title: 'شارژ که قطع نمی‌شود',
    line: 'بافت کنفی، اتصال محکم',
    action: 'دیدن کابل‌ها',
    image: '/images/hero/cable.webp',
  },
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const catScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const isDraggingCat = useRef(false);
  const catStartX = useRef(0);
  const catStartScroll = useRef(0);
  const catDragMoved = useRef(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const mobileTouchX = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const settings = useStoreSettings();

  const updateCatScrollBounds = () => {
    const el = catScrollRef.current;
    if (!el) return;
    const scrollLeft = Math.abs(el.scrollLeft);
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollPrev(scrollLeft > 15);
    setCanScrollNext(scrollLeft < maxScroll - 15);
  };

  const scrollCats = (direction: 'prev' | 'next') => {
    const el = catScrollRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.75, 360);
    el.scrollBy({
      left: direction === 'next' ? -step : step,
      behavior: 'smooth',
    });
    setTimeout(updateCatScrollBounds, 350);
  };

  const handleCatMouseDown = (e: React.MouseEvent) => {
    const el = catScrollRef.current;
    if (!el) return;
    isDraggingCat.current = true;
    catDragMoved.current = false;
    catStartX.current = e.pageX - el.offsetLeft;
    catStartScroll.current = el.scrollLeft;
  };

  const handleCatMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCat.current) return;
    const el = catScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - catStartX.current);
    if (Math.abs(walk) > 4) {
      catDragMoved.current = true;
    }
    el.scrollLeft = catStartScroll.current - walk;
    updateCatScrollBounds();
  };

  const handleCatMouseUp = () => {
    isDraggingCat.current = false;
  };

  const heroSlides = useMemo(() => {
    const known = Object.entries(HERO_COPY).map(([category, copy]) => ({
      id: category,
      ...copy,
      to: `/products?category=${encodeURIComponent(category)}`,
    }));
    if (categories.length === 0) return known;
    const live = new Set(categories.map((c) => c.title as string));
    const available = known.filter((slide) => live.has(slide.id));
    return available.length ? available : known.slice(0, 1);
  }, [categories]);

  useEffect(() => {
    if (activeSlide >= heroSlides.length) setActiveSlide(0);
  }, [heroSlides.length, activeSlide]);


  // Auto slide — paused entirely when the user prefers reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      getJson('/api/products?limit=1000'),
      getJson('/api/categories'),
    ]).then(([prods, cats]) => {
      if (cancelled) return;
      setProducts(Array.isArray(prods) ? prods : []);
      if (Array.isArray(cats)) {
        setCategories(cats.map((c: any) => ({
          ...c,
          title: c.title === 'accessories' ? 'لوازم جانبی' : c.title,
          icon: getCategoryIcon(c.title),
        })));
      }
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const dealProducts = useMemo(() => {
    return products
      .filter((p) => (p.discount || 0) > 0 && (p.stockQuantity || 0) > 0)
      .sort((a, b) => (b.discount || 0) - (a.discount || 0))
      .slice(0, 4);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeTab === 'all') return products.slice(0, 8);
    return products.filter((p) => p.category === activeTab);
  }, [products, activeTab]);

  const valueProps = useMemo(() => [
    {
      title: settings.valueProp1Title || STORE_SETTINGS_DEFAULTS.valueProp1Title,
      desc: settings.valueProp1Desc || STORE_SETTINGS_DEFAULTS.valueProp1Desc,
      icon: PackageCheck,
    },
    {
      title: settings.valueProp2Title || STORE_SETTINGS_DEFAULTS.valueProp2Title,
      desc: settings.valueProp2Desc || STORE_SETTINGS_DEFAULTS.valueProp2Desc,
      icon: Truck,
    },
    {
      title: settings.valueProp3Title || STORE_SETTINGS_DEFAULTS.valueProp3Title,
      desc: settings.valueProp3Desc || STORE_SETTINGS_DEFAULTS.valueProp3Desc,
      icon: ShieldCheck,
    },
    {
      title: settings.valueProp4Title || STORE_SETTINGS_DEFAULTS.valueProp4Title,
      desc: settings.valueProp4Desc || STORE_SETTINGS_DEFAULTS.valueProp4Desc,
      icon: Headset,
    },
  ], [settings]);

  const renderCategoryCard = (cat: any, idx: number) => {
    const Icon = cat.icon || Smartphone;
    return (
      <Link
        key={`${cat.slug}-${idx}`}
        to={`/products?category=${encodeURIComponent(cat.title)}`}
        onClick={(e) => {
          if (catDragMoved.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className="w-full h-full min-h-[148px] sm:min-h-[168px] relative flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-[var(--color-surface-dark)] border border-slate-200/80 dark:border-white/[0.08] group text-center select-none min-touch-target"
      >
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 shrink-0 ${getCategoryWell(cat.title)}`}>
          <Icon className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2]" />
        </div>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--color-emphasis-text)] dark:group-hover:text-[var(--color-emphasis-text)] transition-colors w-full px-1 block leading-tight line-clamp-2">
          {cat.title}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
          {toPersianDigits(cat.count || 0)} کالا
        </span>
      </Link>
    );
  };

  return (
    <div className="page-stack pb-24 lg:pb-16 w-full max-w-full overflow-hidden box-border">
      
      {/* 1. Hero Showcase Section */}
      <section className="w-full box-border">
        {/* Single page h1 — lives OUTSIDE the carousel: one h1 on every breakpoint,
            rotation-safe (slide titles are plain <p>), SEO + a11y clean. */}
        <h1 className="sr-only">فروشگاه لوازم جانبی موبایل و تبلت | جانبی آرنا</h1>
        <div
          className="relative aspect-[2/1] overflow-hidden rounded-3xl shadow-lg touch-pan-y"
          onTouchStart={(e) => { mobileTouchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - mobileTouchX.current;
            if (Math.abs(dx) > 48) {
              setActiveSlide((prev) => (dx < 0 ? (prev + 1) % heroSlides.length : (prev === 0 ? heroSlides.length - 1 : prev - 1)));
            }
          }}
        >
          {heroSlides.map((slide, idx) => (
            <Link
              key={slide.id}
              to={slide.to}
              aria-label={`${slide.title}. ${slide.action}`}
              aria-hidden={idx !== activeSlide}
              tabIndex={idx === activeSlide ? 0 : -1}
              className="absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none"
              style={{ opacity: idx === activeSlide ? 1 : 0, pointerEvents: idx === activeSlide ? 'auto' : 'none' }}
            >
              <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-y-0 right-0 z-10 flex w-[48%] max-w-md flex-col justify-center gap-0.5 pb-12 pr-3 text-slate-900 sm:gap-2 sm:pb-16 sm:pr-8">
                <span className="text-xs font-bold text-slate-500 sm:text-sm">{slide.kicker}</span>
                <span className="text-lg font-black leading-tight sm:text-4xl">{slide.title}</span>
                <span className="text-xs font-medium text-slate-600 sm:text-base">{slide.line}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-cta)] sm:mt-1 sm:text-sm">
                  {slide.action}
                  <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
              </span>
            </Link>
          ))}

          {heroSlides.length > 1 && (
            <div className="absolute inset-x-2 bottom-2 z-20 flex items-center justify-between gap-3 sm:inset-x-3 sm:bottom-3">
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
                aria-label="اسلاید قبلی"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white sm:h-11 sm:w-11"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="flex items-center gap-1" role="tablist" aria-label="اسلایدهای صفحه اصلی">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    role="tab"
                    aria-selected={activeSlide === idx}
                    aria-label={`اسلاید ${toPersianDigits(idx + 1)}`}
                    className="flex h-9 min-w-6 items-center justify-center px-1 sm:h-11"
                  >
                    <span className={`block h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${activeSlide === idx ? 'w-7 bg-slate-900' : 'w-2 bg-slate-900/35'}`} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev + 1) % heroSlides.length)}
                aria-label="اسلاید بعدی"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white sm:h-11 sm:w-11"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:hidden">
          {valueProps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-snug text-slate-900 dark:text-white">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{item.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Amazing Deals Section — product-first fold */}
      <section className="w-full">
        <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">پیشنهاد</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-2xl">{normalizePersianTypography(settings.dealsTitle || STORE_SETTINGS_DEFAULTS.dealsTitle)}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{normalizePersianTypography(settings.dealsSubtitle || STORE_SETTINGS_DEFAULTS.dealsSubtitle)}</p>
          </div>
          <Link to="/offers" className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[var(--color-cta)]">
            همه پیشنهادها
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.03]" />
            ))
          ) : dealProducts.length > 0 ? (
            dealProducts.map((p) => (
              <ProductCard key={p.id} product={p} variant="compact" />
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-sm font-medium text-slate-500 dark:text-slate-300">
              در حال حاضر تمام شگفت‌انگیزها به پایان رسیده‌اند.
            </div>
          )}
        </div>
      </section>

      {/* 3. Wholesale / B2B Banner Strip — removed (user: «نیازی نداریم»); /contact?type=wholesale still reachable from header nav */}

      {/* 4. Value Propositions Bar */}
      <section className="w-full">
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-6">
          {valueProps.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Category Visual Circles */}
      <section className="w-full">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">دسته‌بندی‌های تخصصی</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">انتخاب تجهیزات بر اساس دسته‌بندی</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Prev/Next Arrow Buttons for Mobile/Tablet Carousel */}
            <div className="flex lg:hidden items-center gap-1.5" role="group" aria-label="کنترل‌های ناوبری دسته‌بندی">
              <button
                type="button"
                onClick={() => scrollCats('prev')}
                disabled={!canScrollPrev}
                aria-label="دسته‌بندی‌های قبلی"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCats('next')}
                disabled={!canScrollNext}
                aria-label="دسته‌بندی‌های بعدی"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <Link to="/products" className="text-xs font-bold text-[var(--color-emphasis-text)] hover:underline flex items-center gap-1 shrink-0 mr-1 sm:mr-2 min-h-[44px]">
              <span className="hidden sm:inline">مشاهده کاتالوگ کامل</span>
              <span className="sm:hidden">همه</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* 1. Desktop View (>= 1024px): Balanced 8-Column Grid — Zero Cutoff, Zero Overlap */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          {categories.slice(0, 8).map((cat, idx) => (
            <div key={`desktop-${cat.slug}-${idx}`} className="w-full">
              {renderCategoryCard(cat, idx)}
            </div>
          ))}
        </div>

        {/* 2. Mobile & Tablet View (< 1024px): Smooth Touch Carousel with Mouse-Drag + Header Nav */}
        <div className="relative lg:hidden">
          {/* Edge fade gradients */}
          {/* Scroll Track: Supports Mouse Click-and-Drag (PC) + Native Touch Momentum Swipe (Mobile) */}
          <div
            dir="rtl"
            ref={catScrollRef}
            onScroll={updateCatScrollBounds}
            onMouseDown={handleCatMouseDown}
            onMouseMove={handleCatMouseMove}
            onMouseUp={handleCatMouseUp}
            onMouseLeave={handleCatMouseUp}
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 scroll-smooth hide-scrollbar select-none cursor-grab active:cursor-grabbing snap-x"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {categories.map((cat, idx) => (
              <div key={`mobile-${cat.slug}-${idx}`} className={`shrink-0 snap-start ${categories.length < 3 ? 'w-full sm:w-64' : 'w-40 sm:w-52'}`}>
                {renderCategoryCard(cat, idx)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Trending Products Tabs Focus on Core Categories */}
      <section className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5">
          <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">کاتالوگ</p>
              <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-2xl">کالاهای برگزیده بازار</h2>
            </div>
            {activeTab === 'all' && (
              <Link to="/products" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-bold text-[var(--color-emphasis-text)]">
                مشاهده همه
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Live category tabs — equality on the catalogue name, not a substring guess */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[{ id: 'all', label: 'همه' }, ...categories.map((cat) => ({ id: cat.title as string, label: cat.title as string }))].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={`inline-flex items-center px-4 sm:px-3.5 min-h-11 sm:min-h-[38px] rounded-full text-xs font-bold transition-all duration-200 border ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-cta)] border-[var(--color-cta)] text-white'
                    : 'border-slate-200 dark:border-slate-700/70 text-[var(--color-text-muted-light)] dark:text-[var(--color-text-muted-dark)] hover:text-[var(--color-text-main-light)] dark:hover:text-[var(--color-text-main-dark)] hover:border-[var(--color-cta)]/40 bg-white dark:bg-white/[0.04]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : loadError ? (
            <div className="col-span-full py-12 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">خطا در بارگذاری محصولات. اتصال اینترنت خود را بررسی کنید.</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="btn-primary bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors"
              >
                تلاش مجدد
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-slate-500 dark:text-slate-300">
              محصولی در این دسته‌بندی موجود نیست.
            </div>
          )}
        </div>
      </section>

      {/* 7. Customer Reviews */}
      <LatestReviews />

      {/* 8. VIP Loyalty Club Banner */}
      <VipClubBanner
        badge={settings.vipBadge || STORE_SETTINGS_DEFAULTS.vipBadge}
        title={settings.vipTitle || STORE_SETTINGS_DEFAULTS.vipTitle}
        subtitle={settings.vipSubtitle || STORE_SETTINGS_DEFAULTS.vipSubtitle}
        couponCode={settings.vipCouponCode || STORE_SETTINGS_DEFAULTS.vipCouponCode}
      />

      {/* 9. FAQ Section */}
      <FAQ />

      {/* 11. Recently Viewed */}
      <RecentlyViewed />
    </div>
  );
}