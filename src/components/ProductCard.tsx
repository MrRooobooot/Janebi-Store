import React, { useState, useEffect, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Heart, Scale, CheckCircle2, Star, Sparkles } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCompare } from '../contexts/CompareContext';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import { Product } from '../types';
import PictureImage from './PictureImage';
import { toPersianDigits, formatPrice } from '../lib/utils';

const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const inWishlist = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);
  const [added, setAdded] = useState(false);
  const outOfStock = typeof product.stockQuantity === 'number' && product.stockQuantity <= 0;
  // R2-09: reset timer is cleared on unmount.
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;

    addToCart(product);
    setAdded(true);
    addToast(`${product.title} به سبد خرید افزوده شد`, 'success');
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="linear-card bg-white dark:bg-[#0e1629] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-3 sm:p-4 pb-3.5 sm:pb-4 transition-all duration-300 relative flex flex-col h-full group select-none hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevation-2)] overflow-hidden">
      
      {/* 1. Header Badges & Quick Action Floating Buttons */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5 relative z-10">
          <div className="min-w-0 max-w-[60%]">
            {outOfStock ? (
              <span className="bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/[0.08] inline-block">
                ناموجود
              </span>
            ) : product.discount && product.discount > 0 ? (
              <span className="bg-[var(--color-cta)] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs inline-block">
                {toPersianDigits(product.discount)}٪ تخفیف
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-white/[0.06] inline-block whitespace-nowrap overflow-hidden text-ellipsis max-w-full align-top">
                {product.brand || 'اورجینال'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
              aria-label={inWishlist ? "حذف از لیست علاقه‌مندی‌ها" : "افزودن به لیست علاقه‌مندی‌ها"}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                inWishlist 
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-800' 
                  : 'bg-slate-50 dark:bg-white/[0.04] text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200/60 dark:border-white/[0.06]'
              }`}
              title="علاقه‌مندی‌ها"
            >
              <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product); }}
              aria-label={inCompare ? "حذف از مقایسه" : "افزودن به مقایسه"}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                inCompare 
                  ? 'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/60 text-[var(--color-emphasis-text)] border border-[var(--color-cta)]/30 dark:border-[var(--color-cta)]/40' 
                  : 'bg-slate-50 dark:bg-white/[0.04] text-slate-400 hover:text-[var(--color-emphasis-text)] hover:bg-[var(--color-cta)]/10 dark:hover:bg-[var(--color-cta)]/30 border border-slate-200/60 dark:border-white/[0.06]'
              }`}
              title="مقایسه مشخصات"
            >
              <Scale className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Visual Product Image Container */}
        <Link to={`/product/${product.id}`} className="block group-hover:opacity-95 transition-opacity">
          <div className="relative aspect-square w-full rounded-2xl bg-[var(--color-tile-light)] dark:bg-[var(--color-tile-dark)] border border-slate-100 dark:border-white/[0.05] p-3 sm:p-4 flex items-center justify-center overflow-hidden mb-2.5 group-hover:border-[var(--color-border-light-hover)] dark:group-hover:border-white/[0.12] transition-colors">
            
            {/* Ambient Radial Accent */}
            <div className="absolute inset-0 bg-radial from-[var(--color-cta)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <PictureImage
              src={product.image}
              alt={product.title}
              width="280"
              height="280"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
              className="max-h-full max-w-full object-contain drop-shadow-sm group-hover:scale-108 transition-transform duration-500"
            />

            {/* Low stock badge */}
            {typeof product.stockQuantity === 'number' && product.stockQuantity > 0 && product.stockQuantity <= 3 && (
              <span className="absolute bottom-2 right-2 bg-[var(--color-accent-surface)]/90 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs">
                تنها {toPersianDigits(product.stockQuantity)} عدد
              </span>
            )}
          </div>

          {/* Header Badge */}
          <div className="flex items-center justify-between gap-2 mb-1 px-0.5">
            <span className="font-bold text-[11px] text-[var(--color-emphasis-text)] truncate max-w-[70%]">
              {product.category}
            </span>
            {!product.rating && (
              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded-md">
                جدید
              </span>
            )}
            {product.rating ? (
              <div
                className={`flex items-center gap-1 font-bold ${
                  product.rating >= 4
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : product.rating < 2
                    ? 'text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Star
                  className={`h-3 w-3 fill-current ${
                    product.rating >= 4
                      ? 'text-emerald-500'
                      : product.rating < 2
                      ? 'text-[var(--color-emphasis-text)]'
                      : 'text-slate-400'
                  }`}
                />
                <span>
                  {toPersianDigits(product.rating)}
                  {product.reviewsCount ? ` (${toPersianDigits(product.reviewsCount)})` : ''}
                </span>
              </div>
            ) : null}
          </div>

          {/* 4. Product Title */}
          <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed h-10 sm:h-12 flex items-start group-hover:text-[var(--color-emphasis-text)] dark:group-hover:text-[var(--color-emphasis-text)] transition-colors mb-1.5">
            {product.title}
          </h3>

          {/* Guarantee / Trust Micro-Badge (Fixed slot to guarantee vertical harmony) */}
          <div className="h-5 flex items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
            {product.warranty ? (
              <div className="flex items-center gap-1 truncate">
                <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="truncate">{product.warranty}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 truncate text-slate-400 dark:text-slate-500">
                <Sparkles className="h-3 w-3 text-amber-500/80 shrink-0" />
                <span className="truncate">تضمین سلامت فیزیکی</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* 5. Footer: Price & Add-To-Cart CTA — pinned to card bottom (never bleeds out) */}
      <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-end justify-between gap-2">
          
          {/* Price Stack — guaranteed uniform 2-line baseline across cards */}
          <div className="flex flex-col justify-end text-right shrink-0 min-w-0 min-h-[36px]">
            {product.originalPrice && product.originalPrice > product.price ? (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through truncate leading-tight">
                {formatPrice(product.originalPrice)}
              </span>
            ) : (
              <span className="text-[11px] text-transparent select-none leading-tight" aria-hidden="true">
                -
              </span>
            )}
            <div className="text-xs sm:text-sm font-black text-[var(--color-emphasis-text)] font-mono tracking-tight whitespace-nowrap leading-tight">
              {formatPrice(product.price)}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            disabled={outOfStock}
            onClick={handleAddToCart}
            aria-label={outOfStock ? 'کالای ناموجود' : `افزودن ${product.title} به سبد خرید`}
            className={`raycast-btn h-9 sm:h-9 px-3 sm:px-3.5 rounded-xl flex items-center justify-center gap-1 text-xs font-black transition-all duration-200 cursor-pointer shrink-0 ${
              outOfStock 
                ? 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-white/[0.06] cursor-not-allowed shadow-none'
                : added 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] active:bg-[var(--color-cta-active)] active:scale-95 text-white'
            }`}
            title={outOfStock ? 'ناموجود' : 'افزودن به سبد خرید'}
          >
            {outOfStock ? (
              <span className="text-[10px] sm:text-[11px] font-bold">ناموجود</span>
            ) : added ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">افزوده شد</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5 stroke-[2.2]" />
                <span className="hidden sm:inline">خرید</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
});

export default ProductCard;
