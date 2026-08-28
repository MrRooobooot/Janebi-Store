import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { motion, AnimatePresence } from 'motion/react';

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tight">علاقه‌مندی‌های من</h1>
      </div>

      {wishlist.length === 0 ? (
        <EmptyState 
          icon={<Heart className="h-16 w-16 text-rose-300 dark:text-rose-500/50" />}
          title="لیست علاقه‌مندی‌های شما خالی است!"
          description="محصولات مورد علاقه خود را به این لیست اضافه کنید تا بعداً راحت‌تر آن‌ها را پیدا کنید."
          actionText="مشاهده محصولات"
          actionLink="/products"
          className="bg-[var(--color-surface-light)]/80 dark:bg-[var(--color-surface-dark)]/80 backdrop-blur-xl rounded-3xl p-12 shadow-sm border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]"
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {wishlist.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                transition={{ duration: 0.2 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
