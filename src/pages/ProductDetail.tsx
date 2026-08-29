import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, ShieldCheck, Truck, ShoppingCart, Heart, ArrowLeftRight, Zap, 
  CheckCircle2, Check, Maximize2, X, RotateCcw, Award, PackageCheck, AlertCircle, Share2
} from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCompare } from '../contexts/CompareContext';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import { ProductDetailSkeleton } from '../components/Skeletons';
import SmartImage from '../components/SmartImage';
import BrandLogo from '../components/BrandLogo';
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
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

        // Dynamic Product JSON-LD Schema for AI Crawlers and Search Engines
        const existingScript = document.getElementById('product-schema-jsonld');
        if (existingScript) existingScript.remove();

        const schemaScript = document.createElement('script');
        schemaScript.id = 'product-schema-jsonld';
        schemaScript.type = 'application/ld+json';
        schemaScript.text = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data.title,
          image: data.image?.startsWith('http') ? data.image : `https://janebiarena.ir${data.image}`,
          description: data.description || `${data.title} - اورجینال با ضمانت سلامت و اصالت فیزیکی کالا`,
          brand: {
            '@type': 'Brand',
            name: data.brand || 'Janebi Arena',
          },
          offers: {
            '@type': 'Offer',
            url: window.location.href,
            priceCurrency: 'IRR',
            price: (data.price * 10).toString(),
            availability: data.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: 'جانبی آرنا',
            },
          },
          aggregateRating: data.rating ? {
            '@type': 'AggregateRating',
            ratingValue: data.rating.toString(),
            reviewCount: (data.reviewsCount || 1).toString(),
            bestRating: '5',
            worstRating: '1',
          } : undefined,
        });
        document.head.appendChild(schemaScript);
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.title || 'جانبی آرنا',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('لینک محصول با موفقیت کپی شد', 'success');
    }
  };

  if (loading) return <ProductDetailSkeleton />;
  if (!product)
    return (
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-12 text-center border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex flex-col items-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 border border-orange-100 dark:border-orange-800/60 shadow-inner">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-2">محصول یافت نشد!</h3>
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
      addToast(`${product.title} به سبد خرید اضافه شد`, 'success');
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  const galleryImages = product.image ? [product.image] : [];
  const hasRating = !!product.rating && product.rating > 0;
  const stock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 10;
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= 3;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-10 pb-28 lg:pb-12 text-right"
      >
        {/* Main Product Card */}
        <div className="bg-[var(--color-surface-light)]/85 dark:bg-[var(--color-surface-dark)]/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] transition-colors">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
            {/* Gallery Column */}
            <div className="w-full lg:w-5/12">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-md rounded-3xl flex items-center justify-center p-8 mb-4 border border-gray-200/60 dark:border-[var(--color-border-dark)] relative overflow-hidden group shadow-inner"
              >
                {product.discount && (
                  <div className="absolute top-5 right-5 bg-gradient-to-r from-rose-600 to-orange-600 text-white font-black px-3.5 py-1.5 rounded-xl z-10 text-xs shadow-md tracking-wider">
                    {toPersianDigits(product.discount)}٪ تخفیف
                  </div>
                )}

                {/* Lightbox / Zoom trigger button */}
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  aria-label="مشاهده تصویر در اندازه بزرگ"
                  className="absolute top-5 left-5 w-10 h-10 rounded-xl bg-[var(--color-surface-light)]/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/60 dark:border-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-10 shadow-sm"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>

                <SmartImage
                  src={galleryImages[selectedImageIndex] || product.image}
                  alt={product.title}
                  priority
                  className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                />
              </motion.div>

              {/* Thumbnails */}
              {galleryImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-20 h-20 bg-[var(--color-surface-light)] dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border-2 p-2 shrink-0 transition-all duration-300 ${
                        selectedImageIndex === idx
                          ? 'border-orange-500 shadow-md scale-105'
                          : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`تصویر ${idx + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust Badges - Desktop view */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/60">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/30 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/50">
                  <Award className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="text-right">
                    <p className="text-xs font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">ضمانت ۱۰۰٪ اصالت</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">کالای اورجینال و شرکتی</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/30 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/50">
                  <RotateCcw className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div className="text-right">
                    <p className="text-xs font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">۷ روز مهلت تست</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">ضمانت بازگشت وجه</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Info Column */}
            <div className="w-full lg:w-7/12 flex flex-col justify-between">
              <div>
                {/* Brand & Action Share Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50 text-xs font-extrabold">
                    <span>برند: {product.brand}</span>
                  </div>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="اشتراک‌گذاری محصول"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>

                <h1 className="text-2xl lg:text-3xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-4 leading-snug">
                  {product.title}
                </h1>

                {/* Rating & SKU Bar */}
                <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-xs sm:text-sm">
                  <div className={`flex items-center gap-1 ${hasRating ? 'text-amber-400' : 'text-gray-400'}`}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          hasRating && i < Math.floor(product.rating ?? 0)
                            ? 'fill-current'
                            : 'text-gray-200 dark:text-gray-700'
                        }`}
                      />
                    ))}
                    <span className="text-gray-700 dark:text-gray-300 mr-2 text-xs font-bold">
                      {hasRating
                        ? `${toPersianDigits(product.rating ?? 0)} از ۵ (${toPersianDigits(product.reviewsCount || 0)} نظر)`
                        : 'بدون نظر (اولین نظر را ثبت کنید)'}
                    </span>
                  </div>

                  {product.sku && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mr-auto">
                      کد کالا: <span className="text-gray-800 dark:text-gray-200 font-mono font-bold">{product.sku}</span>
                    </div>
                  )}
                </div>

                {/* Price & Stock Status Box */}
                <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-3xl p-6 mb-8 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">
                        قیمت نهایی مصرف‌کننده:
                      </span>
                      {product.originalPrice && product.discount && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-gray-400 dark:text-gray-500 text-sm line-through font-medium">
                            {formatPrice(product.originalPrice)}
                          </span>
                          <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                            سود شما: {formatPrice(product.originalPrice - product.price)}
                          </span>
                        </div>
                      )}
                      <div className="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
                        {formatPrice(product.price)}
                      </div>
                    </div>

                    {/* Stock Status Indicator */}
                    <div className="text-right sm:text-left">
                      {outOfStock ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-extrabold border border-rose-200 dark:border-rose-900/50">
                          <AlertCircle className="h-4 w-4" /> ناموجود در انبار
                        </span>
                      ) : lowStock ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-extrabold border border-amber-200 dark:border-amber-900/50">
                          <AlertCircle className="h-4 w-4" /> تنها {toPersianDigits(stock)} عدد در انبار باقیست
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold border border-emerald-200 dark:border-emerald-900/50">
                          <PackageCheck className="h-4 w-4" /> موجود و آماده ارسال
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Features Badges */}
                {product.features && product.features.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">ویژگی‌های برجسته:</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.features.map((feat: string, idx: number) => (
                        <span
                          key={idx}
                          className="bg-orange-50/70 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-orange-100/80 dark:border-orange-900/40 flex items-center gap-1.5"
                        >
                          <Zap className="h-3.5 w-3.5 text-orange-500" />
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div ref={actionsRef} className="pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className={`flex-1 font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-98 text-sm sm:text-base ${
                    outOfStock
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                      : addedToCart
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-orange-500/25'
                  }`}
                >
                  {outOfStock ? (
                    'اطلاع به محض موجود شدن'
                  ) : addedToCart ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      به سبد افزوده شد!
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
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                    inWishlist
                      ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                      : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => toggleCompare(product)}
                  title={inCompare ? 'حذف از مقایسه' : 'افزودن به مقایسه'}
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                    inCompare
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
                      : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <ArrowLeftRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section (Description, Specs, Reviews) */}
        <div className="bg-[var(--color-surface-light)]/85 dark:bg-[var(--color-surface-dark)]/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <div className="flex gap-4 sm:gap-8 border-b border-gray-200 dark:border-[var(--color-border-dark)] mb-8 overflow-x-auto pb-px">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-4 font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap relative ${
                activeTab === 'description'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400 font-black'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              توضیحات و نقد تخصصی
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-4 font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap relative ${
                activeTab === 'specs'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400 font-black'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              مشخصات فنی و ویژگی‌ها
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap relative ${
                activeTab === 'reviews'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400 font-black'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              نظرات کاربران ({toPersianDigits(product.reviewsCount || 0)})
            </button>
          </div>

          {activeTab === 'description' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-gray-700 dark:text-gray-200 leading-loose text-sm sm:text-base font-normal space-y-4 max-w-4xl"
            >
              {product.description ? (
                product.description.split('\n\n').map((paragraph: string, i: number) => (
                  <p key={i} className="leading-relaxed sm:leading-loose">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  توضیحاتی برای این محصول ثبت نشده است.
                </p>
              )}
            </motion.div>
          )}

          {activeTab === 'specs' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl"
            >
              <div className="bg-gray-50/60 dark:bg-gray-800/30 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] overflow-hidden">
                <dl className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs sm:text-sm">
                  <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex justify-between">
                    <dt className="font-bold text-gray-500 dark:text-gray-400">نام تجاری / برند</dt>
                    <dd className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2 flex items-center gap-2">
                      <span>{product.brand}</span>
                      <BrandLogo name={product.brand} size="sm" />
                    </dd>
                  </div>
                  <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex justify-between">
                    <dt className="font-bold text-gray-500 dark:text-gray-400">دسته‌بندی اصلی</dt>
                    <dd className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2">{product.category}</dd>
                  </div>
                  {product.sku && (
                    <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex justify-between">
                      <dt className="font-bold text-gray-500 dark:text-gray-400">شناسه اختصاصی (SKU)</dt>
                      <dd className="font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2">{product.sku}</dd>
                    </div>
                  )}
                  {product.warranty && (
                    <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex justify-between">
                      <dt className="font-bold text-gray-500 dark:text-gray-400">گارانتی و خدمات</dt>
                      <dd className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        {product.warranty}
                      </dd>
                    </div>
                  )}
                  {product.features && product.features.length > 0 && (
                    <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex flex-col gap-2">
                      <dt className="font-bold text-gray-500 dark:text-gray-400">سایر مشخصات و ویژگی‌ها</dt>
                      <dd className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2 space-y-1.5">
                        {product.features.map((feat: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </motion.div>
          )}

          {activeTab === 'reviews' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ProductReviews
                productId={product.id}
                initialRating={product.rating || 0}
                initialReviewsCount={product.reviewsCount || 0}
              />
            </motion.div>
          )}
        </div>

        {/* Recently Viewed Carousel */}
        <RecentlyViewed currentProductId={product.id} />
      </motion.div>

      {/* ── Image Lightbox Modal ── */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-6 left-6 text-white/80 hover:text-white bg-[var(--color-surface-light)]/10 p-2.5 rounded-full backdrop-blur-md transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={galleryImages[selectedImageIndex] || product.image}
              alt={product.title}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky Mobile Action Bar ── */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-safe"
          >
            <div className="mx-3 mb-[76px]">
              <div className="bg-[var(--color-surface-light)]/95 dark:bg-[var(--color-surface-dark)]/95 backdrop-blur-2xl rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-2xl p-3 flex items-center gap-3 text-right">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-[var(--color-border-light)] dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate font-bold leading-tight">
                      {product.title}
                    </p>
                    <p className="text-sm font-black text-orange-600 dark:text-orange-400 leading-tight mt-1">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors active:scale-95 ${
                      inWishlist
                        ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50'
                        : 'text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={outOfStock}
                    className={`h-11 px-4 sm:px-5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md ${
                      outOfStock
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : addedToCart
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20'
                    }`}
                  >
                    {outOfStock ? (
                      'ناموجود'
                    ) : addedToCart ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        اضافه شد
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        افزودن
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
