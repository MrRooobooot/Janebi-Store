import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Trash2, ArrowLeft, Plus, Minus, Sparkles, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { formatPrice, toPersianDigits } from '../../lib/utils';
import { FREE_SHIPPING_THRESHOLD, MAX_CART_QUANTITY } from '../../lib/constants';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD;
  const amountLeft = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const progressPercent = Math.min(100, Math.round((cartTotal / FREE_SHIPPING_THRESHOLD) * 100));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Slide Position (Left side in Persian RTL for clean slide-over) */}
          <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
            <motion.div
              ref={drawerRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-screen max-w-md bg-[var(--color-surface-light)] dark:bg-[#0c1017] text-zinc-900 dark:text-zinc-100 shadow-2xl border-r border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 id="cart-drawer-title" className="font-black text-base">سبد خرید شما</h2>
                    <p aria-live="polite" className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                      {toPersianDigits(cartCount)} کالا در سبد
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  aria-label="بستن سبد خرید"
                  className="min-touch-target p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Free Shipping Progress Bar */}
              <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  {isFreeShipping ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      ارسال رایگان فعال شد!
                    </span>
                  ) : (
                    <span className="text-zinc-600 dark:text-zinc-400">
                      تنها <strong className="text-orange-600 dark:text-orange-400 font-black">{formatPrice(amountLeft)}</strong> تا ارسال رایگان
                    </span>
                  )}
                  <span className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
                    {toPersianDigits(progressPercent)}٪
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFreeShipping ? 'bg-emerald-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Cart Items Scrollable List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-zinc-800 dark:text-zinc-200">سبد خرید خالی است</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
                        محصولات مورد علاقه خود را انتخاب کنید و به سبد خرید اضافه نمایید.
                      </p>
                    </div>
                    <button
                      onClick={() => { onClose(); navigate('/products'); }}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      مشاهده کاتالوگ محصولات
                    </button>
                  </div>
                ) : (
                  cart.map((item) => {
                    const hasDiscount = typeof item.originalPrice === 'number' && item.originalPrice > item.price;
                    const discountTotal = hasDiscount ? ((item.originalPrice as number) - item.price) * item.quantity : 0;

                    return (
                      <div key={item.id} className="pt-3.5 first:pt-0 flex items-center gap-3.5 group">
                        <div className="w-16 h-16 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-1.5 border border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center justify-center">
                          <img src={item.image} alt={item.title} width="56" height="56" loading="lazy" decoding="async" className="max-w-full max-h-full object-contain" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs line-clamp-1 text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 transition-colors">
                            {item.title}
                          </h4>

                          {/* Price & Savings Display */}
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs font-black text-orange-600 dark:text-orange-400 font-mono">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                            {hasDiscount && (
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through">
                                {formatPrice((item.originalPrice as number) * item.quantity)}
                              </span>
                            )}
                          </div>

                          {hasDiscount && discountTotal > 0 && (
                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-black">
                              <Percent className="h-2.5 w-2.5" />
                              <span>سود شما: {formatPrice(discountTotal)}</span>
                            </div>
                          )}

                          {/* Quantity & Delete Controls */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= MAX_CART_QUANTITY}
                                className="min-touch-target w-9 h-9 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-orange-600 disabled:opacity-30 cursor-pointer rounded-lg transition-colors"
                                aria-label="افزایش تعداد"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <span className="font-mono text-xs font-bold w-4 text-center">
                                {toPersianDigits(item.quantity)}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="min-touch-target w-9 h-9 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-orange-600 disabled:opacity-30 cursor-pointer rounded-lg transition-colors"
                                aria-label="کاهش تعداد"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="min-touch-target text-zinc-400 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="حذف از سبد"
                              aria-label="حذف این کالا"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">مجموع کل قابل پرداخت:</span>
                    <span aria-live="polite" className="text-base font-black text-orange-600 dark:text-orange-400 font-mono">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => { onClose(); navigate('/cart'); }}
                      className="w-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      مشاهده سبد خرید
                    </button>
                    <button
                      onClick={() => { onClose(); navigate('/checkout'); }}
                      className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-3 rounded-xl text-xs shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>تکمیل و پرداخت</span>
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
