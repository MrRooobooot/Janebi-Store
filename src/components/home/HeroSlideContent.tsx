// Single hero slide: text column + visual column.
// Extracted so Home can stack all slides in one grid cell (stable container height — no CLS on slide change).
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Award } from 'lucide-react';
import PictureImage from '../PictureImage';
import { normalizePersianTypography } from '../../lib/utils';

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

export default function HeroSlideContent({ slide }: { slide: HeroSlide }) {
  return (
    <div className="relative z-10 w-full flex items-start sm:items-center gap-3 sm:gap-6 md:grid md:grid-cols-12 md:gap-8">
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

      {/* Visual 3D Asset Showcase Column (Desktop/Tablet) */}
      <div className="flex shrink-0 md:col-span-5 items-center justify-center relative">
        <div className="relative w-24 h-24 sm:w-56 sm:h-56 lg:w-56 lg:h-56 rounded-2xl sm:rounded-3xl p-0 sm:p-5 bg-transparent sm:bg-white/90 dark:sm:bg-[#121c33]/80 border-0 sm:border border-slate-200/80 dark:border-white/[0.08] sm:backdrop-blur-md flex items-center justify-center sm:shadow-md dark:sm:shadow-2xl group hero-visual-tile">
          <PictureImage
            src={slide.image}
            alt={normalizePersianTypography(slide.title)}
            width="320"
            height="320"
            priority={true}
            className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
      </div>
    </div>
  );
}
