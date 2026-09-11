import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Heart, User, Menu, Moon, Sun, X, ArrowLeftRight, Sparkles, Search, LogOut, Package, LogIn, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useCompare } from '../contexts/CompareContext';
import HeaderSearch from './HeaderSearch';
import { getJson } from '../lib/jsonFetch';
import { useStoreSettings } from '../hooks/useStoreSettings';
import AuthModal from './auth/AuthModal';
import { toPersianDigits } from '../lib/utils';

export default function Header() {
  const { user, isLoggedIn, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { cartCount, openCartDrawer } = useCart();
  const { compareItems } = useCompare();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settings = useStoreSettings();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // DB-driven category nav — replaces hard-coded ?category= links (stale vs live catalogue)
  const [navCategories, setNavCategories] = useState<{ title: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    getJson<{ title: string; count?: number }[]>('/api/categories')
      .then((cats) => {
        if (cancelled || !Array.isArray(cats)) return;
        setNavCategories(
          [...cats]
            .sort((a: { count?: number }, b: { count?: number }) => (b.count || 0) - (a.count || 0))
            .slice(0, 6)
            .map((c: { title: string }) => ({ title: c.title }))
        );
      })
      .catch(() => {
        // nav still renders صفحه اصلی / تمام محصولات / عمده — graceful degradation
      });
    return () => { cancelled = true; };
  }, []);

  // Close user dropdown on outside click / Escape — mouse-only close is not accessible
  useEffect(() => {
    if (!userDropdownOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userDropdownOpen]);

  const navLinks = [
    { label: 'صفحه اصلی', to: '/' },
    { label: 'تمام محصولات', to: '/products' },
    // DB-driven: top-6 categories with real product counts (admin-manageable via /api/categories)
    ...navCategories.map((c) => ({ label: c.title, to: `/products?category=${encodeURIComponent(c.title)}` })),
    { label: 'خرید عمده و همکاران', to: '/contact?type=wholesale' },
  ];

  return (
    <header className="bg-white/90 dark:bg-[#0c1220]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] sticky top-0 z-40 transition-colors duration-200 w-full">
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      
      {/* Top Announcement Bar — Strict Overflow Control (hidden when admin/bot disables it) */}
      {settings.announcementBarEnabled !== 'false' && (
      <div className="bg-slate-100/90 dark:bg-[#060910]/95 text-slate-700 dark:text-slate-300 text-xs py-1.5 px-3 sm:px-4 border-b border-slate-200/70 dark:border-white/[0.06] w-full overflow-hidden transition-colors">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-cta)] min-w-0">
            <Sparkles className="h-3.5 w-3.5 animate-none shrink-0" />
            <span className="text-zinc-800 dark:text-zinc-200 truncate font-semibold">{settings.announcement}</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              پشتیبانی آنلاین — پاسخ‌گوییم
            </span>
            <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
            <span>تلفن پشتیبانی: <span dir="ltr" className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{toPersianDigits(settings.phone)}</span></span>
            <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
            <span>ساعت کاری: {toPersianDigits(settings.supportHours)}</span>
          </div>
        </div>
      </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full relative z-30">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
            
          {/* Logo & Mobile Menu Toggle */}
          <div className="shrink-0 flex items-center gap-2 sm:gap-3">
            <button
              aria-label={mobileMenuOpen ? "بستن منو" : "باز کردن منو"}
              className="lg:hidden p-1.5 sm:p-2 text-slate-700 dark:text-slate-300 hover:text-[var(--color-emphasis-text)] focus:outline-none rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>

            <Link to="/" className="focus:outline-none">
              <Logo size="md" />
            </Link>
          </div>

          {/* Desktop Search */}
          <div className="flex-1 max-w-xs md:max-w-sm lg:max-w-xl mx-2 sm:mx-4 hidden md:block relative z-20">
            <HeaderSearch />
          </div>

          {/* User Controls & Quick Badges */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0 relative z-30">
            {/* Mobile Search Button */}
            <button
              aria-label="جستجو"
              className="md:hidden p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-[var(--color-emphasis-text)] rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Dark Mode Switcher */}
            <button
              aria-label={isDarkMode ? "تغییر به حالت روز" : "تغییر به حالت شب"}
              title={isDarkMode ? "حالت روز (روشن)" : "حالت شب (تاریک)"}
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-[var(--color-emphasis-text)] rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
            </button>

            {/* Compare Badge */}
            <Link
              to="/compare"
              aria-label="مشاهده لیست مقایسه کالاها"
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-[var(--color-emphasis-text)] rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors relative hidden lg:flex items-center min-touch-target"
              title="مقایسه کالاها"
            >
              <ArrowLeftRight className="h-5 w-5" />
              {compareItems.length > 0 && (
                <span className="absolute top-1 right-1 bg-slate-800 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center" aria-label={`${compareItems.length} مورد در مقایسه`}>
                  {toPersianDigits(compareItems.length)}
                </span>
              )}
            </Link>

            {/* Wishlist Badge */}
            <Link
              to="/wishlist"
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors relative hidden lg:flex items-center"
              title="علاقه‌مندی‌ها"
            >
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {toPersianDigits(wishlist.length)}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <button
              onClick={openCartDrawer}
              aria-label="مشاهده سبد خرید"
              className="flex items-center gap-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 text-[var(--color-emphasis-text)] border border-primary-200 dark:border-primary-800/60 px-2.5 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all duration-200 shadow-xs cursor-pointer active:scale-95 min-touch-target"
            >
              <div className="relative">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c1220] shadow-xs font-mono">
                    {toPersianDigits(cartCount)}
                  </span>
                )}
              </div>
              <span className="text-xs font-black hidden lg:inline">سبد خرید</span>
            </button>

            {/* User Account Menu / Login */}
            {isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-1 p-1 sm:p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-bold transition-colors"
                >
                  <User className="h-4 w-4 text-[var(--color-emphasis-text)]" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{user?.name || 'حساب کاربری'}</span>
                  <ChevronDown className="hidden sm:inline h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div 
                    className="absolute left-0 mt-2 w-48 bg-white dark:bg-[#0e1629] rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/[0.08] py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-white/[0.06]">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.phone || user?.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-[var(--color-cta)]/10 dark:hover:bg-[var(--color-cta)]/30 hover:text-[var(--color-emphasis-text)]"
                    >
                      <Package className="h-4 w-4" />
                      داشبورد و سفارش‌ها
                    </Link>

                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)] hover:bg-[var(--color-cta)]/10 dark:hover:bg-[var(--color-cta)]/20 font-bold"
                      >
                        <Sparkles className="h-4 w-4" />
                        پنل مدیریت ادمین
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors border-t border-slate-100 dark:border-white/[0.06] mt-1"
                    >
                      <LogOut className="h-4 w-4" />
                      خروج از حساب
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                aria-label="ورود یا ثبت نام در سایت"
                className="flex items-center gap-1 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all shadow-sm shadow-[var(--color-cta)]/25 cursor-pointer active:scale-95 shrink-0"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">ورود / عضویت</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Expanding Input */}
        {mobileSearchOpen && (
          <div className="md:hidden py-2.5 border-t border-zinc-200 dark:border-zinc-800">
            <HeaderSearch autoFocus onSearchSubmit={() => setMobileSearchOpen(false)} />
          </div>
        )}

        {/* Secondary Category Navigation (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 py-2.5 border-t border-slate-100 dark:border-white/[0.06] text-xs font-medium text-slate-600 dark:text-slate-300 relative z-20">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to || (link.to.includes('?') && location.search === link.to.split('?')[1]);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`hover:text-[var(--color-emphasis-text)] transition-colors py-1 ${
                  (link as any).highlight 
                    ? 'text-[var(--color-cta)] font-black px-2.5 py-0.5 rounded-lg bg-[var(--color-cta)]/10 border border-[var(--color-cta)]/25'
                    : isActive 
                      ? 'text-[var(--color-emphasis-text)] font-black' 
                      : ''
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-[var(--color-cta)]/10 dark:hover:bg-[var(--color-cta)]/30 hover:text-[var(--color-emphasis-text)] text-zinc-800 dark:text-zinc-200 text-center"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1.5 p-2">
              <Heart className="h-4 w-4 text-rose-500" />
              علاقه‌مندی‌ها ({toPersianDigits(wishlist.length)})
            </Link>
            <Link to="/compare" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1.5 p-2">
              <ArrowLeftRight className="h-4 w-4 text-blue-500" />
              مقایسه ({toPersianDigits(compareItems.length)})
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
