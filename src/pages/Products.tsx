import React from 'react';
import { useProductFilters } from '../hooks/useProductFilters';
import ProductFilterSidebar from '../components/products/ProductFilterSidebar';
import ProductSortHeader from '../components/products/ProductSortHeader';
import ProductGrid from '../components/products/ProductGrid';
import { ChevronRight, ChevronLeft } from 'lucide-react';
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
    <div className="page-stack w-full">
      {/* Page Title Header — warm rose-tinted band (Iranian-palette hero, ≥4.5:1 subtext) */}
      <div className="mb-6 text-right">
          {isCategoryFiltered ? (
            <>
              <p className="text-xs text-slate-500">دسته‌بندی انتخاب‌شده</p>
              <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-4xl">
                خرید {selectedCategory}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {toPersianDigits(realCount)} محصول اورجینال در دسته «{selectedCategory}» با ضمانت اصالت، گارانتی تعویض فیزیکی و ارسال سریع
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">کاتالوگ کامل جانبی آرنا</p>
              <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-4xl">
                فروشگاه تجهیزات و لوازم جانبی اورجینال
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                بررسی، مقایسه تخصصی و خرید مستقیم انواع قاب، گلس، شارژر فست، کابل و پاوربانک با گارانتی تعویض فیزیکی
              </p>
            </>
          )}
        </div>

        {/* Main Content Layout Grid */}
        {/* Product cards carry h3 titles, so the grid needs its own h2 to keep the
            document outline valid (h1 page title -> h2 section -> h3 cards). */}
        <h2 className="sr-only">فهرست محصولات</h2>
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
              setSearchParams={setSearchParams}
            />

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
                  className="min-h-11 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[var(--color-border-dark)] disabled:opacity-40 hover:bg-[var(--color-cta)]/10 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>صفحه قبلی</span>
                </button>
                
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-[13px] font-bold transition-all cursor-pointer ${
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
                  className="min-h-11 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[var(--color-border-dark)] disabled:opacity-40 hover:bg-[var(--color-cta)]/10 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
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
