import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Tag, Sparkles, Check, DollarSign, RotateCcw, Flame, PackageCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PRICE_PRESETS, PricePreset } from '../../hooks/useProductFilters';

interface ProductFilterSidebarProps {
  productsCount: number;
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedBrands: string[];
  toggleBrand: (brand: string) => void;
  setSelectedBrands: (brands: string[]) => void;
  minPrice: number | '';
  setMinPrice: (val: number | '') => void;
  maxPrice: number | '';
  setMaxPrice: (val: number | '') => void;
  onlyDiscounted: boolean;
  setOnlyDiscounted: (val: boolean) => void;
  onlyInStock: boolean;
  setOnlyInStock: (val: boolean) => void;
  inPageQuery: string;
  setInPageQuery: (val: string) => void;
  resetAllFilters: () => void;
  activeFiltersCount: number;
  mobileFilterOpen: boolean;
  setMobileFilterOpen: (open: boolean) => void;
  setSearchParams: (params: Record<string, string>) => void;
  searchParamsCategory?: string | null;
}

export default function ProductFilterSidebar({
  productsCount,
  categories,
  brands,
  selectedCategory,
  setSelectedCategory,
  selectedBrands,
  toggleBrand,
  setSelectedBrands,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  onlyDiscounted,
  setOnlyDiscounted,
  onlyInStock,
  setOnlyInStock,
  inPageQuery,
  setInPageQuery,
  resetAllFilters,
  activeFiltersCount,
  mobileFilterOpen,
  setMobileFilterOpen,
  setSearchParams,
}: ProductFilterSidebarProps) {
  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileFilterOpen]);
  
  const renderFilterControls = () => (
    <div className="space-y-7 text-right">
      {/* Search inside filters */}
      <div className="relative group">
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
          جستجو در نتایج
        </label>
        <div className="relative">
          <input
            type="text"
            value={inPageQuery}
            onChange={(e) => setInPageQuery(e.target.value)}
            placeholder="نام، مدل یا برند..."
            className="w-full bg-[var(--color-surface-light)] dark:bg-gray-800/80 border-2 border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl py-3 px-4 pr-10 text-xs font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 dark:focus:ring-orange-500/5 transition-all shadow-xs group-hover:border-gray-200 dark:group-hover:border-gray-700"
          />
          <Search className="h-4 w-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors group-hover:text-orange-500" />
          {inPageQuery && (
            <button
              onClick={() => setInPageQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-6">
        <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-4 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
            <Tag className="h-4 w-4" />
          </div>
          دسته‌بندی‌ها
        </h4>
        <div className="space-y-1.5">
          <button
            onClick={() => {
              setSelectedCategory('همه');
              setSearchParams({});
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
              selectedCategory === 'همه'
                ? 'bg-gradient-to-l from-orange-50 to-transparent dark:from-orange-500/10 dark:to-transparent border-r-2 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-xs shadow-orange-100/50 dark:shadow-none'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/80 border-r-2 border-transparent'
            }`}
          >
            <span>همه دسته‌ها</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                selectedCategory === 'همه'
                  ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {productsCount}
            </span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => {
                setSelectedCategory(cat.name);
                setSearchParams({ category: cat.name });
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                selectedCategory === cat.name
                  ? 'bg-gradient-to-l from-orange-50 to-transparent dark:from-orange-500/10 dark:to-transparent border-r-2 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-xs shadow-orange-100/50 dark:shadow-none'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/80 border-r-2 border-transparent'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                  selectedCategory === cat.name
                    ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Brand Filter */}
      <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-6">
        <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <Sparkles className="h-4 w-4" />
            </div>
            برند
          </span>
          {selectedBrands.length > 0 && (
            <button
              onClick={() => setSelectedBrands([])}
              className="text-[11px] text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
            >
              پاک کردن
            </button>
          )}
        </h4>
        <div className="space-y-1 max-h-56 overflow-y-auto pl-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {brands.map((b) => {
            const isChecked = selectedBrands.includes(b.name);
            return (
              <label
                key={b.name}
                onClick={() => toggleBrand(b.name)}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all duration-200 ${
                  isChecked
                    ? 'bg-orange-50/80 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 font-bold shadow-xs shadow-orange-100/50 dark:shadow-none'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4.5 h-4.5 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      isChecked
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-110'
                        : 'border-2 border-gray-300 dark:border-gray-600 bg-[var(--color-surface-light)] dark:bg-gray-800'
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span>{b.name}</span>
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    isChecked ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {b.count}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-6">
        <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-4 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
            <DollarSign className="h-4 w-4" />
          </div>
          محدوده قیمت (تومان)
        </h4>

        {/* Min & Max Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="group">
            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1.5 group-focus-within:text-orange-500 transition-colors">
              از قیمت
            </label>
            <input
              type="number"
              dir="ltr"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
              placeholder="300000"
              className="w-full bg-[var(--color-surface-light)] dark:bg-gray-800/80 border-2 border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl py-2 px-3 text-xs font-mono text-left font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 dark:focus:ring-orange-500/5 transition-all shadow-xs"
            />
          </div>
          <div className="group">
            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1.5 group-focus-within:text-orange-500 transition-colors">
              تا قیمت
            </label>
            <input
              type="number"
              dir="ltr"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
              placeholder="3000000"
              className="w-full bg-[var(--color-surface-light)] dark:bg-gray-800/80 border-2 border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl py-2 px-3 text-xs font-mono text-left font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 dark:focus:ring-orange-500/5 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Quick Price Presets */}
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.slice(1).map((preset, idx) => {
            const isActive = minPrice === preset.min && maxPrice === preset.max;
            return (
              <button
                key={idx}
                onClick={() => {
                  setMinPrice(preset.min);
                  setMaxPrice(preset.max);
                }}
                className={`text-[10px] px-3 py-1.5 rounded-lg transition-all duration-200 border-2 ${
                  isActive
                    ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-md shadow-orange-500/20'
                    : 'bg-[var(--color-surface-light)] dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Toggles */}
      <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-6 space-y-4">
        {/* Discounted only toggle */}
        <label className="flex items-center justify-between cursor-pointer group bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-500/5 transition-colors border border-transparent hover:border-orange-100 dark:hover:border-orange-500/10">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>فقط کالاهای تخفیف‌دار</span>
          </span>
          <div
            role="switch"
            aria-checked={onlyDiscounted}
            tabIndex={0}
            onClick={() => setOnlyDiscounted(!onlyDiscounted)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOnlyDiscounted(!onlyDiscounted);
              }
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 shadow-inner ${
              onlyDiscounted ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <div
              className={`bg-[var(--color-surface-light)] w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                onlyDiscounted ? 'translate-x-0' : '-translate-x-5'
              }`}
            />
          </div>
        </label>

        {/* In stock toggle */}
        <label className="flex items-center justify-between cursor-pointer group bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-500/10">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-emerald-500" />
            <span>فقط کالاهای موجود</span>
          </span>
          <div
            role="switch"
            aria-checked={onlyInStock}
            tabIndex={0}
            onClick={() => setOnlyInStock(!onlyInStock)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOnlyInStock(!onlyInStock);
              }
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 shadow-inner ${
              onlyInStock ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <div
              className={`bg-[var(--color-surface-light)] w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                onlyInStock ? 'translate-x-0' : '-translate-x-5'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Reset button */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 overflow-hidden"
          >
            <button
              onClick={resetAllFilters}
              className="w-full py-3 px-4 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all group"
            >
              <RotateCcw className="h-4 w-4 group-hover:-rotate-90 transition-transform duration-300" />
              حذف همه فیلترها ({activeFiltersCount})
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {/* Desktop Filter Sidebar */}
      <aside className="hidden lg:block lg:col-span-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 shadow-xs h-fit sticky top-28">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <h3 className="font-extrabold text-base text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
            <span>فیلترهای پیشرفته</span>
          </h3>
          {activeFiltersCount > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {renderFilterControls()}
      </aside>

      {/* Mobile Drawer Filter Modal */}
      {createPortal(
        <AnimatePresence>
          {mobileFilterOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileFilterOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              />

              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full max-w-xs bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] mb-6">
                    <h3 className="font-bold text-lg text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
                      فیلتر محصولات
                    </h3>
                    <button
                      onClick={() => setMobileFilterOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {renderFilterControls()}
                </div>

                <div className="pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] mt-6 sticky bottom-0 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)]">
                  <button
                    onClick={() => setMobileFilterOpen(false)}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition-transform text-sm cursor-pointer"
                  >
                    مشاهده نتایج ({productsCount})
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
