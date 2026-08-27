import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Heart, Scale, CheckCircle2, Star } from 'lucide-react';
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
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-4 hover:shadow-xl dark:hover:shadow-black/50 hover:border-orange-400 dark:hover:border-orange-500/50 transition-all duration-200 relative flex flex-col justify-between h-full group select-none">
      
      {/* 1. Header Badges & Quick Action Floating Buttons */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
          <div>
            {outOfStock ? (
              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
                ناموجود
              </span>
            ) : product.discount && product.discount > 0 ? (
              <span className="bg-rose-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                {toPersianDigits(product.discount)}٪ تخفیف
              </span>
            ) : (
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {product.brand || 'اورجینال'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                inWishlist 
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-800' 
                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
              title="علاقه‌مندی‌ها"
            >
              <Heart className={`h-4 w-4 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product); }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                inCompare 
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800' 
                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
              title="مقایسه کالا"
            >
              <Scale className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2. Product Image Section */}
        <Link to={`/product/${product.id}`} className="block mb-3.5 relative overflow-hidden rounded-2xl">
          <div className="aspect-square w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 p-4 flex items-center justify-center group-hover:bg-orange-50/20 dark:group-hover:bg-zinc-800 transition-colors duration-200">
            <SmartImage
              src={product.image}
              alt={product.title}
              className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>

        {/* 3. Category & Rating */}
        <div className="flex items-center justify-between gap-1 mb-1.5 text-[11px]">
          <span className="text-zinc-400 dark:text-zinc-500 font-bold truncate">
            {product.category}
          </span>
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-lg text-amber-600 dark:text-amber-400 font-black shrink-0">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{toPersianDigits(product.rating ? product.rating.toFixed(1) : '۴.۸')}</span>
          </div>
        </div>

        {/* 4. Product Title */}
        <Link
          to={`/product/${product.id}`}
          title={product.title}
          className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-2 leading-relaxed min-h-[38px] mb-2"
        >
          {product.title}
        </Link>

        {/* 5. Warranty Badge */}
        {product.warranty && (
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md mb-2">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span className="truncate">{product.warranty}</span>
          </div>
        )}
      </div>

      {/* 6. Footer: Price & Add to Cart Action */}
      <div className="mt-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-end justify-between gap-2 mb-3">
          <span className="text-[10px] text-zinc-400">قیمت فروش:</span>
          <div className="flex flex-col items-end">
            {product.originalPrice && product.discount && product.discount > 0 ? (
              <span className="text-[11px] text-zinc-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            ) : null}
            <span className="text-sm sm:text-base font-black text-orange-600 dark:text-orange-400 tracking-tight">
              {formatPrice(product.price)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 font-black text-xs cursor-pointer active:scale-[0.98] shadow-xs ${
            outOfStock
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
              : added
              ? 'bg-emerald-600 text-white'
              : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/20'
          }`}
        >
          {outOfStock ? (
            'اتمام موجودی'
          ) : added ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>به سبد اضافه شد</span>
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              <span>افزودن به سبد خرید</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default ProductCard;
