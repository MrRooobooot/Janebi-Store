import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeletons';
import FAQ from '../components/FAQ';
import LatestReviews from '../components/LatestReviews';
import RecentlyViewed from '../components/RecentlyViewed';
import VipClubBanner from '../components/VipClubBanner';
import {
  ArrowLeft, Truck, ShieldCheck, Headset,
  PackageCheck, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getJson } from '../lib/jsonFetch';
import { getCategoryIcon, getCategoryWell } from '../lib/categoryIcons';
import { pickHomeProducts, pickHeroAds } from '../lib/homeCatalogue';
import { Product } from '../types';
import { toPersianDigits, normalizePersianTypography, formatPrice } from '../lib/utils';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { STORE_SETTINGS_DEFAULTS } from '../lib/constants';

function SectionHeading({ eyebrow, title, subtitle, to, linkLabel = 'مشاهده همه' }: {
  eyebrow?: string; title: string; subtitle?: string; to?: string; linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 flex items-center gap-2 text-xs font-bold text-[var(--color-emphasis-text)]">
            <span className="h-1 w-5 rounded-full bg-[var(--color-cta)]" aria-hidden="true" />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-black leading-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
      </div>
      {to ? (
        <Link
          to={to}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 transition-colors hover:border-[var(--color-cta)]/50 hover:text-[var(--color-emphasis-text)] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
        >
          {linkLabel}
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [activeSlide, setActiveSlide] = useState(0);
  const mobileTouchX = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const settings = useStoreSettings();

  // The hero is built only from live catalogue products (photo, name, price from the
  // API); there is no hard-coded slide copy, so there is nothing to keep in sync.
  const heroSlides = useMemo(
    () =>
      pickHeroAds(products).map((p) => ({
        id: `ad-${p.id}`,
        kicker: p.brand || p.category,
        title: normalizePersianTypography(p.title),
        action: 'مشاهده محصول',
        image: p.image,
        to: `/products/${p.id}`,
        ad: { brand: p.brand, price: p.price, originalPrice: p.originalPrice, discount: p.discount },
      })),
    [products],
  );

  useEffect(() => {
    if (activeSlide >= heroSlides.length) setActiveSlide(0);
  }, [heroSlides.length, activeSlide]);


  // Auto slide — paused entirely when the user prefers reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (heroSlides.length < 2) return;
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
      .filter((p) => /\.(webp|png|jpe?g)(\?|$)/i.test(p.image || ''))
      .sort((a, b) => (b.discount || 0) - (a.discount || 0))
      .slice(0, 4);
  }, [products]);

  const filteredProducts = useMemo(
    () => pickHomeProducts(products, activeTab),
    [products, activeTab],
  );
  const latestProducts = useMemo(() => {
    const shown = new Set(filteredProducts.map((p) => p.id));
    return [...products]
      .filter((p) => (p.stockQuantity || 0) > 0 && !shown.has(p.id))
      .filter((p) => /\.(webp|png|jpe?g)(\?|$)/i.test(p.image || ''))
      .sort((a, b) => b.id - a.id)
      .slice(0, 8);
  }, [products, filteredProducts]);
  // One real photo per category, taken from its newest in-stock product — no stock imagery.
  const categoryCovers = useMemo(() => {
    const covers = new Map<string, string>();
    [...products]
      .filter((p) => (p.stockQuantity || 0) > 0 && /\.(webp|png|jpe?g)(\?|$)/i.test(p.image || ''))
      .sort((a, b) => b.id - a.id)
      .forEach((p) => { if (p.category && !covers.has(p.category)) covers.set(p.category, p.image); });
    return covers;
  }, [products]);
  const catalogueHref = activeTab === 'all'
    ? '/products'
    : `/products?category=${encodeURIComponent(activeTab)}`;

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

  return (
    <div className="page-stack pb-24 lg:pb-16 w-full max-w-full overflow-hidden box-border">
      
      {/* 1. Hero Showcase Section */}
      <section className="w-full box-border">
        {/* Single page h1 — lives OUTSIDE the carousel: one h1 on every breakpoint,
            rotation-safe (slide titles are plain <p>), SEO + a11y clean. */}
        <h1 className="sr-only">فروشگاه لوازم جانبی موبایل و تبلت | جانبی آرنا</h1>
        {heroSlides.length > 0 && (
        <div
          className="relative aspect-[3/2] overflow-hidden rounded-3xl sm:aspect-[2/1] shadow-lg touch-pan-y"
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
                <span className="absolute inset-0 flex items-stretch gap-3 overflow-hidden bg-gradient-to-bl from-rose-100 via-white to-slate-100 p-3 dark:from-[#2a1424] dark:via-[#0e1629] dark:to-[#0b1222] sm:gap-10 sm:p-8">
                  <span aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[var(--color-cta)]/20 blur-3xl" />
                  <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
                  <span className="relative z-10 flex w-[52%] flex-col justify-center gap-1.5 pb-10 pr-1 sm:gap-4 sm:pb-14 sm:pr-4">
                    <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[var(--color-emphasis-text)] shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10 sm:text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-cta)]" aria-hidden="true" />
                      {slide.kicker}
                    </span>
                    <span className="line-clamp-2 text-[15px] font-black leading-snug text-slate-900 dark:text-white sm:text-4xl sm:leading-[1.3]">{slide.title}</span>
                    <span className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-white">
                      <span className="text-lg font-black sm:text-3xl">{formatPrice(slide.ad.price)}</span>
                      {slide.ad.discount ? (
                        <span className="rounded-lg bg-[var(--color-cta)] px-2 py-0.5 text-xs font-black text-white sm:text-sm">{toPersianDigits(slide.ad.discount)}٪ تخفیف</span>
                      ) : null}
                    </span>
                    <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-900 sm:px-6 sm:py-3 sm:text-sm">
                      {slide.action}
                      <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                  </span>
                  <span className="relative flex flex-1 items-center justify-center pb-8 sm:pb-12">
                    <span className="absolute inset-[8%] rounded-[2rem] bg-white/60 blur-2xl dark:bg-white/5" aria-hidden="true" />
                    <span className="relative flex aspect-square h-full max-h-full -rotate-2 items-center justify-center overflow-hidden rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-black/5 dark:bg-[#dfe3ea]">
                      <img src={slide.image} alt="" loading={idx === 0 ? 'eager' : 'lazy'} className="h-full w-full object-contain p-3 dark:mix-blend-multiply" />
                    </span>
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
                    <span className={`block h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${activeSlide === idx ? 'w-7 bg-slate-900 dark:bg-white' : 'w-2 bg-slate-900/35 dark:bg-white/40'}`} />
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
        )}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {valueProps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[var(--color-surface-dark)] sm:p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-cta)]/10 sm:h-10 sm:w-10 text-[var(--color-emphasis-text)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-black leading-snug text-slate-900 dark:text-white">{item.title}</span>
                  <span className="mt-0.5 hidden text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:block">{item.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="w-full">
        <SectionHeading eyebrow="دسته‌بندی" title="دسته‌بندی‌های تخصصی" to="/products" linkLabel="کاتالوگ" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const cover = categoryCovers.get(cat.title);
            return (
              <Link
                key={cat.slug || cat.title}
                to={`/products?category=${encodeURIComponent(cat.title)}`}
                className="group relative flex min-h-[150px] flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-100 p-4 transition-shadow hover:shadow-xl dark:border-white/[0.08] dark:from-[#101a2e] dark:to-[#0b1222] sm:min-h-[220px] sm:p-6"
              >
                {cover ? (
                  <span className="absolute -left-3 -top-3 flex h-24 w-24 rotate-6 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105 motion-reduce:transition-none dark:bg-[#dfe3ea] sm:h-32 sm:w-32">
                    <img src={cover} alt="" loading="lazy" className="h-full w-full object-contain p-2 dark:mix-blend-multiply" />
                  </span>
                ) : null}
                <span className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${getCategoryWell(cat.title)}`}>
                  <Icon className="h-6 w-6 stroke-[1.75]" aria-hidden />
                </span>
                <span className="relative">
                  <span className="block text-base font-black leading-snug text-slate-900 transition-colors group-hover:text-[var(--color-emphasis-text)] dark:text-white sm:text-xl">{cat.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{toPersianDigits(cat.count || 0)} کالا</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 6. Trending Products Tabs Focus on Core Categories */}
      <section className="w-full">
        <SectionHeading eyebrow="منتخب" title="کالاهای برگزیده بازار" to={catalogueHref} />
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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

      {(loading || dealProducts.length > 0) && (
      <section className="w-full rounded-3xl bg-gradient-to-bl from-rose-50 via-white to-white p-3 ring-1 ring-rose-100 dark:from-[#2a1424]/70 dark:via-[#0e1629] dark:to-[#0b1222] dark:ring-white/[0.06] sm:p-6">
        <SectionHeading
          eyebrow="پیشنهاد"
          title={normalizePersianTypography(settings.dealsTitle || STORE_SETTINGS_DEFAULTS.dealsTitle)}
          subtitle={normalizePersianTypography(settings.dealsSubtitle || STORE_SETTINGS_DEFAULTS.dealsSubtitle)}
          to="/offers"
          linkLabel="همه پیشنهادها"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.03]" />
            ))
          ) : (
            dealProducts.map((p) => (
              <ProductCard key={p.id} product={p} variant="compact" />
            ))
          )}
        </div>
      </section>
      )}

      {!loading && dealProducts.length === 0 && latestProducts.length > 0 && (
      <section className="w-full">
        <SectionHeading eyebrow="تازه رسیده" title="جدیدترین‌ها" to="/products" />
        <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
          {latestProducts.map((p) => (
            <div key={p.id} className="w-40 shrink-0 snap-start sm:w-52">
              <ProductCard product={p} variant="compact" />
            </div>
          ))}
        </div>
      </section>
      )}

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