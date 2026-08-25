import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShieldCheck, Truck, ShoppingCart, Heart, ArrowLeftRight, Zap, CheckCircle2, Check } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCompare } from '../contexts/CompareContext';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import { ProductDetailSkeleton } from '../components/Skeletons';
import SmartImage from '../components/SmartImage';
import ProductReviews from '../components/ProductReviews';
import RecentlyViewed from '../components/RecentlyViewed';
import { addRecentlyViewed } from '../lib/recentlyViewed';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { formatPrice, toPersianDigits } from '../lib/utils';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState('description');
  const [loading, setLoading] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const actionsRef = useRef<HTMLDivElement>(null);

  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  const { addToast } = useToast();
  const { addToCart } = useCart();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setSelectedImageIndex(0);
        setLoading(false);
        addRecentlyViewed({
          id: data.id,
          title: data.title,
          category: data.category,
          price: data.price,
          originalPrice: data.originalPrice,
          discount: data.discount,
          image: data.image,
          brand: data.brand,
          rating: data.rating,
        });
      })
      .catch(() => {
        setProduct(null);
        setLoading(false);
      });
  }, [id]);

  // Show sticky bar when the main action buttons scroll out of view
  useEffect(() => {
    if (!actionsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(actionsRef.current);
    return () => observer.disconnect();
  }, [product]);

  if (loading) return <ProductDetailSkeleton />;
  if (!product)
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 flex flex-col items-center shadow-xs">
        <div className="text-5xl mb-4">🔍</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">محصول یافت نشد!</h3>
        <p className="text-gray-500 dark:text-gray-300 mb-6">
          احتمالاً این محصول حذف شده یا آدرس را اشتباه وارد کرده‌اید.
        </p>
        <Link
          to="/products"
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-medium transition-colors"
        >
          بازگشت به محصولات
        </Link>
      </div>
    );

  const inWishlist = product ? isInWishlist(product.id) : false;
  const inCompare = product ? isInCompare(product.id) : false;

  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  // Real gallery: show the actual product image once (fake duplicate
  // thumbnails of the same image looked broken and misled users).
  const galleryImages = product.image ? [product.image] : [];
  const hasRating = !!product.rating && product.rating > 0;
  const outOfStock = typeof product.stockQuantity === 'number' && product.stockQuantity <= 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 lg:p-10 shadow-xs border border-gray-100 dark:border-gray-800 transition-colors pb-28 lg:pb-10 text-right"
      >
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Gallery */}
          <div className="w-full lg:w-5/12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="aspect-square bg-white dark:bg-gray-800/40 backdrop-blur-md rounded-3xl flex items-center justify-center p-8 mb-6 border border-gray-100 dark:border-gray-800 relative overflow-hidden group shadow-inner"
            >
              {product.discount && (
                <div className="absolute top-6 right-6 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold px-3 py-1.5 rounded-xl z-10 text-xs shadow-md">
                  {toPersianDigits(product.discount)}٪ تخفیف
                </div>
              )}
              <SmartImage
                src={galleryImages[selectedImageIndex] || product.image}
                alt={product.title}
                priority
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </motion.div>

            {/* Thumbnail Selectors */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {galleryImages.map((img, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1, duration: 0.4 }}
                  className={`w-20 h-20 bg-white dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border-2 p-2 shrink-0 transition-all duration-300 ${
                    selectedImageIndex === idx
                      ? 'border-orange-500 shadow-md scale-105'
                      : 'border-gray-100 dark:border-gray-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx}`}
                    className="w-full h-full object-contain"
                  />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="w-full lg:w-7/12 flex flex-col">
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-gray-100 mb-4 leading-relaxed">
              {product.title}
            </h1>

            <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800 text-xs sm:text-sm">
              <div className={`flex items-center gap-1 ${hasRating ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      hasRating && i < Math.floor(product.rating ?? 0)
                        ? 'fill-current'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
                <span className="text-gray-600 dark:text-gray-300 mr-2 text-xs font-bold">
                  {hasRating
                    ? `(${toPersianDigits(product.rating ?? 0)} از ۵ — ${toPersianDigits(product.reviewsCount || 0)} نظر)`
                    : '(هنوز نظری ثبت نشده — اولین نفر باشید)'}
                </span>
              </div>
              {product.sku && (
                <div className="text-gray-500 dark:text-gray-400 font-medium">
                  کد کالا: <span className="text-gray-800 dark:text-gray-200 font-mono font-bold">{product.sku}</span>
                </div>
              )}
            </div>

            {/* Price Box */}
            <div className="mb-8">
              {product.originalPrice && product.discount && (
                <div className="text-gray-400 dark:text-gray-500 text-sm mb-1 flex items-center justify-start line-through font-medium">
                  {formatPrice(product.originalPrice)}
                </div>
              )}
              <div className="text-3xl font-black text-orange-600 dark:text-orange-400 flex items-center gap-2">
                {formatPrice(product.price)}
              </div>
            </div>

            {/* Attributes & Features */}
            <div className="space-y-4 mb-8">
              {product.features && (
                <div className="flex flex-wrap gap-2">
                  {product.features.map((feat: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-3.5 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/60 flex items-center gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {feat}
                    </span>
                  ))}
                </div>
              )}

              {product.warranty && (
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      گارانتی محصول:
                    </span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-gray-100">
                    {product.warranty}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">نحوه ارسال:</span>
                </div>
                <span className="text-xs font-black text-gray-900 dark:text-gray-100">
                  ارسال سریع اکسپرس (تحویل ۱ تا ۲ روز کاری)
                </span>
              </div>
            </div>

            {/* Actions — tracked by IntersectionObserver */}
            <div ref={actionsRef} className="mt-auto flex gap-4">
              <button
                onClick={handleAddToCart}
                disabled={outOfStock}
                className={`flex-1 font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 text-sm ${
                  outOfStock
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                    : addedToCart
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/25'
                } text-white`}
              >
                {outOfStock ? (
                  'ناموجود'
                ) : addedToCart ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    اضافه شد!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    افزودن به سبد خرید
                  </>
                )}
              </button>

              <button
                onClick={() => toggleWishlist(product)}
                title={inWishlist ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                className={`w-14 h-14 border rounded-2xl flex items-center justify-center transition-colors ${
                  inWishlist
                    ? 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
                    : 'text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Heart className={`h-6 w-6 ${inWishlist ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={() => toggleCompare(product)}
                title={inCompare ? 'حذف از لیست مقایسه' : 'افزودن به لیست مقایسه'}
                className={`w-14 h-14 border rounded-2xl flex items-center justify-center transition-colors ${
                  inCompare
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
                    : 'text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <ArrowLeftRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16 border-t border-gray-200 dark:border-gray-800 pt-8">
          <div className="flex gap-8 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-4 font-bold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'description'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400 font-extrabold'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-100'
              }`}
            >
              معرفی محصول
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-4 font-bold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'specs'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400 font-extrabold'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-100'
              }`}
            >
              مشخصات فنی
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 font-bold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400 font-extrabold'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-100'
              }`}
            >
              نظرات کاربران ({toPersianDigits(product.reviewsCount || 0)})
            </button>
          </div>

          {activeTab === 'description' && (
            <div className="max-w-none text-gray-700 dark:text-gray-200 leading-loose text-sm font-medium">
              {product.description ? (
                <p>{product.description}</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  توضیحاتی برای این محصول ثبت نشده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.
                </p>
              )}
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 max-w-2xl">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 mb-4">
                مشخصات کلی محصول
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm">
                <li className="flex border-b border-gray-200 dark:border-gray-700/60 pb-2.5">
                  <span className="w-1/3 text-gray-500 dark:text-gray-400 font-bold">برند سازنده</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{product.brand}</span>
                </li>
                <li className="flex border-b border-gray-200 dark:border-gray-700/60 pb-2.5">
                  <span className="w-1/3 text-gray-500 dark:text-gray-400 font-bold">دسته‌بندی</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{product.category}</span>
                </li>
                {product.warranty && (
                  <li className="flex border-b border-gray-200 dark:border-gray-700/60 pb-2.5">
                    <span className="w-1/3 text-gray-500 dark:text-gray-400 font-bold">مدت گارانتی</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{product.warranty}</span>
                  </li>
                )}
                {product.features && (
                  <li className="flex pb-1">
                    <span className="w-1/3 text-gray-500 dark:text-gray-400 font-bold">ویژگی‌های بارز</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {product.features.join('، ')}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {activeTab === 'reviews' && (
            <ProductReviews
              productId={product.id}
              initialRating={product.rating || 0}
              initialReviewsCount={product.reviewsCount || 0}
            />
          )}
        </div>

        {/* Recently Viewed Products */}
        <RecentlyViewed currentProductId={product.id} />
      </motion.div>

      {/* ── Sticky Mobile Action Bar ── */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
          >
            <div className="mx-3 mb-[72px]">
              <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg p-3 flex items-center gap-3 text-right">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
                      {product.title}
                    </p>
                    <p className="text-sm font-black text-orange-600 dark:text-orange-400 leading-tight mt-0.5">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
                      inWishlist
                        ? 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50'
                        : 'text-gray-400 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleAddToCart}
                    className={`h-11 px-5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all active:scale-97 shadow-md ${
                      addedToCart
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20'
                    }`}
                  >
                    {addedToCart ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        اضافه شد
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        افزودن به سبد
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
