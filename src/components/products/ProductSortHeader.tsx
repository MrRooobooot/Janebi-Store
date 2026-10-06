import React from 'react';
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { formatPrice, toPersianDigits } from '../../lib/utils';

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
  setSearchParams: (next: (prev: URLSearchParams) => URLSearchParams) => void;
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
  setSearchParams,
}: ProductSortHeaderProps) {
  const categoryActive = selectedCategory !== 'همه';
  const hasMin = minPrice !== '';
  const hasMax = maxPrice !== '';
  const priceLabel = hasMin && hasMax
    ? `${formatPrice(minPrice)} تا ${formatPrice(maxPrice)}`
    : hasMin
      ? `از ${formatPrice(minPrice)}`
      : hasMax
        ? `تا ${formatPrice(maxPrice)}`
        : '';
  const chips = [
    categoryActive
      ? { key: 'category', label: selectedCategory, aria: `حذف فیلتر دسته‌بندی ${selectedCategory}`, clear: () => {
          setSelectedCategory('همه');
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('category');
            return next;
          });
        } }
      : null,
    ...selectedBrands.map((brand) => ({
      key: `brand-${brand}`,
      label: brand,
      aria: `حذف فیلتر برند ${brand}`,
      clear: () => toggleBrand(brand),
    })),
    priceLabel
      ? { key: 'price', label: priceLabel, aria: 'حذف فیلتر محدوده قیمت', clear: () => { setMinPrice(''); setMaxPrice(''); } }
      : null,
    onlyDiscounted
      ? { key: 'discount', label: 'فقط تخفیف‌دار', aria: 'حذف فیلتر فقط تخفیف‌دار', clear: () => setOnlyDiscounted(false) }
      : null,
    onlyInStock
      ? { key: 'stock', label: 'فقط موجود', aria: 'حذف فیلتر فقط موجود', clear: () => setOnlyInStock(false) }
      : null,
    inPageQuery.trim()
      ? { key: 'query', label: `جستجو: ${inPageQuery}`, aria: 'حذف جستجو', clear: () => setInPageQuery('') }
      : null,
  ].filter((chip): chip is { key: string; label: string; aria: string; clear: () => void } => chip !== null);

  return (
    <div className="sticky top-[5.5rem] sm:top-20 z-20 bg-[var(--color-surface-light)]/95 dark:bg-[var(--color-surface-dark)]/95 backdrop-blur-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4 transition-all">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      {/* Mobile filter toggle & item counts */}
      <div className="flex items-center justify-between sm:justify-start gap-4">
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="lg:hidden flex items-center gap-2 min-h-11 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] px-4 py-2.5 rounded-xl text-[13px] font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4 text-[var(--color-emphasis-text)]" />
          <span>فیلترها</span>
          {activeFiltersCount > 0 && (
            <span className="bg-[var(--color-cta)] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
          {filteredCount === totalCount ? (
            <span>مجموعاً <span className="text-[var(--color-emphasis-text)] font-bold">{toPersianDigits(totalCount)}</span> کالا</span>
          ) : (
            <span>نمایش <span className="text-[var(--color-emphasis-text)] font-bold">{toPersianDigits(filteredCount)}</span> از {toPersianDigits(totalCount)} کالا</span>
          )}
        </div>
      </div>

      {/* Sorting Dropdown */}
      <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap hidden sm:inline">
          مرتب‌سازی:
        </span>
        <div className="relative w-full sm:w-48">
          <select
            id="sort-select"
            name="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="ترتیب نمایش محصولات"
            className="w-full appearance-none bg-white dark:bg-[var(--color-surface-dark)] border border-slate-200/90 dark:border-white/[0.08] rounded-xl min-h-11 py-2.5 px-4 pr-3 pl-9 text-[13px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-cta)]/50 transition-all cursor-pointer shadow-xs"
          >
            <option value="default">جدیدترین</option>
            <option value="price-asc">ارزان‌ترین</option>
            <option value="price-desc">گران‌ترین</option>
            <option value="discount-desc">بیشترین تخفیف</option>
            <option value="rating-desc">بالاترین امتیاز</option>
            <option value="reviews-desc">بیشترین نظرات</option>
          </select>
          <ChevronDown className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              aria-label={chip.aria}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--color-cta)]/10 px-3 py-1 text-xs font-bold text-[var(--color-cta)] transition-colors hover:bg-[var(--color-cta)]/20 cursor-pointer"
            >
              <span>{chip.label}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
