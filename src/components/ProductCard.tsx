import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Heart, Scale, CheckCircle2, Star, Zap } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCompare } from '../contexts/CompareContext';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import { motion } from 'motion/react';
import { Product } from '../types';
import SmartImage from './SmartImage';
import BrandLogo from './BrandLogo';
import { toPersianDigits, formatPrice } from '../lib/utils';

// ⚡ Bolt: Wrapped in React.memo to prevent unnecessary re-renders when parent grids/lists re-render
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 hover:shadow-xl dark:hover:shadow-black/50 hover:border-orange-200 dark:hover:border-gray-700/80 transition-all duration-300 relative flex flex-col h-full group select-none"
    >
      {/* 1. Header Badges & Actions */}
      <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
        {/* Discount Badge / Stock Badge */}
        <div>
          {outOfStock ? (
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-gray-200/80 dark:border-gray-700">
              ناموجود
            </span>
          ) : product.discount && product.discount > 0 ? (
            <span className="bg-rose-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
              <span>{toPersianDigits(product.discount)}٪</span>
              <span className="text-[9px] font-bold">تخفیف</span>
            </span>
          ) : product.brand ? (
            <div className="opacity-80">
              <BrandLogo name={product.brand} size="sm" className="justify-start" />
            </div>
          ) : (
            <span className="text-[10px] text-gray-400 font-medium">اورجینال</span>
          )}
        </div>

        {/* Wishlist & Compare Quick Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
              inWishlist 
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-800/60' 
                : 'bg-gray-50 dark:bg-gray-800/80 text-gray-400 dark:text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-gray-100 dark:border-gray-700/50'
            }`}
            title="افزودن به علاقه‌مندی‌ها"
          >
            <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product); }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
              inCompare 
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800/60' 
                : 'bg-gray-50 dark:bg-gray-800/80 text-gray-400 dark:text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-100 dark:border-gray-700/50'
            }`}
            title="مقایسه با سایر کالاها"
          >
            <Scale className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Product Image Section */}
      <Link to={`/product/${product.id}`} className="block mb-3 relative shrink-0 overflow-hidden rounded-2xl">
        <div className="aspect-square w-full relative overflow-hidden rounded-2xl bg-gray-50/90 dark:bg-gray-800/40 p-3 flex items-center justify-center group-hover:bg-orange-50/30 dark:group-hover:bg-gray-800/60 transition-colors duration-300">
          <SmartImage
            src={product.image}
            alt={product.title}
            className="object-contain w-full h-full group-hover:scale-108 transition-transform duration-500"
          />
        </div>
      </Link>

      {/* 3. Product Info & Rating */}
      <div className="grow flex flex-col justify-between text-right">
        <div>
          {/* Category & Rating Row */}
          <div className="flex items-center justify-between gap-1 mb-1.5 text-[11px]">
            <span className="text-gray-400 dark:text-gray-400 font-medium truncate">
              {product.category}
            </span>
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md text-amber-600 dark:text-amber-400 font-extrabold shrink-0 border border-amber-200/50 dark:border-amber-900/40">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{toPersianDigits(product.rating ? product.rating.toFixed(1) : '۴.۸')}</span>
            </div>
          </div>

          {/* Title */}
          <Link
            to={`/product/${product.id}`}
            title={product.title}
            className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-2 leading-relaxed min-h-[40px] mb-2"
          >
            {product.title}
          </Link>
        </div>

        {/* Warranty Badge */}
        {product.warranty && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40 self-start mb-3">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span className="truncate">{product.warranty}</span>
          </div>
        )}

        {/* 4. Price Section */}
        <div className="pt-2 border-t border-gray-50 dark:border-gray-800/80 flex flex-col items-end">
          {product.originalPrice && product.discount && product.discount > 0 ? (
            <div className="text-[11px] text-gray-400 dark:text-gray-400 line-through font-mono">
              {toPersianDigits(product.originalPrice.toLocaleString('fa-IR'))}
            </div>
          ) : (
            <div className="h-[17px]"></div>
          )}
          <div className="text-orange-600 dark:text-orange-400 font-black text-base sm:text-lg tracking-tight flex items-center gap-1">
            <span>{toPersianDigits(product.price.toLocaleString('fa-IR'))}</span>
            <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">تومان</span>
          </div>
        </div>
      </div>

      {/* 5. Add to Cart Button */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={outOfStock}
        className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-2xl transition-all duration-300 font-extrabold text-xs cursor-pointer active:scale-[0.98] shadow-xs ${
          outOfStock
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-400 cursor-not-allowed border border-gray-200/60 dark:border-gray-700'
            : added
            ? 'bg-emerald-600 text-white shadow-emerald-500/25'
            : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-orange-500/20 hover:shadow-md'
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
    </motion.div>
  );
});

export default ProductCard;
