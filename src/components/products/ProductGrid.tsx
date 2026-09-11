import React from 'react';
import ProductCard from '../ProductCard';
import { ProductCardSkeleton } from '../Skeletons';
import EmptyState from '../EmptyState';
import { Product } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

import { Search } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  resetAllFilters: () => void;
}

export default function ProductGrid({ products, loading, resetAllFilters }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <ProductCardSkeleton key={idx} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-12 w-12" />}
        title="محصولی یافت نشد!"
        description="متأسفانه هیچ محصولی متناسب با فیلترهای انتخاب شده پیدا نشد. لطفاً فیلترها را تغییر داده یا بازنشانی کنید."
        actionText="حذف فیلترها"
        onActionClick={resetAllFilters}
      />
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4"
    >
      <AnimatePresence>
        {products.map((product) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
