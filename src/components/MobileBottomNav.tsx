import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Heart, User, ShoppingCart, Sun, Moon } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { toPersianDigits } from '../lib/utils';

type Destination = {
  path: string;
  label: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
  /** Share of the row. Longer labels get more than the short ones. */
  grow: string;
  match: (pathname: string) => boolean;
};

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const shown = count > 99 ? '۹۹+' : toPersianDigits(count);
  return (
    <span className="pointer-events-none absolute -top-1.5 -end-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-cta)] px-1 text-xs font-bold leading-none text-white">
      {shown}
    </span>
  );
}

export default function MobileBottomNav() {
  const location = useLocation();
  const { wishlist } = useWishlist();
  const { cartCount } = useCart();
  const { isDarkMode, toggleTheme } = useTheme();

  const destinations: Destination[] = [
    {
      path: '/',
      label: 'خانه',
      ariaLabel: 'خانه',
      icon: Home,
      grow: 'flex-[0.85]',
      match: (pathname) => pathname === '/',
    },
    {
      path: '/products',
      label: 'محصولات',
      ariaLabel: 'محصولات',
      icon: LayoutGrid,
      grow: 'flex-[1.25]',
      match: (pathname) =>
        pathname === '/products' ||
        pathname.startsWith('/products/') ||
        pathname.startsWith('/product/'),
    },
    {
      path: '/wishlist',
      label: 'علاقه‌ها',
      ariaLabel: 'علاقه‌مندی‌ها',
      icon: Heart,
      badge: wishlist.length,
      grow: 'flex-[1.05]',
      match: (pathname) => pathname === '/wishlist',
    },
    {
      path: '/profile',
      label: 'پروفایل',
      ariaLabel: 'پروفایل',
      icon: User,
      grow: 'flex-[1.05]',
      match: (pathname) => pathname === '/profile' || pathname.startsWith('/profile/'),
    },
    {
      path: '/cart',
      label: 'سبد',
      ariaLabel: 'سبد خرید',
      icon: ShoppingCart,
      badge: cartCount,
      grow: 'flex-[0.8]',
      match: (pathname) => pathname === '/cart',
    },
  ];

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] print:hidden lg:hidden"
    >
      <div className="surface-glass pointer-events-auto mx-auto flex max-w-lg items-stretch gap-1 rounded-2xl p-1 shadow-lg">
        <ul className="flex min-w-0 flex-1 items-stretch">
          {destinations.map((item) => {
            const active = item.match(location.pathname);
            const Icon = item.icon;
            return (
              <li key={item.path} className={`min-w-0 ${item.grow}`}>
                <Link
                  to={item.path}
                  aria-label={item.ariaLabel}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 motion-safe:transition-colors ${
                    active
                      ? 'text-[var(--color-emphasis-text)]'
                      : 'text-[var(--color-text-muted-light)] hover:bg-black/[0.04] hover:text-[var(--color-text-main-light)] dark:text-[var(--color-text-muted-dark)] dark:hover:bg-white/[0.06] dark:hover:text-[var(--color-text-main-dark)]'
                  }`}
                >
                  <span className="relative flex h-7 w-7 items-center justify-center">
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 rounded-lg motion-safe:transition-colors ${
                        active ? 'bg-[var(--color-cta)]' : 'bg-transparent'
                      }`}
                    />
                    <Icon
                      strokeWidth={active ? 2.25 : 1.75}
                      className={`relative h-[18px] w-[18px] ${active ? 'text-white' : ''}`}
                    />
                    <CountBadge count={item.badge ?? 0} />
                  </span>
                  <span className={`max-w-full truncate text-xs leading-none ${active ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-1.5 w-px shrink-0 bg-[var(--color-border-light)] dark:bg-[var(--color-border-dark)]" aria-hidden="true" />

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDarkMode ? 'حالت روز (روشن)' : 'حالت شب (تاریک)'}
          className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[var(--color-text-muted-light)] hover:bg-black/[0.04] dark:text-[var(--color-text-muted-dark)] dark:hover:bg-white/[0.06] motion-safe:transition-colors"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              isDarkMode
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300'
            }`}
          >
            {isDarkMode ? <Sun className="h-[18px] w-[18px]" strokeWidth={2.25} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={2.25} />}
          </span>
          <span className="text-xs leading-none">{isDarkMode ? 'روشن' : 'تاریک'}</span>
        </button>
      </div>
    </nav>
  );
}
