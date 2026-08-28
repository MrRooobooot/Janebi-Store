import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, Heart, User, ShoppingCart } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { motion } from 'motion/react';

export default function MobileBottomNav() {
  const location = useLocation();
  const { wishlist } = useWishlist();
  const { isLoggedIn } = useAuth();
  const { cartCount } = useCart();

  const navItems = [
    {
      path: '/',
      label: 'خانه',
      icon: Home,
      exact: true,
    },
    {
      path: '/products',
      label: 'محصولات',
      icon: Grid,
      exact: false,
    },
    {
      path: '/wishlist',
      label: 'علاقه‌مندی‌ها',
      icon: Heart,
      badge: wishlist.length,
      exact: true,
    },
    {
      path: '/profile',
      label: 'پروفایل',
      icon: User,
      badge: isLoggedIn ? 0 : undefined,
      exact: false,
    },
    {
      path: '/cart',
      label: 'سبد خرید',
      icon: ShoppingCart,
      badge: cartCount,
      exact: true,
      highlight: true,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-lg px-2 py-1.5 transition-colors duration-300">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-touch-target ${
                isActive
                  ? 'text-orange-600 dark:text-orange-400 font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavBackground"
                  className="absolute inset-0 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
              )}
              
              <div className="relative flex items-center justify-center p-1 z-10">
                <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -top-1.5 -right-2 text-[10px] font-extrabold h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-sm ${
                      item.highlight
                        ? 'bg-orange-600 text-white'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight z-10">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute bottom-0 w-6 h-0.5 bg-orange-600 dark:bg-orange-400 rounded-full shadow-[0_0_8px_rgba(234,88,12,0.8)] dark:shadow-[0_0_8px_rgba(251,146,60,0.8)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
