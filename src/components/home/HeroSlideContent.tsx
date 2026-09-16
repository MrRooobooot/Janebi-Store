// Single hero slide: text column + visual column.
// Extracted so Home can stack all slides in one grid cell (stable container height — no CLS on slide change).
// The visual column shows REAL catalogue cards (photo/title/price from the live API) so the hero
// never advertises products the store does not have; it falls back to a static asset tile only
// when the catalogue is empty (e.g. API offline).
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Award, Package } from 'lucide-react';
import PictureImage from '../PictureImage';
import { normalizePersianTypography, formatPrice, toPersianDigits } from '../../lib/utils';
import type { Product } from '../../types';

interface HeroSlide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  badge: string;
  image: string;
}

type HeroProduct = Pick<Product, 'id' | 'title' | 'price' | 'image' | 'brand'>;

export default function HeroSlideContent({ slide, products = [] }: { slide: HeroSlide; products?: HeroProduct[] }) {
  const cards = products.slice(0, 3);

  return (
    <div className="relative z-10 w-full flex items-center gap-3 sm:gap-6 md:grid md:grid-cols-12 md:gap-8">
      {/* Text & Actions */}
      <div className="min-w-0 flex-1 md:col-span-7 sm:px-8 lg:px-10 space-y-2.5 sm:space-y-4 text-right">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-900/50 text-[var(--color-emphasis-text)] dark:text-primary-300 text-xs font-black shadow-xs">
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-[var(--color-emphasis-text)] dark:text-primary-400 shrink-0" />
          <span>{normalizePersianTypography(slide.tag)}</span>
        </div>

        <h1 className="text-[22px] sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.35] sm:leading-[1.15] tracking-tight">
          {normalizePersianTypography(slide.title)}
        </h1>

        <p className="text-[13px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal line-clamp-2 sm:line-clamp-none">
          {normalizePersianTypography(slide.subtitle)}
        </p>

        <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Link
            to={slide.buttonLink}
            className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] active:bg-[var(--color-cta-active)] text-white font-black px-5 sm:px-6 min-h-[44px] sm:min-h-[48px] rounded-2xl text-[13px] sm:text-sm transition-colors duration-200 shadow-lg shadow-[var(--color-cta)]/30 flex items-center gap-2 group active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]"
          >
            <span>{normalizePersianTypography(slide.buttonText)}</span>
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </Link>

          <div className="hidden sm:flex text-xs font-black px-4 py-2.5 rounded-2xl border bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-white/[0.04] dark:text-slate-300 dark:border-white/[0.08] items-center gap-2">
            <Award className="h-4 w-4 shrink-0 text-[var(--color-emphasis-text)] dark:text-inherit" />
            <span>{normalizePersianTypography(slide.badge)}</span>
          </div>
        </div>
      </div>

      {/* Visual column — real product cards from the live catalogue */}
      <div className="shrink-0 md:col-span-5 w-[92px] sm:w-auto sm:max-w-[320px] lg:max-w-[360px] sm:mx-auto md:mx-0">
        {cards.length > 0 ? (
          <div className="w-full">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                موجود در انبار
              </span>
              <span className="rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 tabular-nums">
                {toPersianDigits(products.length)} کالا
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2.5">
              {cards.map((p, idx) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  aria-label={p.title}
                  className={`${idx > 0 ? 'hidden sm:flex' : 'flex'} h-full flex-col gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-white/[0.05] border border-slate-200/90 dark:border-white/[0.09] p-1.5 sm:p-2 shadow-xs hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700/60 transition-all duration-300 motion-reduce:transition-none group/card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]`}
                >
                  <div className="aspect-square w-full rounded-lg sm:rounded-xl bg-slate-50 dark:bg-white/[0.03] overflow-hidden flex items-center justify-center">
                    <img
                      src={p.image}
                      alt={normalizePersianTypography(p.title)}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      width="160"
                      height="160"
                      className="w-full h-full object-contain group-hover/card:scale-105 transition-transform duration-300 motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
                    />
                  </div>
                  <span className="text-[9px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-4 line-clamp-2 min-h-[16px] sm:min-h-[32px]">
                    {normalizePersianTypography(p.title).replace(/([A-Za-z0-9])-([A-Za-z0-9])/g, '$1\u2011$2')}
                  </span>
                  <span className="mt-auto pt-0.5 text-[10px] sm:text-[12px] font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {formatPrice(p.price)}
                  </span>
                </Link>
              ))}

              <Link
                to="/products"
                className="hidden sm:flex h-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 dark:border-white/[0.14] bg-slate-50/70 dark:bg-white/[0.02] p-2 text-center hover:border-primary-400 dark:hover:border-primary-600 hover:bg-primary-50/60 dark:hover:bg-primary-950/20 transition-colors duration-300"
              >
                <Package className="h-5 w-5 text-[var(--color-emphasis-text)] dark:text-primary-400" />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">مشاهده همهٔ کالاها</span>
                <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative w-24 h-24 sm:w-56 sm:h-56 rounded-2xl sm:rounded-3xl p-0 sm:p-5 bg-transparent sm:bg-white/90 dark:sm:bg-[#121c33]/80 border-0 sm:border border-slate-200/80 dark:border-white/[0.08] sm:backdrop-blur-md flex items-center justify-center sm:shadow-md dark:sm:shadow-2xl hero-visual-tile mx-auto">
            <PictureImage
              src={slide.image}
              alt={normalizePersianTypography(slide.title)}
              width="320"
              height="320"
              priority={true}
              className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
