import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeletons';
import FAQ from '../components/FAQ';
import LatestReviews from '../components/LatestReviews';
import RecentlyViewed from '../components/RecentlyViewed';
import VipClubBanner from '../components/VipClubBanner';
import {
  Sparkles, ArrowLeft, Smartphone, Shield, Zap, Cable, Headphones,
  BatteryCharging, Truck, ShieldCheck, RefreshCw, Headset, Flame, Star,
  Clock, TrendingUp, Award, CheckCircle2, Navigation, Layers, ShieldAlert, PackageCheck, ChevronLeft, ChevronRight,
  Watch, Gamepad2, Radio
} from 'lucide-react';
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

  const heroSlides = useMemo(() => [
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
  ], [settings]);

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

  const getCategoryIcon = (title: string) => {
    if (!title) return Smartphone;
    const t = title.toLowerCase();
    if (t.includes('محافظ کابل') || t.includes('روکش')) return Layers;
    if (t.includes('شارژ') || t.includes('آداپتور')) return Zap;
    if (t.includes('کابل') || t.includes('سیم')) return Cable;
    if (t.includes('گلس') || t.includes('محافظ صفحه')) return Shield;
    if (t.includes('هندزفری') || t.includes('ایرباد') || t.includes('هدفون') || t.includes('هدست')) return Headphones;
    if (t.includes('پاوربانک') || t.includes('باتری')) return BatteryCharging;
    if (t.includes('هولدر') || t.includes('پایه') || t.includes('نگهدارنده')) return Navigation;
    if (t.includes('ساعت')) return Watch;
    if (t.includes('گیم') || t.includes('بازی')) return Gamepad2;
    if (t.includes('دانگل') || t.includes('اتصال') || t.includes('مودم')) return Radio;
    if (t.includes('تبدیل') || t.includes('مبدل')) return RefreshCw;
    if (t.includes('قاب') || t.includes('کاور')) return Smartphone;
    if (t.includes('لوازم جانبی') || t.includes('accessories')) return Sparkles;
    return Smartphone;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      fetch('/api/products').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
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

  const currentSlide = heroSlides[activeSlide];

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
        className="w-full h-full min-h-[128px] sm:min-h-[140px] relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#0e1629] border border-slate-200/90 dark:border-white/[0.08] hover:border-primary-300 dark:hover:border-primary-500/40 hover:shadow-md transition-all duration-200 group text-center shadow-xs select-none min-touch-target"
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:bg-[var(--color-cta)] group-hover:text-white transition-all duration-200 mb-2.5 group-hover:scale-105 shadow-xs shrink-0">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.8]" />
        </div>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--color-emphasis-text)] dark:group-hover:text-[var(--color-emphasis-text)] transition-colors truncate w-full px-1 block">
          {cat.title}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
          {toPersianDigits(cat.count || 0)} کالا
        </span>
      </Link>
    );
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-16 w-full max-w-full overflow-hidden box-border">
      
      {/* 1. Hero Showcase Section */}
      <section className="w-full box-border">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-slate-50 to-rose-50/30 dark:from-[#0e1629] dark:via-[#0c1220] dark:to-[#070b14] border border-slate-200/90 dark:border-white/[0.08] shadow-lg dark:shadow-2xl p-6 sm:p-8 lg:p-10 transition-colors duration-500 min-h-[360px] sm:min-h-[420px] flex flex-col justify-between">
          
          {/* Ambient Dot Grid (dual-theme, non-hardcoded) */}
          <div className="absolute inset-0 bg-[radial-gradient(var(--color-border-light)_1px,transparent_1px)] dark:bg-[radial-gradient(var(--color-border-dark)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-60" />

          {/* Grid: Text Column & Graphic Column */}
          <div key={activeSlide} className="hero-slide-content relative z-10 w-full grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            
            {/* Text & Actions */}
            <div className="md:col-span-7 space-y-4 text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-900/50 text-[var(--color-emphasis-text)] dark:text-primary-300 text-xs font-black shadow-xs">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-[var(--color-emphasis-text)] dark:text-primary-400 shrink-0" />
                <span>{normalizePersianTypography(currentSlide.tag)}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight">
                {normalizePersianTypography(currentSlide.title)}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {normalizePersianTypography(currentSlide.subtitle)}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to={currentSlide.buttonLink}
                  className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] active:bg-[var(--color-cta-active)] text-white font-black px-6 py-3 rounded-2xl text-xs sm:text-sm transition-colors duration-200 shadow-lg shadow-[var(--color-cta)]/30 flex items-center gap-2 group active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]"
                >
                  <span>{normalizePersianTypography(currentSlide.buttonText)}</span>
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                </Link>

                <div className="text-xs font-black px-4 py-2.5 rounded-2xl border bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-white/[0.04] dark:text-slate-300 dark:border-white/[0.08] flex items-center gap-2">
                  <Award className="h-4 w-4 shrink-0 text-[var(--color-emphasis-text)] dark:text-inherit" />
                  <span>{normalizePersianTypography(currentSlide.badge)}</span>
                </div>
              </div>
            </div>

            {/* Visual 3D Asset Showcase Column (Desktop/Tablet) */}
            <div className="hidden md:flex md:col-span-5 items-center justify-center relative">
              <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-3xl p-6 bg-white/90 dark:bg-[#121c33]/80 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md flex items-center justify-center shadow-md dark:shadow-2xl group">
                <PictureImage
                  src={currentSlide.image}
                  alt={normalizePersianTypography(currentSlide.title)}
                  width="320"
                  height="320"
                  priority={true}
                  className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
            </div>
          </div>

          {/* Navigation Arrows for PC Mouse & Mobile Tap */}
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
            aria-label="اسلاید قبلی"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/90 border border-zinc-200/80 dark:border-white/10 text-zinc-800 dark:text-zinc-200 flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-90 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => (prev + 1) % heroSlides.length)}
            aria-label="اسلاید بعدی"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/90 border border-zinc-200/80 dark:border-white/10 text-zinc-800 dark:text-zinc-200 flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Slide Indicator Dots (Centered — theme-aware contrast) */}
          <div className="relative z-10 flex items-center justify-center gap-2 mt-6 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80" role="tablist" aria-label="اسلایدهای صفحه اصلی">
            {heroSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                role="tab"
                aria-selected={activeSlide === idx}
                aria-label={`اسلاید ${toPersianDigits(idx + 1)}`}
                className={`h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none cursor-pointer ${
                  activeSlide === idx
                    ? 'w-8 bg-primary-600 dark:bg-primary-400 shadow-md shadow-primary-500/50'
                    : 'w-2.5 bg-zinc-400 dark:bg-zinc-600 hover:bg-zinc-500 dark:hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Wholesale / B2B Banner Strip */}
      <section className="w-full">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1629] border border-slate-200/90 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 text-right">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-900/50 flex items-center justify-center text-[var(--color-emphasis-text)] shrink-0">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{normalizePersianTypography(settings.b2bTitle || STORE_SETTINGS_DEFAULTS.b2bTitle)}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{normalizePersianTypography(settings.b2bDesc || STORE_SETTINGS_DEFAULTS.b2bDesc)}</p>
            </div>
          </div>
          <Link
            to={settings.b2bLink || STORE_SETTINGS_DEFAULTS.b2bLink}
            className="px-4 py-2 rounded-xl bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white font-black text-xs transition-all shadow-sm shadow-[var(--color-cta)]/25 shrink-0 cursor-pointer"
          >
            {normalizePersianTypography(settings.b2bButtonText || STORE_SETTINGS_DEFAULTS.b2bButtonText)}
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
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-[#0e1629] border border-slate-200/80 dark:border-white/[0.07] shadow-xs hover:border-slate-300 dark:hover:border-white/[0.15] transition-all"
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

      {/* 4. Amazing Deals Section */}
      <section className="w-full">
        <div className="bg-gradient-to-br from-rose-50/40 via-white to-slate-50 dark:from-[#0e1629] dark:via-[#0c1220] dark:to-[#070b14] rounded-3xl p-5 sm:p-8 text-slate-900 dark:text-white border border-rose-200/70 dark:border-white/[0.08] shadow-lg dark:shadow-2xl relative overflow-hidden transition-colors">
          
          {/* Section Header */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-rose-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-900/50 flex items-center justify-center text-[var(--color-emphasis-text)]">
                <Flame className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">{normalizePersianTypography(settings.dealsTitle || STORE_SETTINGS_DEFAULTS.dealsTitle)}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{normalizePersianTypography(settings.dealsSubtitle || STORE_SETTINGS_DEFAULTS.dealsSubtitle)}</p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="bg-white/80 dark:bg-[#121c33] border border-slate-200/80 dark:border-white/[0.08] px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-xs">
              <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-emphasis-text)] shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">فرصت باقی‌مانده:</span>
              <div className="flex items-center gap-1 text-sm font-black text-[var(--color-emphasis-text)]">
                <span className="tabular-nums bg-slate-50 dark:bg-black/40 px-1.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] text-[var(--color-cta)] dark:text-[var(--color-emphasis-text)]">{toPersianDigits(timeLeft.hours.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="tabular-nums bg-slate-50 dark:bg-black/40 px-1.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] text-[var(--color-cta)] dark:text-[var(--color-emphasis-text)]">{toPersianDigits(timeLeft.minutes.toString().padStart(2, '0'))}</span>
                <span>:</span>
                <span className="tabular-nums bg-slate-50 dark:bg-black/40 px-1.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] text-[var(--color-cta)] dark:text-[var(--color-emphasis-text)]">{toPersianDigits(timeLeft.seconds.toString().padStart(2, '0'))}</span>
              </div>
              </div>
              {/* Thin seconds bar */}
              <div
                role="progressbar"
                aria-label="ثانیه‌های باقی‌مانده"
                aria-valuenow={59 - timeLeft.seconds}
                aria-valuemin={0}
                aria-valuemax={59}
                className="mt-1.5 h-1 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden"
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
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="bg-white hover:bg-white dark:bg-[#121c33] dark:hover:bg-[#162340] border border-slate-200/80 hover:border-primary-300 dark:border-white/[0.07] dark:hover:border-primary-500/40 rounded-2xl p-3.5 text-slate-900 dark:text-white flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md group"
                >
                  <div className="relative aspect-square rounded-xl bg-slate-50 dark:bg-white/[0.02] p-3 mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/[0.05]">
                    <PictureImage 
                      src={p.image} 
                      alt={p.title} 
                      width="160"
                      height="160"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.06)] dark:drop-shadow-none" 
                    />
                    <span className="absolute top-2 right-2 bg-primary-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs">
                      {toPersianDigits(p.discount || 0)}٪
                    </span>
                  </div>

                  <h3 className="text-xs font-bold line-clamp-2 leading-relaxed min-h-[36px] text-zinc-800 dark:text-zinc-100 group-hover:text-[var(--color-emphasis-text)] dark:group-hover:text-[var(--color-emphasis-text)] transition-colors">
                    {p.title}
                  </h3>

                  <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-700/50 flex flex-col items-end">
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-[10px] text-zinc-400 line-through">
                        {formatPrice(p.originalPrice)}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-black text-[var(--color-emphasis-text)]">
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
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">دسته‌بندی‌های تخصصی</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">انتخاب تجهیزات بر اساس دسته‌بندی</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Prev/Next Arrow Buttons for Mobile/Tablet Carousel */}
            <div className="flex lg:hidden items-center gap-1.5" role="group" aria-label="کنترل‌های ناوبری دسته‌بندی">
              <button
                type="button"
                onClick={() => scrollCats('prev')}
                disabled={!canScrollPrev}
                aria-label="دسته‌بندی‌های قبلی"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface-light)] dark:bg-[#0d121c] text-zinc-700 dark:text-zinc-200 hover:text-[var(--color-emphasis-text)] hover:border-[var(--color-cta)]/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCats('next')}
                disabled={!canScrollNext}
                aria-label="دسته‌بندی‌های بعدی"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface-light)] dark:bg-[#0d121c] text-zinc-700 dark:text-zinc-200 hover:text-[var(--color-emphasis-text)] hover:border-[var(--color-cta)]/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <Link to="/products" className="text-xs font-black text-[var(--color-emphasis-text)] hover:underline flex items-center gap-1 shrink-0 mr-1 sm:mr-2">
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
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth hide-scrollbar select-none cursor-grab active:cursor-grabbing snap-x"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {categories.map((cat, idx) => (
              <div key={`mobile-${cat.slug}-${idx}`} className="shrink-0 w-28 sm:w-36 snap-start">
                {renderCategoryCard(cat, idx)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Trending Products Tabs Focus on Core Categories */}
      <section className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--color-emphasis-text)]" />
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">کالاهای برگزیده بازار</h2>
          </div>

          {/* Core Category Tabs */}
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
                className={`shrink-0 snap-start px-3.5 py-1.5 rounded-xl text-xs font-black transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[var(--color-cta)] text-[var(--color-cta)]'
                    : 'text-[var(--color-text-muted-light)] dark:text-[var(--color-text-muted-dark)] hover:text-[var(--color-text-main-light)] dark:hover:text-[var(--color-text-main-dark)]'
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
          ) : loadError ? (
            <div className="col-span-full py-12 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">خطا در بارگذاری محصولات. اتصال اینترنت خود را بررسی کنید.</p>
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
            <div className="col-span-full py-12 text-center text-sm text-zinc-400">
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
