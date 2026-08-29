import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Heart, Scale, CheckCircle2, Star, Sparkles } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCompare } from '../contexts/CompareContext';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import { Product } from '../types';
import SmartImage from './SmartImage';
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    
    addToCart(product);
    setAdded(true);
    addToast(`${product.title} به سبد خرید افزوده شد`, 'success');
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="linear-card bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-light)]/[0.025] rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] p-4.5 hover:shadow-2xl transition-all duration-300 relative flex flex-col justify-between h-full group select-none hover:-translate-y-1">
      
      {/* 1. Header Badges & Quick Action Floating Buttons */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
          <div>
            {outOfStock ? (
              <span className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
                ناموجود
              </span>
            ) : product.discount && product.discount > 0 ? (
              <span className="bg-gradient-to-r from-rose-600 to-pink-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm shadow-rose-600/30">
                {toPersianDigits(product.discount)}٪ تخفیف
              </span>
            ) : (
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-[var(--color-surface-light)]/[0.04] px-2.5 py-0.5 rounded-lg border border-zinc-200/60 dark:border-white/[0.06]">
                {product.brand || 'اورجینال'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
              aria-label={inWishlist ? "حذف از لیست علاقه‌مندی‌ها" : "افزودن به لیست علاقه‌مندی‌ها"}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                inWishlist 
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-800' 
                  : 'bg-zinc-50 dark:bg-[var(--color-surface-light)]/[0.03] text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-zinc-200/40 dark:border-white/[0.05]'
              }`}
              title="علاقه‌مندی‌ها"
            >
              <Heart className={`h-4 w-4 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product); }}
              aria-label={inCompare ? "حذف از مقایسه" : "افزودن به مقایسه"}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                inCompare 
                  ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800' 
                  : 'bg-zinc-50 dark:bg-[var(--color-surface-light)]/[0.03] text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-zinc-200/40 dark:border-white/[0.05]'
              }`}
              title="مقایسه مشخصات"
            >
              <Scale className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2. Visual Product Image Container */}
        <Link to={`/product/${product.id}`} className="block group-hover:opacity-95 transition-opacity">
          <div className="relative aspect-square w-full rounded-2xl bg-gradient-to-b from-zinc-50 to-zinc-100/60 dark:from-white/[0.03] dark:to-white/[0.01] border border-zinc-100 dark:border-white/[0.06] p-4 flex items-center justify-center overflow-hidden mb-3.5 group-hover:border-orange-500/30 transition-colors">
            
            {/* Ambient Radial Accent */}
            <div className="absolute inset-0 bg-radial from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <SmartImage
              src={product.image}
              alt={product.title}
              className="max-h-full max-w-full object-contain drop-shadow-sm group-hover:scale-108 transition-transform duration-500"
            />

            {/* Low stock badge */}
            {typeof product.stockQuantity === 'number' && product.stockQuantity > 0 && product.stockQuantity <= 3 && (
              <span className="absolute bottom-2 right-2 bg-amber-500/90 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs">
                تنها {toPersianDigits(product.stockQuantity)} عدد
              </span>
            )}
          </div>

          {/* 3. Category & Rating Strip */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5 px-0.5">
            <span className="font-semibold text-orange-600/90 dark:text-orange-400/90">{product.category}</span>
            <div className="flex items-center gap-1 font-bold text-amber-500">
              <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
              <span>{toPersianDigits(product.rating || '۴.۸')}</span>
            </div>
          </div>

          {/* 4. Product Title */}
          <h3 className="font-black text-xs sm:text-sm text-zinc-900 dark:text-[#f7f8f8] line-clamp-2 leading-relaxed h-10 sm:h-11 flex items-start group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            {product.title}
          </h3>
        </Link>
      </div>

      {/* 5. Footer: Price & Add-To-Cart CTA */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
        <div className="flex items-end justify-between gap-2">
          
          {/* Price Stack */}
          <div className="flex flex-col text-right">
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <div className="text-sm sm:text-base font-black text-orange-600 dark:text-orange-400 font-mono tracking-tight">
              {formatPrice(product.price)}
            </div>
          </div>

          {/* Primary Action Button with Raycast Inset Shadow */}
          <button
            type="button"
            disabled={outOfStock}
            onClick={handleAddToCart}
            className={`raycast-btn h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all duration-200 cursor-pointer ${
              outOfStock 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none'
                : added 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 active:scale-95 text-white'
            }`}
            title="افزودن به سبد خرید"
          >
            {added ? (
              <>
                <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                <span className="hidden sm:inline">افزوده شد</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 stroke-[2.2]" />
                <span className="hidden sm:inline">خرید</span>
              </>
            )}
          </button>
        </div>

        {/* 6. Guarantee Micro-Badge */}
        {product.warranty && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-50 dark:bg-[var(--color-surface-light)]/[0.02] px-2 py-1 rounded-lg border border-zinc-200/40 dark:border-white/[0.04]">
            <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="truncate">{product.warranty}</span>
          </div>
        )}
      </div>

    </div>
  );
});

export default ProductCard;
