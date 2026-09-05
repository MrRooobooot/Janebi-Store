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
import PictureImage from '../components/PictureImage';
import BrandLogo from '../components/BrandLogo';
import ProductReviews from '../components/ProductReviews';
import { buildProductJsonLd } from '../lib/productJsonLd';
import RelatedProducts from '../components/RelatedProducts';
import RecentlyViewed from '../components/RecentlyViewed';
import { addRecentlyViewed } from '../lib/recentlyViewed';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { formatPrice, toPersianDigits } from '../lib/utils';
import { STORE_SETTINGS_DEFAULTS } from '../lib/constants';

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

        // Dynamic Product JSON-LD Schema for AI Crawlers and Search Engines —
        // shared honesty-gated builder (src/lib/productJsonLd.ts). Server
        // prerender emits the identical payload for raw-HTML crawlers.
        const existingScript = document.getElementById('product-schema-jsonld');
        if (existingScript) existingScript.remove();

        const jsonLd = buildProductJsonLd(data, 'https://janebiarena.ir', window.location.href);
        if (jsonLd) {
          const schemaScript = document.createElement('script');
          schemaScript.id = 'product-schema-jsonld';
          schemaScript.type = 'application/ld+json';
          schemaScript.text = JSON.stringify(jsonLd)
            // Escape '<' so a product title/description containing '</script'
            // (or any '<') cannot break out of the inline JSON-LD script tag.
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026');
          document.head.appendChild(schemaScript);
        }
      })
      .catch(() => {
        setProduct(null);
        setLoading(false);
      });
  }, [id]);

  // Handle Escape key and body scroll lock for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isLightboxOpen]);

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
        title: product?.title || STORE_SETTINGS_DEFAULTS.storeName,
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

  const galleryImages = product.images?.length
    ? product.images
    : product.image
    ? [product.image]
    : [];
  const hasGallery = galleryImages.length > 1;

  const handleThumbKeyNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' ? -1 : 1; // RTL: left = previous
    const next = (selectedImageIndex + dir + galleryImages.length) % galleryImages.length;
    setSelectedImageIndex(next);
    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-thumb]');
    btns[next]?.focus();
  };
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
                className="aspect-square bg-gradient-to-br from-[var(--color-canvas-light)] to-[var(--color-canvas-light)]/70 dark:from-white/[0.05] dark:to-white/[0.02] backdrop-blur-md rounded-3xl flex items-center justify-center p-8 mb-4 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] relative overflow-hidden group shadow-inner"
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
                  className="absolute top-5 left-5 w-10 h-10 rounded-xl bg-[var(--color-surface-light)]/80 dark:bg-white/[0.08] backdrop-blur-md border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-gray-700 dark:text-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-10 shadow-sm"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={galleryImages[selectedImageIndex] || product.image}
                    initial={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.985 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <PictureImage
                      src={galleryImages[selectedImageIndex] || product.image}
                      alt={product.title}
                      priority={selectedImageIndex === 0}
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                      onClick={() => setIsLightboxOpen(true)}
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* Thumbnails */}
              {hasGallery && (
                <div
                  role="group"
                  aria-label="تصاویر محصول"
                  onKeyDown={handleThumbKeyNav}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                >
                  {galleryImages.map((img, idx) => {
                    const isActive = selectedImageIndex === idx;
                    return (
                      <button
                        key={idx}
                        data-thumb
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        onMouseEnter={() => setSelectedImageIndex(idx)}
                        onFocus={() => setSelectedImageIndex(idx)}
                        aria-label={`نمایش تصویر ${toPersianDigits(idx + 1)} از ${toPersianDigits(galleryImages.length)}`}
                        aria-current={isActive ? 'true' : undefined}
                        aria-pressed={isActive}
                        className={`w-20 h-20 sm:w-[72px] sm:h-[72px] min-w-[44px] min-h-[44px] bg-[var(--color-surface-card-light)] dark:bg-white/[0.04] backdrop-blur-md rounded-2xl border-2 p-2 shrink-0 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 ${
                          isActive
                            ? 'border-primary-300 ring-2 ring-primary-300/60 shadow-[var(--shadow-glow-orange)] scale-105 opacity-100'
                            : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] opacity-60 hover:opacity-100 hover:border-primary-200 dark:hover:border-primary-300/50'
                        }`}
                      >
                        <img src={img} alt={`تصویر ${toPersianDigits(idx + 1)} ${product.title}`} width="96" height="96" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Trust Badges - Desktop view */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/60">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--color-canvas-light)]/70 dark:bg-white/[0.035] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/50">
                  <Award className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="text-right">
                    <p className="text-xs font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">ضمانت ۱۰۰٪ اصالت</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">کالای اورجینال و شرکتی</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--color-canvas-light)]/70 dark:bg-white/[0.035] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/50">
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
                    aria-label="اشتراک‌گذاری محصول"
                    className="w-11 h-11 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[var(--color-canvas-light)] dark:hover:bg-white/[0.06] transition-colors flex items-center justify-center"
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
                <div className="bg-[var(--color-canvas-light)]/80 dark:bg-white/[0.045] rounded-3xl p-6 mb-8 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80">
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
                  aria-label={inWishlist ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                    inWishlist
                      ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                      : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-[var(--color-canvas-light)] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => toggleCompare(product)}
                  aria-label={inCompare ? 'حذف از مقایسه' : 'افزودن به مقایسه'}
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                    inCompare
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
                      : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-[var(--color-canvas-light)] dark:hover:bg-white/[0.06]'
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
              <div className="bg-[var(--color-canvas-light)]/70 dark:bg-white/[0.035] rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] overflow-hidden">
                <dl className="divide-y divide-[var(--color-border-subtle-light)] dark:divide-[var(--color-border-dark)] text-xs sm:text-sm">
                  <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex justify-between even:bg-[var(--color-canvas-light)]/60 dark:even:bg-white/[0.035] transition-colors">
                    <dt className="font-bold text-gray-500 dark:text-gray-400">نام تجاری / برند</dt>
                    <dd className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2 flex items-center gap-2">
                      <span>{product.brand}</span>
                      <BrandLogo name={product.brand} size="sm" />
                    </dd>
                  </div>
                  <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex justify-between even:bg-[var(--color-canvas-light)]/60 dark:even:bg-white/[0.035] transition-colors">
                    <dt className="font-bold text-gray-500 dark:text-gray-400">دسته‌بندی اصلی</dt>
                    <dd className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2">{product.category}</dd>
                  </div>
                  {product.sku && (
                    <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex justify-between even:bg-[var(--color-canvas-light)]/60 dark:even:bg-white/[0.035] transition-colors">
                      <dt className="font-bold text-gray-500 dark:text-gray-400">شناسه اختصاصی (SKU)</dt>
                      <dd className="font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2">{product.sku}</dd>
                    </div>
                  )}
                  {product.warranty && (
                    <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex justify-between even:bg-[var(--color-canvas-light)]/60 dark:even:bg-white/[0.035] transition-colors">
                      <dt className="font-bold text-gray-500 dark:text-gray-400">گارانتی و خدمات</dt>
                      <dd className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:col-span-2 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        {product.warranty}
                      </dd>
                    </div>
                  )}
                  {product.features && product.features.length > 0 && (
                    <div className="p-4 sm:grid sm:grid-cols-3 sm:gap-4 flex flex-col gap-2 even:bg-[var(--color-canvas-light)]/60 dark:even:bg-white/[0.035] transition-colors">
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
                initialReviewsCount={product.reviewsCount || 0}
              />
            </motion.div>
          )}
        </div>

        {/* Related Products — same-category internal linking */}
        <RelatedProducts product={product} />

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
              aria-label="بستن نمایش تصویر"
              className="absolute top-6 left-6 w-11 h-11 flex items-center justify-center text-white/80 hover:text-white bg-[var(--color-surface-light)]/10 rounded-full backdrop-blur-md transition-colors"
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
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-safe pointer-events-none"
          >
            <div className="mx-3 mb-[76px] pointer-events-auto">
              <div className="bg-[var(--color-surface-light)]/95 dark:bg-[var(--color-surface-dark)]/95 backdrop-blur-2xl rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-2xl p-3 flex items-center gap-3 text-right">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-canvas-light)] dark:bg-white/[0.045] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      width="40"
                      height="40"
                      loading="lazy"
                      decoding="async"
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
                        : 'text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-[var(--color-canvas-light)] dark:hover:bg-white/[0.06]'
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
      {/* ── Sticky Desktop Buy-Box ── */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-0 right-0 z-40 hidden lg:flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-6 bg-[var(--color-surface-light)]/95 dark:bg-[var(--color-surface-dark)]/95 backdrop-blur-2xl rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-2xl px-6 py-3.5 w-full max-w-3xl mx-6">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold truncate leading-tight">
                  {product.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg font-black text-orange-600 dark:text-orange-400 tracking-tight leading-none">
                    {formatPrice(product.price)}
                  </span>
                  {product.discount && product.originalPrice && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 line-through font-medium leading-none">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-extrabold px-2 py-1 rounded-full leading-none ${
                      outOfStock
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {outOfStock ? 'ناموجود' : 'موجود در انبار'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => toggleWishlist(product)}
                  aria-label={inWishlist ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors active:scale-95 ${
                    inWishlist
                      ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                      : 'text-gray-400 border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:bg-[var(--color-canvas-light)] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => toggleCompare(product)}
                  aria-label={inCompare ? 'حذف از مقایسه' : 'افزودن به مقایسه'}
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors active:scale-95 ${
                    inCompare
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
                      : 'text-gray-400 border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:bg-[var(--color-canvas-light)] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <ArrowLeftRight className="h-5 w-5" />
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className={`h-11 px-6 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                    outOfStock
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                      : addedToCart
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                      : 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-orange-600/25'
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
                      افزودن به سبد خرید
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
