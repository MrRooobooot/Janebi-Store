import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Heart, Scale, CheckCircle2 } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCompare } from '../contexts/CompareContext';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import { motion } from 'motion/react';
import { Product } from '../types';
import SmartImage from './SmartImage';
import { useState, memo } from 'react';

// ⚡ Bolt: Wrapped in React.memo to prevent unnecessary re-renders when parent grids/lists re-render
const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const inWishlist = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 hover:shadow-lg dark:hover:shadow-black/40 hover:border-orange-200 dark:hover:border-gray-700 transition-all duration-300 relative flex flex-col h-full group"
    >
      {/* Quick Action Buttons */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform sm:translate-x-2 sm:group-hover:translate-x-0">
        <button
          onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
          className={`w-8 h-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-full flex items-center justify-center hover:shadow-md transition-all border ${inWishlist ? 'text-red-500 border-red-200 dark:border-red-800/60' : 'text-gray-400 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:text-red-500 dark:hover:text-red-400'}`}
          title="افزودن به علاقه‌مندی‌ها"
        >
          <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); toggleCompare(product); }}
          className={`w-8 h-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-full flex items-center justify-center hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 ${inCompare ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-300 hover:text-blue-500'}`}
          title="افزودن به مقایسه"
        >
          <Scale className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Discount badge */}
      {product.discount && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-xs">
          {product.discount}٪ تخفیف
        </div>
      )}

      {/* Product Image */}
      <Link to={`/product/${product.id}`} className="block mb-3 relative shrink-0 overflow-hidden rounded-xl">
        <div className="aspect-square w-full relative overflow-hidden rounded-xl bg-gray-50/80 dark:bg-gray-800/40 p-2 flex items-center justify-center">
          <SmartImage
            src={product.image}
            alt={product.title}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="grow flex flex-col">
        <Link
          to={`/product/${product.id}`}
          className="text-[13px] leading-relaxed font-semibold text-gray-800 dark:text-gray-100 hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-2 mb-2"
        >
          {product.title}
        </Link>

        {/* Warranty */}
        {product.warranty && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-300 mb-3 bg-gray-50 dark:bg-gray-800/60 self-start px-2 py-1 rounded-md border border-gray-100/50 dark:border-gray-700/50">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            {product.warranty}
          </div>
        )}

        {/* Price */}
        <div className="mt-auto flex flex-col items-end">
          {product.originalPrice && product.discount && (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 line-through mb-0.5">
              {product.originalPrice.toLocaleString('fa-IR')} تومان
            </div>
          )}
          <div className="text-orange-600 dark:text-orange-400 font-extrabold text-lg tracking-tight">
            {product.price.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400 mr-1">تومان</span>
          </div>
        </div>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        className={`w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-medium text-[13px] group/btn border active:scale-[0.98] ${
          added
            ? 'bg-emerald-500 dark:bg-emerald-600 text-white border-transparent'
            : 'bg-gray-100/80 dark:bg-gray-800 hover:bg-orange-600 dark:hover:bg-orange-600 text-gray-800 dark:text-gray-200 hover:text-white dark:hover:text-white border-gray-200/50 dark:border-gray-700/50 hover:border-transparent'
        }`}
      >
        {added ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            اضافه شد!
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
            افزودن به سبد
          </>
        )}
      </button>
    </motion.div>
  );
});

export default ProductCard;
