import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, Heart, User, ShoppingCart, Sun, Moon } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { toPersianDigits } from '../lib/utils';

export default function MobileBottomNav() {
  const location = useLocation();
  const { wishlist } = useWishlist();
  const { isLoggedIn } = useAuth();
  const { cartCount } = useCart();
  const { isDarkMode, toggleTheme } = useTheme();

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
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[var(--color-surface-header-dark)]/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-white/[0.08] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] transition-colors duration-300">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.slice(0, 2).map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-300 min-touch-target ${
                isActive
                  ? 'text-[var(--color-emphasis-text)] font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-[var(--color-surface-light)]/[0.04]'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-primary-50 dark:bg-primary-950/40 rounded-xl"
                />
              )}

              <div className="relative flex items-center justify-center p-1 z-10">
                <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="pop-in absolute -top-1.5 -right-2 text-[10px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-xs bg-primary-600 text-white"
                  >
                    {toPersianDigits(item.badge)}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight z-10">{item.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 w-6 h-0.5 bg-primary-600 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.8)]"
                />
              )}
            </Link>
          );
        })}

        {/* Theme toggle — center slot (user: theme switch was buried in the drawer) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDarkMode ? 'حالت روز (روشن)' : 'حالت شب (تاریک)'}
          className="relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-[var(--color-surface-light)]/[0.04] transition-all duration-300 min-touch-target active:scale-95 cursor-pointer"
        >
          <div className="relative flex items-center justify-center p-1 z-10">
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight z-10">{isDarkMode ? 'روشن' : 'تاریک'}</span>
        </button>

        {navItems.slice(2).map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-300 min-touch-target ${
                isActive
                  ? 'text-[var(--color-emphasis-text)] font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-[var(--color-surface-light)]/[0.04]'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-primary-50 dark:bg-primary-950/40 rounded-xl"
                />
              )}
              
              <div className="relative flex items-center justify-center p-1 z-10">
                <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="pop-in absolute -top-1.5 -right-2 text-[10px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-xs bg-primary-600 text-white"
                  >
                    {toPersianDigits(item.badge)}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight z-10">{item.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 w-6 h-0.5 bg-primary-600 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.8)]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
