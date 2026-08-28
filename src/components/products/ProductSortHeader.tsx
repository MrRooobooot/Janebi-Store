import React from 'react';
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

interface ProductSortHeaderProps {
  filteredCount: number;
  totalCount: number;
  sortBy: string;
  setSortBy: (sort: string) => void;
  activeFiltersCount: number;
  setMobileFilterOpen: (open: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedBrands: string[];
  toggleBrand: (brand: string) => void;
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
}

export default function ProductSortHeader({
  filteredCount,
  totalCount,
  sortBy,
  setSortBy,
  activeFiltersCount,
  setMobileFilterOpen,
  selectedCategory,
  setSelectedCategory,
  selectedBrands,
  toggleBrand,
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
}: ProductSortHeaderProps) {
  return (
    <div className="sticky top-20 z-20 bg-[var(--color-surface-light)]/95 dark:bg-[var(--color-surface-dark)]/95 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-all">
      {/* Mobile filter toggle & item counts */}
      <div className="flex items-center justify-between sm:justify-start gap-4">
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="lg:hidden flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-200 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4 text-orange-500" />
          <span>فیلترها</span>
          {activeFiltersCount > 0 && (
            <span className="bg-orange-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <div className="text-xs font-bold text-gray-600 dark:text-gray-400">
          نمایش <span className="text-orange-600 dark:text-orange-400 font-black">{toPersianDigits(filteredCount)}</span> محصول از {toPersianDigits(totalCount)}
        </div>
      </div>

      {/* Sorting Dropdown */}
      <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
        <span className="text-xs font-bold text-gray-500 whitespace-nowrap hidden sm:inline">
          مرتب‌سازی:
        </span>
        <div className="relative w-full sm:w-48">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full appearance-none bg-gray-50 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 rounded-2xl py-2.5 px-4 pr-3 pl-9 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
          >
            <option value="default">پیش‌فرض (محبوب‌ترین)</option>
            <option value="price-asc">ارزان‌ترین</option>
            <option value="price-desc">گران‌ترین</option>
            <option value="discount-desc">بیشترین تخفیف</option>
            <option value="rating-desc">بالاترین امتیاز</option>
            <option value="reviews-desc">بیشترین نظرات</option>
          </select>
          <ChevronDown className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
