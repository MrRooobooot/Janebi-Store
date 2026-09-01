import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShieldCheck, Plus, Minus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '../../types';
import { MAX_CART_QUANTITY } from '../../lib/constants';
import { formatPrice, toPersianDigits } from '../../lib/utils';
import { useReducedMotion } from 'motion/react';

interface CartItemListProps {
  cart: CartItem[];
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, qty: number) => void;
  clearCart: () => void;
}

export default function CartItemList({
  cart,
  removeFromCart,
  updateQuantity,
  clearCart,
}: CartItemListProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-lg font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
          <span>اقلام سبد خرید</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
            {toPersianDigits(cart.length)} قلم کالا
          </span>
        </h2>
        <button
          onClick={clearCart}
          aria-label="پاک کردن تمام اقلام سبد خرید"
          className="min-touch-target text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition-colors active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
          پاک کردن سبد
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {cart.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={shouldReduceMotion ? false : { opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -60, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:border-orange-200 dark:hover:border-gray-700 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 group"
          >
            {/* Product Info */}
            <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
              <Link to={`/products/${item.id}`} className="shrink-0 group/img">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-800/20 p-2.5 border border-[var(--color-border-light)] dark:border-gray-700/60 overflow-hidden group-hover/img:scale-105 transition-transform duration-300 flex items-center justify-center">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </Link>

              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {item.brand}
                  </span>
                  {item.category && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                      {item.category}
                    </span>
                  )}
                </div>

                <Link
                  to={`/products/${item.id}`}
                  className="font-bold text-sm sm:text-base text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-2 leading-snug"
                >
                  {item.title}
                </Link>

                {item.warranty && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{item.warranty}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Controls & Price */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] gap-4">
              <div className="flex items-center gap-2.5 bg-gray-50/80 dark:bg-gray-800/60 p-1.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= MAX_CART_QUANTITY}
                  aria-label={`افزایش تعداد ${item.title}`}
                  className="min-touch-target w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-[var(--color-surface-light)] dark:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold shadow-xs hover:bg-primary-400 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="font-black text-sm w-7 text-center text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] font-mono">
                  {toPersianDigits(item.quantity)}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  aria-label={`کاهش تعداد ${item.title}`}
                  className="min-touch-target w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-[var(--color-surface-light)] dark:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold shadow-xs hover:bg-primary-400 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>

              <div className="text-right">
                <div className="font-black text-base sm:text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                  {formatPrice(item.price * item.quantity)}
                </div>
                {item.quantity > 1 && (
                  <div className="text-[11px] text-gray-400 font-medium">
                    هر عدد {formatPrice(item.price)}
                  </div>
                )}
              </div>

              <button
                onClick={() => removeFromCart(item.id)}
                aria-label={`حذف ${item.title} از سبد خرید`}
                className="min-touch-target text-gray-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
