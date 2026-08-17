import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompare } from '../contexts/CompareContext';
import { useCart } from '../contexts/CartContext';
import { Trash2, ShoppingCart, Check, X, ShieldCheck, Tag, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmptyState from '../components/EmptyState';
import { formatPrice, toPersianDigits } from '../lib/utils';

export default function Compare() {
  const { compareItems, toggleCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  if (compareItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <EmptyState
          icon={<div className="text-5xl md:text-6xl mb-4 drop-shadow-md">⚖️</div>}
          title="لیست مقایسه خالی است!"
          description="شما هنوز محصولی را برای مقایسه انتخاب نکرده‌اید. با افزودن محصولات به لیست مقایسه می‌توانید راحت‌تر تصمیم‌گیری کنید."
          actionText="مشاهده محصولات"
          actionLink="/products"
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl p-12 shadow-xs border border-gray-100 dark:border-gray-800 text-center"
        />
      </motion.div>
    );
  }

  // Gather all unique features across compared items
  const allFeatures = Array.from(new Set(compareItems.flatMap((item) => item.features || [])));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="text-right"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <span className="relative">
            مقایسه محصولات
            <span className="absolute bottom-1 left-0 right-0 h-3 bg-orange-200/50 dark:bg-orange-500/20 -z-10 rounded-sm"></span>
          </span>
          <span className="text-xs font-extrabold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900/50">
            {toPersianDigits(compareItems.length)} کالا
          </span>
        </h1>
        <button
          onClick={clearCompare}
          className="text-red-500 hover:text-red-600 dark:text-red-400 flex items-center gap-2 text-xs sm:text-sm font-bold bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-4 py-2.5 rounded-2xl transition-colors border border-red-100 dark:border-red-900/40"
        >
          <Trash2 className="h-4 w-4" /> پاک کردن کامل لیست
        </button>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xs transition-colors">
        <div className="overflow-x-auto custom-scrollbar pb-2">
          <table className="w-full min-w-[900px] text-right border-collapse">
            <thead>
              <tr>
                <th className="p-6 border-b border-l border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30 w-1/4 align-top">
                  <div className="text-gray-900 dark:text-gray-100 font-black text-lg mb-2">
                    مشخصات کالاها
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    ویژگی‌های محصولات را در این جدول با یکدیگر مقایسه کنید.
                  </p>
                </th>

                <AnimatePresence>
                  {compareItems.map((item) => (
                    <motion.th
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={item.id}
                      className="p-6 border-b border-l border-gray-100 dark:border-gray-800/60 w-1/4 relative align-top group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <button
                        onClick={() => toggleCompare(item)}
                        className="absolute top-4 left-4 text-gray-400 hover:text-white bg-white dark:bg-gray-800 hover:bg-red-500 dark:hover:bg-red-500 rounded-xl p-1.5 border border-gray-200 dark:border-gray-700 hover:border-red-500 transition-all shadow-xs z-10 opacity-80 group-hover:opacity-100"
                        title="حذف از مقایسه"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="flex flex-col items-center text-center">
                        <Link
                          to={`/products/${item.id}`}
                          className="w-32 h-32 mb-4 bg-white dark:bg-gray-800 rounded-2xl p-2 flex items-center justify-center border border-gray-100 dark:border-gray-700 group-hover:border-orange-200 dark:group-hover:border-orange-800/50 transition-colors"
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>

                        <Link
                          to={`/products/${item.id}`}
                          className="font-bold text-gray-900 dark:text-gray-100 hover:text-orange-600 dark:hover:text-orange-400 line-clamp-2 mb-3 text-xs sm:text-sm transition-colors h-10 leading-snug"
                        >
                          {item.title}
                        </Link>

                        <div className="text-orange-600 dark:text-orange-400 font-black text-base mb-4 bg-orange-50 dark:bg-orange-500/10 px-3 py-1 rounded-xl">
                          {formatPrice(item.price)}
                        </div>

                        <button
                          onClick={() => addToCart(item)}
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md active:scale-95"
                        >
                          <ShoppingCart className="h-4 w-4" /> افزودن به سبد
                        </button>
                      </div>
                    </motion.th>
                  ))}
                </AnimatePresence>

                {/* Fill empty slots if less than 3 */}
                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                  <th
                    key={`empty-${idx}`}
                    className="p-6 border-b border-l border-gray-100 dark:border-gray-800/60 bg-gray-50/30 dark:bg-gray-900/30 w-1/4 align-middle"
                  >
                    <div
                      className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 h-full min-h-[250px] border-2 border-dashed border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                      onClick={() => navigate('/products')}
                    >
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <span className="text-2xl font-light text-gray-400">+</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold mb-1">افزودن کالا</span>
                      <span className="text-[11px] font-medium text-gray-400">جهت مقایسه</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="p-4 font-bold text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/30 border-l border-gray-100 dark:border-gray-800/60 w-1/4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-orange-500" /> برند سازنده
                  </div>
                </td>
                {compareItems.map((item) => (
                  <td
                    key={item.id}
                    className="p-4 text-gray-700 dark:text-gray-200 border-l border-gray-100 dark:border-gray-800/60 text-center font-bold text-xs sm:text-sm"
                  >
                    {item.brand}
                  </td>
                ))}
                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                  <td
                    key={`empty-brand-${idx}`}
                    className="p-4 border-l border-gray-100 dark:border-gray-800/60 text-center text-gray-300 dark:text-gray-700"
                  >
                    -
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="p-4 font-bold text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/30 border-l border-gray-100 dark:border-gray-800/60 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-orange-500" /> دسته‌بندی
                  </div>
                </td>
                {compareItems.map((item) => (
                  <td
                    key={item.id}
                    className="p-4 text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-800/60 text-center font-medium bg-gray-50/30 dark:bg-gray-800/10"
                  >
                    <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-bold">
                      {item.category}
                    </span>
                  </td>
                ))}
                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                  <td
                    key={`empty-cat-${idx}`}
                    className="p-4 border-l border-gray-100 dark:border-gray-800/60 text-center text-gray-300 dark:text-gray-700"
                  >
                    -
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="p-4 font-bold text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/30 border-l border-gray-100 dark:border-gray-800/60 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> گارانتی
                  </div>
                </td>
                {compareItems.map((item) => (
                  <td
                    key={item.id}
                    className="p-4 text-gray-700 dark:text-gray-200 border-l border-gray-100 dark:border-gray-800/60 text-center font-medium text-xs sm:text-sm"
                  >
                    {item.warranty ? (
                      <div className="flex items-center justify-center gap-1.5 font-bold">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" /> {item.warranty}
                      </div>
                    ) : (
                      <span className="text-gray-400">ندارد</span>
                    )}
                  </td>
                ))}
                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                  <td
                    key={`empty-war-${idx}`}
                    className="p-4 border-l border-gray-100 dark:border-gray-800/60 text-center text-gray-300 dark:text-gray-700"
                  >
                    -
                  </td>
                ))}
              </tr>
              {/* Render unique features row by row */}
              {allFeatures.map((feature) => (
                <tr
                  key={feature}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="p-4 font-bold text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/30 border-l border-gray-100 dark:border-gray-800/60 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></div> {feature}
                    </div>
                  </td>
                  {compareItems.map((item) => (
                    <td
                      key={item.id}
                      className="p-4 border-l border-gray-100 dark:border-gray-800/60 text-center align-middle"
                    >
                      {item.features?.includes(feature) ? (
                        <div className="flex justify-center">
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                            <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 stroke-[3]" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700 font-bold text-lg">-</span>
                      )}
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                    <td
                      key={`empty-feat-${idx}`}
                      className="p-4 border-l border-gray-100 dark:border-gray-800/60 text-center text-gray-300 dark:text-gray-700"
                    >
                      -
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
