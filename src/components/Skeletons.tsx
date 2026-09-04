import React from 'react';

/**
 * Skeleton Loader for Product Cards (Home, Products, Offers, New Products, etc.)
 */
export function ProductCardSkeleton() {
  return (
    <div className="linear-card bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-light)]/[0.025] rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] p-4.5 relative flex flex-col h-full shadow-xs transition-colors select-none">
      {/* Image Skeleton */}
      <div className="aspect-square w-full relative overflow-hidden rounded-2xl bg-zinc-100 dark:bg-[var(--color-surface-light)]/[0.04] animate-pulse mb-4">
        <div className="absolute top-3 right-3 w-12 h-5 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.08] rounded-md"></div>
      </div>

      {/* Details Skeleton */}
      <div className="grow flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Brand badge */}
          <div className="h-3.5 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-1/3 animate-pulse"></div>
          {/* Title lines */}
          <div className="h-4 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-full animate-pulse"></div>
          <div className="h-4 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-2/3 animate-pulse"></div>
        </div>

        {/* Rating and Price Skeleton */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="h-4 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-16 animate-pulse"></div>
          <div className="flex flex-col items-end gap-1">
            <div className="h-3 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-12 animate-pulse"></div>
            <div className="h-5 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.08] rounded-md w-20 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Button Skeleton */}
      <div className="w-full mt-4 h-11 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.08] rounded-xl animate-pulse"></div>
    </div>
  );
}

/**
 * Skeleton Loader for Product Detail Page
 */
export function ProductDetailSkeleton() {
  return (
    <div className="linear-card bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-light)]/[0.025] rounded-3xl p-6 lg:p-10 shadow-sm border border-zinc-200/80 dark:border-white/[0.08] space-y-8 animate-pulse select-none">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-1/3 mb-6"></div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
        {/* Left Gallery Skeleton */}
        <div className="w-full lg:w-5/12 space-y-4">
          <div className="aspect-square bg-zinc-100 dark:bg-[var(--color-surface-light)]/[0.04] rounded-3xl w-full"></div>
          <div className="flex gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-20 h-20 bg-zinc-100 dark:bg-[var(--color-surface-light)]/[0.04] rounded-2xl shrink-0"></div>
            ))}
          </div>
        </div>

        {/* Right Info Skeleton */}
        <div className="w-full lg:w-7/12 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="h-8 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.08] rounded-xl w-3/4"></div>
            <div className="h-4 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-lg w-1/2"></div>
          </div>

          <div className="flex gap-4 py-4 border-y border-zinc-100 dark:border-white/[0.06]">
            <div className="h-4 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-24"></div>
            <div className="h-4 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-24"></div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <div className="h-4 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.06] rounded-md w-20"></div>
            <div className="h-8 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.08] rounded-xl w-32"></div>
          </div>

          <div className="space-y-3">
            <div className="h-12 bg-zinc-100 dark:bg-[var(--color-surface-light)]/[0.04] rounded-xl"></div>
            <div className="h-12 bg-zinc-100 dark:bg-[var(--color-surface-light)]/[0.04] rounded-xl"></div>
          </div>

          <div className="flex gap-4 pt-4">
            <div className="flex-1 h-14 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.08] rounded-xl"></div>
            <div className="w-14 h-14 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.08] rounded-xl"></div>
            <div className="w-14 h-14 bg-zinc-200 dark:bg-[var(--color-surface-light)]/[0.08] rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for Live Search Dropdown Items
 */
export function SearchItemSkeleton() {
  return (
    <div className="p-2.5 rounded-2xl border border-transparent flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-3.5 w-full">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl shrink-0"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-1/2"></div>
        </div>
      </div>
      <div className="w-16 h-5 bg-gray-200 dark:bg-gray-800 rounded-md shrink-0"></div>
    </div>
  );
}

/**
 * Skeleton Loader for Reviews List
 */
export function ReviewSkeleton() {
  return (
    <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-5 sm:p-6 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
          <div className="space-y-1.5">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-28"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-16"></div>
          </div>
        </div>
        <div className="w-12 h-6 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-1/3"></div>
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-md w-full"></div>
    </div>
  );
}

