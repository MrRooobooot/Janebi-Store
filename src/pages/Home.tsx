import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeletons';
import FAQ from '../components/FAQ';
import LatestReviews from '../components/LatestReviews';
import RecentlyViewed from '../components/RecentlyViewed';
import VipClubBanner from '../components/VipClubBanner';
import HeroSlideContent from '../components/home/HeroSlideContent';
import {
  Sparkles, ArrowLeft, Smartphone, Truck, ShieldCheck, Headset, Flame, Star,
  Clock, TrendingUp, Award, CheckCircle2, ShieldAlert, PackageCheck, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getJson } from '../lib/jsonFetch';
import { getCategoryIcon } from '../lib/categoryIcons';
import { Product } from '../types';
import { toPersianDigits, formatPrice, getAssetUrl, normalizePersianTypography } from '../lib/utils';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { STORE_SETTINGS_DEFAULTS } from '../lib/constants';
import PictureImage from '../components/PictureImage';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'holders' | 'cables' | 'cases' | 'protectors'>('all');
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

  // Live countdown to midnight (daily deals cycle) — computed from real clock
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
      setTimeLeft({
        hours: Math.floor(diff / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const heroSlides = useMemo(() => {
    const allSlides = [
    {
      id: 1,
      tag: settings.heroSlide1Tag || STORE_SETTINGS_DEFAULTS.heroSlide1Tag,
      title: settings.heroSlide1Title || STORE_SETTINGS_DEFAULTS.heroSlide1Title,
      subtitle: settings.heroSlide1Subtitle || STORE_SETTINGS_DEFAULTS.heroSlide1Subtitle,
      buttonText: settings.heroSlide1ButtonText || STORE_SETTINGS_DEFAULTS.heroSlide1ButtonText,
      buttonLink: settings.heroSlide1Link || STORE_SETTINGS_DEFAULTS.heroSlide1Link,
      badge: settings.heroSlide1Badge || STORE_SETTINGS_DEFAULTS.heroSlide1Badge,
      image: settings.heroSlide1Image || '/products/hld-13.svg',
      borderColor: 'border-[var(--color-cta)]/40 dark:border-[var(--color-cta)]/30',
    },
    {
      id: 2,
      tag: settings.heroSlide2Tag || STORE_SETTINGS_DEFAULTS.heroSlide2Tag,
      title: settings.heroSlide2Title || STORE_SETTINGS_DEFAULTS.heroSlide2Title,
      subtitle: settings.heroSlide2Subtitle || STORE_SETTINGS_DEFAULTS.heroSlide2Subtitle,
      buttonText: settings.heroSlide2ButtonText || STORE_SETTINGS_DEFAULTS.heroSlide2ButtonText,
      buttonLink: settings.heroSlide2Link || STORE_SETTINGS_DEFAULTS.heroSlide2Link,
      badge: settings.heroSlide2Badge || STORE_SETTINGS_DEFAULTS.heroSlide2Badge,
      image: settings.heroSlide2Image || '/products/cas-4.svg',
      borderColor: 'border-blue-500/40 dark:border-blue-500/30',
    },
    {
      id: 3,
      tag: settings.heroSlide3Tag || STORE_SETTINGS_DEFAULTS.heroSlide3Tag,
      title: settings.heroSlide3Title || STORE_SETTINGS_DEFAULTS.heroSlide3Title,
      subtitle: settings.heroSlide3Subtitle || STORE_SETTINGS_DEFAULTS.heroSlide3Subtitle,
      buttonText: settings.heroSlide3ButtonText || STORE_SETTINGS_DEFAULTS.heroSlide3ButtonText,
      buttonLink: settings.heroSlide3Link || STORE_SETTINGS_DEFAULTS.heroSlide3Link,
      badge: settings.heroSlide3Badge || STORE_SETTINGS_DEFAULTS.heroSlide3Badge,
      image: settings.heroSlide3Image || '/products/cbl-1.svg',
      borderColor: 'border-purple-500/40 dark:border-purple-500/30',
    },
    ];
    // Never advertise a category the store has no stock in: slides whose CTA targets an
    // empty category are dropped (falling back to the first slide if all are unavailable).
    const liveCategories = new Set(categories.map((c) => c.title));
    const available = allSlides.filter((s) => {
      const m = String(s.buttonLink).match(/[?&]category=([^&]+)/);
      return !m || liveCategories.has(decodeURIComponent(m[1]));
    });
    return available.length ? available : [allSlides[0]];
  }, [settings, categories]);

  useEffect(() => {
    if (activeSlide >= heroSlides.length) setActiveSlide(0);
  }, [heroSlides.length, activeSlide]);

  // Real catalogue cards shown inside the hero (never placeholder/demo art).
  // Slide-scoped: a slide advertising category X must not display cards of a
  // different category (holders slide was showing cable cards) — match the
  // CTA's ?category= param against the product's category; fall back to
  // in-stock first-3 only when the slide has no category link.
  const heroProductsBySlide = useMemo(() => {
    const inStock = products.filter((p) => (p.stockQuantity ?? 1) > 0);
    const matchFor = (link: string) => {
      const m = String(link).match(/[?&]category=([^&]+)/);
      if (!m) return inStock.slice(0, 3);
      const cat = decodeURIComponent(m[1]);
      const scoped = inStock.filter((p) => p.category === cat);
      return (scoped.length ? scoped : inStock).slice(0, 3);
    };
    return new Map(heroSlides.map((s) => [s.id, matchFor(s.buttonLink)]));
  }, [products, heroSlides]);

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

  const currentSlide = heroSlides[activeSlide];
  const heroProducts = heroProductsBySlide.get(currentSlide?.id) ?? [];

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
    const discounted = products
      .filter((p) => (p.discount || 0) > 0 && (p.stockQuantity || 0) > 0)
      .sort((a, b) => (b.discount || 0) - (a.discount || 0));
    if (discounted.length > 0) return discounted.slice(0, 5);
    // Fallback to top in-stock products with special discount
    return products
      .filter((p) => (p.stockQuantity || 0) > 0)
      .slice(0, 5)
      .map((p, idx) => ({ ...p, discount: p.discount || (15 - idx * 2) }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeTab === 'holders') return products.filter((p) => p.category?.includes('هولدر') || p.category?.includes('پایه') || p.category?.includes('نگهدارنده'));
    if (activeTab === 'cables') return products.filter((p) => p.category?.includes('کابل') || p.category?.includes('شارژر') || p.category?.includes('سیم') || p.category?.includes('آداپتور'));
    if (activeTab === 'cases') return products.filter((p) => p.category?.includes('قاب') || p.category?.includes('کاور'));
    if (activeTab === 'protectors') return products.filter((p) => p.category?.includes('گلس') || p.category?.includes('محافظ'));
    return products.slice(0, 8);
  }, [products, activeTab]);

  const valueProps = useMemo(() => [
    {
      title: settings.valueProp1Title || STORE_SETTINGS_DEFAULTS.valueProp1Title,
      desc: settings.valueProp1Desc || STORE_SETTINGS_DEFAULTS.valueProp1Desc,
      icon: PackageCheck,
      color: 'text-blue-600 bg-blue-50 border-blue-200/80 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-900/40',
    },
    {
      title: settings.valueProp2Title || STORE_SETTINGS_DEFAULTS.valueProp2Title,
      desc: settings.valueProp2Desc || STORE_SETTINGS_DEFAULTS.valueProp2Desc,
      icon: Truck,
      color: 'text-[var(--color-cta)] bg-primary-50 border-primary-200/80 dark:text-primary-400 dark:bg-primary-950/40 dark:border-primary-900/40',
    },
    {
      title: settings.valueProp3Title || STORE_SETTINGS_DEFAULTS.valueProp3Title,
      desc: settings.valueProp3Desc || STORE_SETTINGS_DEFAULTS.valueProp3Desc,
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/40',
    },
    {
      title: settings.valueProp4Title || STORE_SETTINGS_DEFAULTS.valueProp4Title,
      desc: settings.valueProp4Desc || STORE_SETTINGS_DEFAULTS.valueProp4Desc,
      icon: Headset,
      color: 'text-amber-600 bg-amber-50 border-amber-200/80 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/40',
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
        className="w-full h-full min-h-[140px] sm:min-h-[148px] relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-[var(--color-surface-dark)] border border-slate-200/90 dark:border-white/[0.08] hover:border-primary-300 dark:hover:border-primary-500/40 hover:shadow-md transition-all duration-200 group text-center shadow-xs select-none min-touch-target"
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:bg-[var(--color-cta)] group-hover:text-white transition-all duration-200 mb-2.5 group-hover:scale-105 shadow-xs shrink-0">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.8]" />
        </div>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--color-emphasis-text)] dark:group-hover:text-[var(--color-emphasis-text)] transition-colors w-full px-1 block leading-tight line-clamp-2">
          {cat.title}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
          {toPersianDigits(cat.count || 0)} کالا
        </span>
      </Link>
    );
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-24 lg:pb-16 w-full max-w-full overflow-hidden box-border">
      
      {/* 1. Hero Showcase Section */}
      <section className="w-full box-border">
        {/* Single page h1 — lives OUTSIDE the carousel: one h1 on every breakpoint,
            rotation-safe (slide titles are plain <p>), SEO + a11y clean. */}
        <h1 className="sr-only">فروشگاه لوازم جانبی موبایل و تبلت | جانبی آرنا</h1>
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-slate-50 to-rose-50/30 dark:from-[var(--color-surface-dark)] dark:via-[var(--color-surface-header-dark)] dark:to-[var(--color-surface-footer-dark)] border border-slate-200/90 dark:border-white/[0.08] shadow-lg dark:shadow-2xl p-3 sm:p-7 lg:p-6 transition-colors duration-500 min-h-0 sm:min-h-[400px] lg:min-h-[340px] flex flex-col justify-between">
          {/* Ambient Dot Grid (dual-theme, non-hardcoded) */}
          <div className="absolute inset-0 bg-[radial-gradient(var(--color-border-light)_1px,transparent_1px)] dark:bg-[radial-gradient(var(--color-border-dark)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-60" />

          {/* Slides stacked in one grid cell → container height = tallest slide; no CLS on slide change (user: «سایز باکس عوض میشه») */}
          <div className="hidden sm:grid grid-cols-1">
            {heroSlides.map((slide, idx) => (
              <div
                key={slide.id}
                aria-hidden={idx !== activeSlide}
                className="hero-slide-content relative z-10 w-full col-start-1 row-start-1 transition-opacity duration-300 motion-reduce:transition-none motion-reduce:duration-0"
                style={{ opacity: idx === activeSlide ? 1 : 0, pointerEvents: idx === activeSlide ? 'auto' : 'none', visibility: idx === activeSlide ? 'visible' : 'hidden' }}
              >
                <HeroSlideContent slide={slide} products={heroProducts} />
              </div>
            ))}
          </div>
          {/* Mobile: single slide render (stacked hidden slides would break 390px flow height) */}
          <div
            className="sm:hidden touch-pan-y"
            onTouchStart={(e) => { mobileTouchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - mobileTouchX.current;
              if (Math.abs(dx) > 48) {
                setActiveSlide((prev) => dx < 0 ? (prev + 1) % heroSlides.length : (prev === 0 ? heroSlides.length - 1 : prev - 1));
              }
            }}
          >
            {/* Mobile rail: the desktop rail owns the single h1 (same currentSlide text);
                this copy renders as <p>. */}
            <HeroSlideContent slide={currentSlide} products={heroProducts} />
            {/* Mobile slide indicators — tap targets + swipe affordance (user: «امکان عوض کردن باشه») */}
            {heroSlides.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4" role="tablist" aria-label="اسلایدهای صفحه اصلی">
              {heroSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setActiveSlide(idx)}
                  role="tab"
                  aria-selected={activeSlide === idx}
                  aria-label={`اسلاید ${toPersianDigits(idx + 1)}`}
                  className="h-6 min-w-6 px-1 flex items-center justify-center cursor-pointer"
                >
                  <span className={`block h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${activeSlide === idx ? 'w-6 bg-primary-600 dark:bg-primary-400 shadow-sm shadow-primary-500/40' : 'w-2 bg-slate-300 dark:bg-slate-600'}`} />
                </button>
              ))}
            </div>
            )}
          </div>
          {/* Navigation Arrows for PC Mouse & Mobile Tap — hidden when a single available slide exists */}
          {heroSlides.length > 1 && (<>
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
            aria-label="اسلاید قبلی"
            className="hidden sm:flex absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/90 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-90 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => (prev + 1) % heroSlides.length)}
            aria-label="اسلاید بعدی"
            className="hidden sm:flex absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/90 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          </>)}

          {/* Slide indicators — phones auto-rotate every 6s and swipe, the dots row is sm+ only
              (on a 390px card the dots collided with the CTA/text edges) */}
          {heroSlides.length > 1 && (
          <div className="hidden sm:flex items-center justify-center gap-2 relative z-10 mt-6 pt-3 border-t border-slate-200/80 dark:border-slate-800/80" role="tablist" aria-label="اسلایدهای صفحه اصلی">
            {heroSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                role="tab"
                aria-selected={activeSlide === idx}
                aria-label={`اسلاید ${toPersianDigits(idx + 1)}`}
                className="h-6 min-w-6 px-1 flex items-center justify-center cursor-pointer"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                    activeSlide === idx
                      ? 'w-8 bg-primary-600 dark:bg-primary-400 shadow-md shadow-primary-500/50'
                      : 'w-2.5 bg-slate-400 dark:bg-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* 2. Amazing Deals Section — product-first fold */}
      <section className="w-full">
        <div className="bg-gradient-to-br from-rose-50/40 via-white to-slate-50 dark:from-[var(--color-surface-dark)] dark:via-[var(--color-surface-header-dark)] dark:to-[var(--color-surface-footer-dark)] rounded-3xl p-2.5 sm:p-8 text-slate-900 dark:text-white border border-rose-200/70 dark:border-white/[0.08] shadow-lg dark:shadow-2xl relative overflow-hidden transition-colors">
          
          {/* Section Header */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-6 pb-2 sm:pb-4 border-b border-rose-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-900/50 flex items-center justify-center text-[var(--color-emphasis-text)] shrink-0">
                <Flame className="h-5 w-5 animate-bounce" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">{normalizePersianTypography(settings.dealsTitle || STORE_SETTINGS_DEFAULTS.dealsTitle)}</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{normalizePersianTypography(settings.dealsSubtitle || STORE_SETTINGS_DEFAULTS.dealsSubtitle)}</p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="self-start sm:self-auto sm:bg-white/80 sm:dark:bg-[var(--color-surface-elevated-dark)] sm:border sm:border-slate-200/80 sm:dark:border-white/[0.08] sm:px-3.5 sm:py-1.5 sm:rounded-2xl text-xs font-bold sm:shadow-xs shrink-0">
              <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-emphasis-text)] shrink-0" />
              <span className="hidden sm:inline text-slate-700 dark:text-slate-300">فرصت باقی‌مانده:</span>
              <div dir="ltr" className="flex items-center gap-1 text-sm font-black text-[var(--color-emphasis-text)]">
                <span className="tabular-nums bg-slate-50 dark:bg-black/40 px-1 sm:px-1.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] text-[var(--color-cta)] dark:text-[var(--color-emphasis-text)]">{toPersianDigits(timeLeft.hours.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="tabular-nums bg-slate-50 dark:bg-black/40 px-1 sm:px-1.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] text-[var(--color-cta)] dark:text-[var(--color-emphasis-text)]">{toPersianDigits(timeLeft.minutes.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="tabular-nums bg-slate-50 dark:bg-black/40 px-1 sm:px-1.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] text-[var(--color-cta)] dark:text-[var(--color-emphasis-text)]">{toPersianDigits(timeLeft.seconds.toString().padStart(2, '0'))}</span>
              </div>
              </div>
              {/* Thin seconds bar */}
              <div
                role="progressbar"
                aria-label="ثانیه‌های باقی‌مانده"
                aria-valuenow={59 - timeLeft.seconds}
                aria-valuemin={0}
                aria-valuemax={59}
                className="hidden sm:block mt-1.5 h-1 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden"
              >
                <div className="h-1 bg-[var(--color-cta)]/50 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${((59 - timeLeft.seconds) / 59) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Deal Cards */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-64 bg-slate-100 dark:bg-white/[0.03] rounded-2xl animate-pulse" />
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
        </div>
      </section>

      {/* 3. Wholesale / B2B Banner Strip — removed (user: «نیازی نداریم»); /contact?type=wholesale still reachable from header nav */}

      {/* 4. Value Propositions Bar */}
      <section className="w-full">
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {valueProps.map((item, i) => {
            const Icon = item.icon;
            return (
              <div 
                key={i} 
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-[var(--color-surface-dark)] border border-slate-200/80 dark:border-white/[0.07] shadow-xs hover:border-slate-300 dark:hover:border-white/[0.15] transition-all"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${item.color}`}>
                  <Icon className="h-6 w-6 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
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
                className="min-touch-target w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-slate-700 dark:text-slate-200 hover:text-[var(--color-emphasis-text)] hover:border-[var(--color-cta)]/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCats('next')}
                disabled={!canScrollNext}
                aria-label="دسته‌بندی‌های بعدی"
                className="min-touch-target w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-slate-700 dark:text-slate-200 hover:text-[var(--color-emphasis-text)] hover:border-[var(--color-cta)]/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <Link to="/products" className="text-xs font-black text-[var(--color-emphasis-text)] hover:underline flex items-center gap-1 shrink-0 mr-1 sm:mr-2 min-h-[44px]">
              <span className="hidden sm:inline">مشاهده کاتالوگ کامل</span>
              <span className="sm:hidden">همه</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* 1. Desktop View (>= 1024px): Balanced 8-Column Grid — Zero Cutoff, Zero Overlap */}
        <div className="hidden lg:grid lg:grid-cols-8 gap-3 sm:gap-4">
          {categories.slice(0, 8).map((cat, idx) => (
            <div key={`desktop-${cat.slug}-${idx}`} className="w-full">
              {renderCategoryCard(cat, idx)}
            </div>
          ))}
        </div>

        {/* 2. Mobile & Tablet View (< 1024px): Smooth Touch Carousel with Mouse-Drag + Header Nav */}
        <div className="relative lg:hidden">
          {/* Edge fade gradients */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 z-10 bg-gradient-to-r from-white via-white/70 to-transparent dark:from-[var(--color-canvas-dark)] dark:via-[var(--color-canvas-dark)]/70 transition-opacity duration-300 ${
              canScrollNext ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-white via-white/70 to-transparent dark:from-[var(--color-canvas-dark)] dark:via-[var(--color-canvas-dark)]/70 transition-opacity duration-300 ${
              canScrollPrev ? 'opacity-100' : 'opacity-0'
            }`}
          />

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
              <div key={`mobile-${cat.slug}-${idx}`} className={`shrink-0 snap-start ${categories.length < 3 ? 'w-full sm:w-64' : 'w-28 sm:w-36'}`}>
                {renderCategoryCard(cat, idx)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Trending Products Tabs Focus on Core Categories */}
      <section className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-900/50">
              <TrendingUp className="h-4 w-4 text-[var(--color-emphasis-text)]" />
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white whitespace-nowrap">کالاهای برگزیده بازار</h2>
          </div>

          {/* Core Category Tabs — pill chips (modern segmented style, no dated underline scoop) */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar scroll-smooth snap-x pb-1 sm:pb-0">
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
                aria-pressed={activeTab === tab.id}
                className={`shrink-0 snap-start inline-flex items-center px-4 sm:px-3.5 min-h-11 sm:min-h-[38px] rounded-full text-[13px] sm:text-xs font-black transition-all duration-200 border ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-cta)] border-[var(--color-cta)] text-white shadow-xs shadow-[var(--color-cta)]/30'
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
                className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white text-xs font-black px-6 py-2.5 rounded-xl transition-colors"
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