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

const ProductCard = memo(function ProductCard({ product, variant = 'full' }: { product: Product; variant?: 'full' | 'compact' }) {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const inWishlist = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);
  const [added, setAdded] = useState(false);
  const outOfStock = typeof product.stockQuantity === 'number' && product.stockQuantity <= 0;
  // Compact (dense rows like the deals strip): same design language, 4:3 tile and
  // tighter padding so the price + CTA still land inside the first phone screen.
  const compact = variant === 'compact';
  const tileAspect = compact ? 'aspect-[4/3]' : 'aspect-square';
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
    <div className="product-card linear-card bg-white dark:bg-[var(--color-surface-dark)] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] relative flex flex-col h-full overflow-hidden group select-none">
      <div className={`relative ${tileAspect} w-full bg-[var(--color-stage-light)] dark:bg-[var(--color-stage-dark)]`}>
        <Link to={`/product/${product.id}`} className="absolute inset-0" tabIndex={-1} aria-hidden="true">
          <PictureImage
            src={product.image}
            alt=""
            width="280"
            height="280"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 280px"
            className="h-full w-full object-cover"
          />
        </Link>
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-1.5">
          {outOfStock ? (
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-slate-900/70 px-2.5 text-xs font-bold text-white">
              ناموجود
            </span>
          ) : product.discount && product.discount > 0 ? (
            <span className="inline-flex h-6 min-w-max shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--color-cta)] px-2.5 text-xs font-bold leading-none text-white">
              <span>{toPersianDigits(product.discount)}٪</span>
              <span>تخفیف</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex h-6 max-w-[60%] shrink items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-slate-900/55 px-2.5 text-xs font-bold text-white">
              {product.brand || 'اورجینال'}
            </span>
          )}
          {variant === 'full' && (
            <div className="pointer-events-auto ms-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
                aria-label={inWishlist ? "حذف از لیست علاقه‌مندی‌ها" : "افزودن به لیست علاقه‌مندی‌ها"}
                className={`flex h-9 w-9 items-center justify-center rounded-full cursor-pointer ${
                  inWishlist
                    ? 'bg-white text-rose-600'
                    : 'bg-slate-900/70 text-white'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-rose-600 text-rose-600' : ''}`} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product); }}
                aria-label={inCompare ? "حذف از مقایسه" : "افزودن به مقایسه"}
                className={`flex h-9 w-9 items-center justify-center rounded-full cursor-pointer ${
                  inCompare
                    ? 'bg-white text-[var(--color-cta)]'
                    : 'bg-slate-900/70 text-white'
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        {typeof product.stockQuantity === 'number' && product.stockQuantity === 1 && (
          <span className="absolute bottom-2 right-2 inline-flex h-6 max-w-[calc(100%-1rem)] items-center rounded-full bg-[var(--color-cta)] px-2.5 text-xs font-bold leading-none text-white">
            تنها {toPersianDigits(product.stockQuantity)} عدد
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'p-3' : 'p-3 sm:p-4'}`}>
        <Link to={`/product/${product.id}`} className="block">

          {variant === 'full' && (
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mb-1 px-0.5">
            <span className="font-bold text-xs text-[var(--color-emphasis-text)] truncate min-w-0 flex-1">
              {product.category}
            </span>
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
          )}

          {/* 4. Product Title — text-wrap balance kills single-word orphan lines («با» alone) */}
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug min-h-10 sm:min-h-12 flex items-start group-hover:text-[var(--color-emphasis-text)] dark:group-hover:text-[var(--color-emphasis-text)] transition-colors mb-1.5 [text-wrap:balance]">
            {product.title}
          </h3>
          {product.sku ? (
            <p dir="ltr" className="font-mono text-xs leading-tight text-slate-500 dark:text-slate-400 mb-1.5 text-right">
              {product.sku}
            </p>
          ) : null}

          {variant === 'full' && (
          <div className="hidden sm:flex h-5 items-center text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            {product.warranty ? (
              <div className="flex items-center gap-1 truncate">
                <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="truncate">{product.warranty}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 truncate text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3 w-3 text-amber-500/80 shrink-0" />
                <span className="truncate">تضمین سلامت فیزیکی</span>
              </div>
            )}
          </div>
          )}
        </Link>

      {/* 5. Footer: Price & Add-To-Cart CTA — pinned to card bottom (never bleeds out) */}
      <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-end justify-between gap-2">
          
          {/* Price Stack — unit on its own line: money NEVER truncates at any card width */}
          <div className="flex flex-col justify-end text-right min-w-0 min-h-[44px]">
            {product.originalPrice && product.originalPrice > product.price ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 line-through leading-tight tabular-nums">
                {formatPrice(product.originalPrice).replace(' تومان', '')}
              </span>
            ) : (
              <span className="text-xs leading-tight invisible" aria-hidden="true">
                ·
              </span>
            )}
            <div className="text-sm sm:text-base font-bold text-[var(--color-emphasis-text)] tracking-tight leading-tight">
              {formatPrice(product.price).replace(' تومان', '')}
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-tight">تومان</span>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            disabled={outOfStock}
            onClick={handleAddToCart}
            aria-label={outOfStock ? 'کالای ناموجود' : `افزودن ${product.title} به سبد خرید`}
            className={`h-11 w-11 sm:w-auto sm:h-11 px-0 sm:px-3.5 rounded-xl flex items-center justify-center gap-1 text-[13px] font-bold cursor-pointer shrink-0 ${
              outOfStock 
                ? 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.06] cursor-not-allowed'
                : added 
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] active:bg-[var(--color-cta-active)] text-white'
            }`}
            title={outOfStock ? 'ناموجود' : 'افزودن به سبد خرید'}
          >
            {outOfStock ? (
              <span className="text-xs sm:text-xs font-bold">ناموجود</span>
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
    </div>
  );
});

export default ProductCard;