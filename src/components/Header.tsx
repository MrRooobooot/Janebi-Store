import React, { useState } from 'react';
import { ShoppingCart, Heart, User, Menu, Moon, Sun, X, ArrowLeftRight, Smartphone, Sparkles, Search, LogOut, Package, LogIn, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useCompare } from '../contexts/CompareContext';
import HeaderSearch from './HeaderSearch';
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

  const navLinks = [
    { label: 'صفحه اصلی', to: '/' },
    { label: 'تمام محصولات', to: '/products' },
    { label: 'هولدر و پایه', to: '/products?category=هولدر و پایه' },
    { label: 'قاب و کاور', to: '/products?category=قاب و کاور' },
    { label: 'گلس و محافظ', to: '/products?category=گلس' },
    { label: 'کابل و تبدیل', to: '/products?category=کابل' },
    { label: 'محافظ کابل', to: '/products?category=محافظ کابل' },
    { label: 'شارژرها', to: '/products?category=شارژر' },
    { label: 'خرید عمده و همکاران', to: '/contact?type=wholesale', highlight: true },
  ];

  return (
    <header className="bg-[var(--color-surface-light)]/95 dark:bg-[#080d15]/90 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 sticky top-0 z-40 transition-colors duration-200 w-full overflow-x-clip">
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      
      {/* Top Announcement Bar — Strict Overflow Control */}
      <div className="bg-zinc-900 text-zinc-100 text-xs py-1.5 px-3 sm:px-4 border-b border-zinc-800 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 min-w-0">
            <Sparkles className="h-3.5 w-3.5 animate-pulse shrink-0" />
            <span className="text-zinc-200 truncate">{settings.announcement}</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] text-zinc-400 font-medium shrink-0">
            <span>تلفن پشتیبانی: {settings.phone}</span>
            <span className="h-3 w-px bg-zinc-700" />
            <span>ساعت کاری: {settings.supportHours}</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
          
          {/* Logo & Mobile Menu Toggle */}
          <div className="shrink-0 flex items-center gap-2 sm:gap-3">
            <button
              aria-label={mobileMenuOpen ? "بستن منو" : "باز کردن منو"}
              className="lg:hidden p-1.5 sm:p-2 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 focus:outline-none rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>

            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                  جانبی <span className="text-orange-600 dark:text-orange-400">آرنا</span>
                </span>
                <span className="text-[8px] sm:text-[9px] text-zinc-400 dark:text-zinc-500 -mt-1 font-bold tracking-widest uppercase">Janebi Arena</span>
              </div>
            </Link>
          </div>

          {/* Desktop Search */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <HeaderSearch />
          </div>

          {/* User Controls & Quick Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Search Button */}
            <button
              aria-label="جستجو"
              className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Dark Mode Switcher */}
            <button
              aria-label={isDarkMode ? "تغییر به حالت روز" : "تغییر به حالت شب"}
              title={isDarkMode ? "حالت روز (روشن)" : "حالت شب (تاریک)"}
              onClick={toggleTheme}
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-[var(--color-surface-light)]/[0.06] transition-colors"
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-zinc-600" />}
            </button>

            {/* Compare Badge */}
            <Link
              to="/compare"
              aria-label="مشاهده لیست مقایسه کالاها"
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative hidden sm:flex items-center min-touch-target"
              title="مقایسه کالاها"
            >
              <ArrowLeftRight className="h-5 w-5" />
              {compareItems.length > 0 && (
                <span className="absolute top-1 right-1 bg-zinc-800 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center" aria-label={`${compareItems.length} مورد در مقایسه`}>
                  {toPersianDigits(compareItems.length)}
                </span>
              )}
            </Link>

            {/* Wishlist Badge */}
            <Link
              to="/wishlist"
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative hidden sm:flex items-center"
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
              className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 dark:hover:text-white border border-orange-200 dark:border-orange-900/50 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all duration-200 shadow-xs cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                    {toPersianDigits(cartCount)}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold hidden md:inline">سبد خرید</span>
            </button>

            {/* User Account Menu / Login */}
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 p-1.5 sm:p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold transition-colors"
                >
                  <User className="h-4 w-4 text-orange-600" />
                  <span className="max-w-[80px] sm:max-w-[100px] truncate">{user?.name || 'حساب کاربری'}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>

                {userDropdownOpen && (
                  <div 
                    className="absolute left-0 mt-2 w-48 bg-[var(--color-surface-light)] dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{user?.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{user?.phone || user?.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600"
                    >
                      <Package className="h-4 w-4" />
                      داشبورد و سفارش‌ها
                    </Link>

                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold"
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
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors border-t border-zinc-100 dark:border-zinc-800 mt-1"
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
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all shadow-sm shadow-orange-600/25 cursor-pointer active:scale-95"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden xs:inline">ورود / عضویت</span>
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
        <nav className="hidden lg:flex items-center gap-6 py-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to || (link.to.includes('?') && location.search === link.to.split('?')[1]);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 ${
                  (link as any).highlight 
                    ? 'text-amber-500 dark:text-amber-400 font-black px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25'
                    : isActive 
                      ? 'text-orange-600 dark:text-orange-400 font-black' 
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
        <div className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface-light)] dark:bg-zinc-900 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 text-zinc-800 dark:text-zinc-200 text-center"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs text-zinc-500">
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
