import React from 'react';
import { useProductFilters } from '../hooks/useProductFilters';
import ProductFilterSidebar from '../components/products/ProductFilterSidebar';
import ProductSortHeader from '../components/products/ProductSortHeader';
import ProductGrid from '../components/products/ProductGrid';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toPersianDigits } from '../lib/utils';
import { applyCatalogSeo } from '../lib/catalogSeo';
import { CATALOG_HUB_H1, catalogH1 } from '../lib/catalogCopy';

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
  const isBrandFiltered = selectedBrands.length > 0;
  const isFiltered = isCategoryFiltered || isBrandFiltered;
  const realCount = totalProducts; // real count returned by the live API — never fabricated
  // Single source for the filter wording: `src/lib/catalogCopy.ts` — the same
  // module the server-side raw-HTML prerender uses, so <head>, h1 and the
  // crawler-visible HTML can never disagree about which listing this is.
  const brandLabel = selectedBrands.join(' و ');
  const catalogFilters = {
    category: isCategoryFiltered ? selectedCategory : null,
    brands: selectedBrands,
  };

  // Listing <head> SEO (title / description / canonical / Open Graph / Twitter /
  // CollectionPage JSON-LD), hub and filtered alike. Runs only on settled API
  // data (loading=false) so meta always reflects the real live catalogue.
  // The head is reset by RouteHead when the route changes, so leaving the catalogue
  // needs no cleanup here. A filter change inside the catalogue only re-applies.
  const [urlParams] = useSearchParams();
  const isSearchResult = Boolean(urlParams.get('search')?.trim());
  useEffect(() => {
    if (loading) return;
    applyCatalogSeo({ itemCount: realCount, ...catalogFilters, noindex: isSearchResult });
  }, [isFiltered, isCategoryFiltered, isBrandFiltered, selectedCategory, selectedBrands, realCount, loading, isSearchResult]);

  return (
    <div className="page-stack w-full">
      {/* Page Title Header — warm rose-tinted band (Iranian-palette hero, ≥4.5:1 subtext) */}
      <div className="mb-6 text-right">
          {isFiltered ? (
            <>
              <p className="text-xs text-slate-500">
                {isCategoryFiltered ? 'دسته‌بندی انتخاب‌شده' : 'برند انتخاب‌شده'}
              </p>
              <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-4xl">
                {catalogH1(catalogFilters)}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {toPersianDigits(realCount)} محصول
                {isCategoryFiltered ? ` در دسته «${selectedCategory}»` : ''}
                {isBrandFiltered ? ` از برند ${brandLabel}` : ''} با قیمت و موجودی به‌روز و ضمانت اصالت
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">کاتالوگ کامل جانبی آرنا</p>
              <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-4xl">
                {CATALOG_HUB_H1}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                جست‌وجو و مقایسه‌ی انواع قاب، گلس، شارژر، کابل و پاوربانک، با قیمت و موجودی به‌روز هر محصول
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
          <div className="space-y-6 lg:col-span-10">
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
