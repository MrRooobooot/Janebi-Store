import React from 'react';
import { useProductFilters } from '../hooks/useProductFilters';
import ProductFilterSidebar from '../components/products/ProductFilterSidebar';
import ProductSortHeader from '../components/products/ProductSortHeader';
import ProductGrid from '../components/products/ProductGrid';
import { ChevronRight, ChevronLeft, Sparkles, X } from 'lucide-react';
import { useEffect } from 'react';
import { toPersianDigits } from '../lib/utils';
import { applyCatalogSeo, restoreCatalogSeo } from '../lib/catalogSeo';

export default function Products() {
  const {
    products,
    filteredProducts,
    loading,
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
    sortBy,
    setSortBy,
    inPageQuery,
    setInPageQuery,
    mobileFilterOpen,
    setMobileFilterOpen,
    resetAllFilters,
    activeFiltersCount,
    setSearchParams,
    page,
    setPage,
    totalPages,
    totalProducts,
  } = useProductFilters();

  const isCategoryFiltered = selectedCategory !== 'همه';
  const realCount = totalProducts; // real count returned by the live API — never fabricated

  const priceFiltersActive =
    (minPrice !== null && minPrice !== undefined && minPrice !== ('' as unknown as number)) ||
    (maxPrice !== null && maxPrice !== undefined && maxPrice !== ('' as unknown as number));
  const toggleFiltersActive = onlyDiscounted || onlyInStock;
  const hasActiveFilters =
    isCategoryFiltered || selectedBrands.length > 0 || priceFiltersActive || toggleFiltersActive || inPageQuery.trim() !== '';

  // Category-aware <head> SEO (title / description / CollectionPage JSON-LD).
  // Runs only on settled API data (loading=false) so meta always reflects the
  // real live catalogue, not transient loading states.
  useEffect(() => {
    if (loading) return;
    if (isCategoryFiltered) {
      applyCatalogSeo({
        title: `خرید ${selectedCategory} | جانبی آرنا`,
        description: `خرید ${selectedCategory} اورجینال در جانبی آرنا — ${toPersianDigits(realCount)} محصول موجود با ضمانت اصالت، گارانتی تعویض فیزیکی و ارسال سریع به سراسر ایران.`,
        itemCount: realCount,
        category: selectedCategory,
      });
    } else {
      restoreCatalogSeo();
    }
    return () => restoreCatalogSeo();
  }, [isCategoryFiltered, selectedCategory, realCount, loading]);

  return (
    <div className="w-full space-y-6">
      {/* Page Title Header */}
      <div className="mb-6 text-right bg-gradient-to-r from-[var(--color-cta)]/10 via-transparent to-transparent dark:from-white/[0.04] dark:via-white/[0.02] dark:to-transparent p-5 sm:p-6 rounded-3xl border border-[var(--color-cta)]/15 dark:border-white/[0.08]">
          {isCategoryFiltered ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-emphasis-text)] text-xs font-bold mb-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-emphasis-text)]" />
                <span>دسته‌بندی انتخاب‌شده</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
                خرید {selectedCategory}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {toPersianDigits(realCount)} محصول اورجینال در دسته «{selectedCategory}» با ضمانت اصالت، گارانتی تعویض فیزیکی و ارسال سریع
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-emphasis-text)] text-xs font-bold mb-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-emphasis-text)]" />
                <span>کاتالوگ کامل جانبی آرنا</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
                فروشگاه تجهیزات و لوازم جانبی اورجینال
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                بررسی، مقایسه تخصصی و خرید مستقیم انواع قاب، گلس، شارژر فست، کابل و پاوربانک با گارانتی تعویض فیزیکی
              </p>
            </>
          )}
        </div>

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Component */}
          <ProductFilterSidebar
            productsCount={products.length}
            categories={categories}
            brands={brands}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedBrands={selectedBrands}
            toggleBrand={toggleBrand}
            setSelectedBrands={setSelectedBrands}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            onlyDiscounted={onlyDiscounted}
            setOnlyDiscounted={setOnlyDiscounted}
            onlyInStock={onlyInStock}
            setOnlyInStock={setOnlyInStock}
            inPageQuery={inPageQuery}
            setInPageQuery={setInPageQuery}
            resetAllFilters={resetAllFilters}
            activeFiltersCount={activeFiltersCount}
            mobileFilterOpen={mobileFilterOpen}
            setMobileFilterOpen={setMobileFilterOpen}
            setSearchParams={setSearchParams}
          />

          {/* Main Product Area */}
          <div className="lg:col-span-9 space-y-6">
            <ProductSortHeader
              filteredCount={totalProducts}
              totalCount={totalProducts}
              sortBy={sortBy}
              setSortBy={setSortBy}
              activeFiltersCount={activeFiltersCount}
              setMobileFilterOpen={setMobileFilterOpen}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedBrands={selectedBrands}
              toggleBrand={toggleBrand}
              minPrice={minPrice}
              setMinPrice={setMinPrice}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              onlyDiscounted={onlyDiscounted}
              setOnlyDiscounted={setOnlyDiscounted}
              onlyInStock={onlyInStock}
              setOnlyInStock={setOnlyInStock}
              inPageQuery={inPageQuery}
              setInPageQuery={setInPageQuery}
            />

            {/* Active Filter Chips (P6) */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {isCategoryFiltered && (
                  <button
                    onClick={() => setSelectedCategory('همه')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-cta)] text-xs font-bold hover:bg-[var(--color-cta)]/20 transition-colors cursor-pointer"
                    aria-label={`حذف فیلتر دسته‌بندی ${selectedCategory}`}
                  >
                    <span>{selectedCategory}</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {selectedBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => toggleBrand(brand)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-cta)] text-xs font-bold hover:bg-[var(--color-cta)]/20 transition-colors cursor-pointer"
                    aria-label={`حذف فیلتر برند ${brand}`}
                  >
                    <span>{brand}</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
                {priceFiltersActive && (
                  <button
                    onClick={() => {
                      setMinPrice('');
                      setMaxPrice('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-cta)] text-xs font-bold hover:bg-[var(--color-cta)]/20 transition-colors cursor-pointer"
                    aria-label="حذف فیلتر محدوده قیمت"
                  >
                    <span>محدوده قیمت</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {onlyDiscounted && (
                  <button
                    onClick={() => setOnlyDiscounted(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-cta)] text-xs font-bold hover:bg-[var(--color-cta)]/20 transition-colors cursor-pointer"
                    aria-label="حذف فیلتر فقط تخفیف‌دار"
                  >
                    <span>فقط تخفیف‌دار</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {onlyInStock && (
                  <button
                    onClick={() => setOnlyInStock(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-cta)] text-xs font-bold hover:bg-[var(--color-cta)]/20 transition-colors cursor-pointer"
                    aria-label="حذف فیلتر فقط موجود"
                  >
                    <span>فقط موجود</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {inPageQuery.trim() !== '' && (
                  <button
                    onClick={() => setInPageQuery('')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cta)]/10 text-[var(--color-cta)] text-xs font-bold hover:bg-[var(--color-cta)]/20 transition-colors cursor-pointer"
                    aria-label="حذف جستجو"
                  >
                    <span>جستجو: {inPageQuery}</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            <ProductGrid
              products={filteredProducts}
              loading={loading}
              resetAllFilters={resetAllFilters}
            />

            {/* Pagination with Persian Digits & Modern Chevrons */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10 pb-8 select-none">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[var(--color-border-dark)] disabled:opacity-40 hover:bg-[var(--color-cta)]/10 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>صفحه قبلی</span>
                </button>
                
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-extrabold transition-all cursor-pointer ${
                        page === i + 1
                          ? 'bg-[var(--color-cta)] text-white ring-2 ring-[var(--color-cta)]/30'
                          : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200 dark:border-[var(--color-border-dark)] hover:border-[var(--color-cta)]/50 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {toPersianDigits(i + 1)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[var(--color-border-dark)] disabled:opacity-40 hover:bg-[var(--color-cta)]/10 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                >
                  <span>صفحه بعدی</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
