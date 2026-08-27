import React from 'react';
import { useProductFilters } from '../hooks/useProductFilters';
import ProductFilterSidebar from '../components/products/ProductFilterSidebar';
import ProductSortHeader from '../components/products/ProductSortHeader';
import ProductGrid from '../components/products/ProductGrid';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { toPersianDigits } from '../lib/utils';

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

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Title Header */}
        <div className="mb-8 text-right bg-gradient-to-r from-orange-50 via-amber-50 to-transparent dark:from-gray-900 dark:via-gray-850 dark:to-transparent p-6 rounded-3xl border border-orange-100/60 dark:border-gray-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 text-xs font-bold mb-2">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <span>کاتالوگ کامل جانبی آرنا</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">
            فروشگاه تجهیزات و لوازم جانبی اورجینال
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            بررسی، مقایسه تخصصی و خرید مستقیم انواع قاب، گلس، شارژر فست، کابل و پاوربانک با گارانتی تعویض فیزیکی
          </p>
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
          <main className="lg:col-span-9 space-y-6">
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
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-orange-50 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
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
                          ? 'bg-gradient-to-tr from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/25 scale-105'
                          : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-500/50 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {toPersianDigits(i + 1)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-orange-50 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                >
                  <span>صفحه بعدی</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
