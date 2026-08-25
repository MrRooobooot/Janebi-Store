import React, { useState } from 'react';
import { ShoppingCart, Heart, User, Menu, Moon, Sun, X, ArrowLeftRight, Smartphone, Sparkles, Search, LogOut, Package, LogIn, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useCompare } from '../contexts/CompareContext';
import { AnimatePresence, motion } from 'motion/react';
import HeaderSearch from './HeaderSearch';
import { useStoreSettings } from '../hooks/useStoreSettings';

import AuthModal from './auth/AuthModal';

export default function Header() {
  const { user, isLoggedIn, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { cartCount } = useCart();
  const { compareItems } = useCompare();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settings = useStoreSettings();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50 shadow-xs transition-colors duration-300">
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black text-white text-xs text-center py-2 px-4 flex items-center justify-center gap-2 border-b border-gray-800">
        <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
        <span className="font-medium">{settings.announcement}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="shrink-0 flex items-center gap-3">
            {/* Mobile: hamburger — only shown when search is closed */}
            {!mobileSearchOpen && (
              <button
                aria-label={mobileMenuOpen ? "بستن منو" : "باز کردن منو"}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 focus:outline-none rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
            <Link to="/" className="flex items-center gap-2.5 group">
               <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
                 <Smartphone className="h-5 w-5" />
               </div>
               <div className="flex flex-col">
                 <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-1">
                   جانبی <span className="text-orange-600 dark:text-orange-400">آرنا</span>
                 </span>
                 <span className="text-[10px] text-gray-400 dark:text-gray-500 -mt-1 font-semibold tracking-wider">JANEBI ARENA</span>
               </div>
            </Link>
          </div>

          {/* Search Bar — Desktop */}
          <div className="flex-1 max-w-2xl mx-8 relative hidden md:block">
            <HeaderSearch />
          </div>

          {/* Mobile Search — Inline expanding overlay */}
          <AnimatePresence>
            {mobileSearchOpen && (
              <motion.div
                initial={{ opacity: 0, width: '40px' }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0, width: '40px' }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="md:hidden absolute left-0 right-0 top-0 bottom-0 flex items-center bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl px-4 z-20"
              >
                <div className="w-full">
                  <HeaderSearch
                    autoFocus
                    onSearchSubmit={() => setMobileSearchOpen(false)}
                  />
                </div>
                <button
                  aria-label="بستن جستجو"
                  onClick={() => setMobileSearchOpen(false)}
                  className="mr-3 p-2 text-gray-500 dark:text-gray-400 hover:text-orange-600 shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3">
            {/* Mobile Search Icon */}
            <button
              aria-label="جستجو"
              onClick={() => { setMobileSearchOpen(true); setMobileMenuOpen(false); }}
              className="md:hidden p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="جستجو"
            >
              <Search className="h-5 w-5" />
            </button>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={isDarkMode ? 'حالت روز' : 'حالت شب'}
              className="group relative flex flex-col items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/80 dark:hover:bg-gray-800/80 transition-all duration-200 border border-transparent hover:border-orange-100 dark:hover:border-gray-700/60 hidden sm:flex"
            >
              <div className="relative p-1.5 rounded-lg bg-gray-100/80 dark:bg-gray-800 group-hover:bg-orange-100/80 dark:group-hover:bg-orange-950/40 transition-colors duration-200">
                {isDarkMode ? (
                  <Sun className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 group-hover:rotate-45 transition-transform duration-300" />
                ) : (
                  <Moon className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
                )}
              </div>
              <span className="text-[11px] font-medium mt-1 group-hover:font-semibold transition-all">
                {isDarkMode ? 'روز' : 'شب'}
              </span>
            </button>

            {/* Profile */}
            <div className="relative group hidden sm:block">
              {isLoggedIn ? (
                <Link
                  to="/profile"
                  title="حساب کاربری"
                  className="group relative flex flex-col items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/80 dark:hover:bg-gray-800/80 transition-all duration-200 border border-transparent hover:border-orange-100 dark:hover:border-gray-700/60"
                >
                  <div className="p-1.5 rounded-lg bg-gray-100/80 dark:bg-gray-800 group-hover:bg-orange-100/80 dark:group-hover:bg-orange-950/40 transition-all duration-200 group-hover:-translate-y-0.5 relative">
                    <User className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                  </div>
                  <span className="text-[11px] font-medium mt-1 flex items-center gap-0.5">
                    {user?.name?.split(' ')[0]}
                  </span>
                </Link>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  title="ورود به حساب"
                  className="group relative flex flex-col items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/80 dark:hover:bg-gray-800/80 transition-all duration-200 border border-transparent hover:border-orange-100 dark:hover:border-gray-700/60"
                >
                  <div className="p-1.5 rounded-lg bg-gray-100/80 dark:bg-gray-800 group-hover:bg-orange-100/80 dark:group-hover:bg-orange-950/40 transition-all duration-200 group-hover:-translate-y-0.5">
                    <User className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                  </div>
                  <span className="text-[11px] font-medium mt-1">ورود</span>
                </button>
              )}
              
              {/* Profile Dropdown */}
              {isLoggedIn && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                    <div className="font-bold text-gray-900 dark:text-white text-sm">{user?.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.phone}</div>
                  </div>
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                    <User className="h-4 w-4" />
                    پروفایل من
                  </Link>
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                    <Package className="h-4 w-4" />
                    سفارش‌های من
                  </Link>
                  <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-right mt-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <LogOut className="h-4 w-4" />
                    خروج از حساب
                  </button>
                </div>
              )}
            </div>

            {/* Compare */}
            <Link
              to="/compare"
              title="مقایسه محصولات"
              className="group relative flex flex-col items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/80 dark:hover:bg-gray-800/80 transition-all duration-200 border border-transparent hover:border-orange-100 dark:hover:border-gray-700/60 hidden sm:flex"
            >
              <div className="relative p-1.5 rounded-lg bg-gray-100/80 dark:bg-gray-800 group-hover:bg-orange-100/80 dark:group-hover:bg-orange-950/40 transition-all duration-200 group-hover:-translate-y-0.5">
                <ArrowLeftRight className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                {compareItems.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-sm"
                  >
                    {compareItems.length}
                  </motion.span>
                )}
              </div>
              <span className="text-[11px] font-medium mt-1">مقایسه</span>
            </Link>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              title="لیست علاقه‌مندی‌ها"
              className="group relative flex flex-col items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/80 dark:hover:bg-gray-800/80 transition-all duration-200 border border-transparent hover:border-orange-100 dark:hover:border-gray-700/60"
            >
              <div className="relative p-1.5 rounded-lg bg-gray-100/80 dark:bg-gray-800 group-hover:bg-rose-100/80 dark:group-hover:bg-rose-950/40 transition-all duration-200 group-hover:-translate-y-0.5">
                <Heart className={`h-4 sm:h-5 w-4 sm:w-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : 'text-gray-600 dark:text-gray-300 group-hover:text-rose-500'}`} />
                {wishlist.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-sm"
                  >
                    {wishlist.length}
                  </motion.span>
                )}
              </div>
              <span className="text-[11px] font-medium mt-1 hidden sm:block">علاقه‌مندی‌ها</span>
            </Link>

            {/* Cart Button */}
            <Link
              to="/cart"
              title="سبد خرید"
              className="group relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200 active:scale-95"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2.5 -right-2.5 bg-white text-orange-600 text-[10px] font-extrabold h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-md border border-orange-200"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-[12px] font-bold">سبد خرید</span>
                {cartCount > 0 ? (
                  <span className="text-[10px] opacity-90 mt-0.5 font-medium">{cartCount} کالا</span>
                ) : (
                  <span className="text-[10px] opacity-80 mt-0.5 font-normal">خالی</span>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Categories Navbar */}
        <nav className="flex items-center justify-center gap-5 xl:gap-7 py-3 text-xs sm:text-sm font-semibold hidden lg:flex border-t border-gray-100 dark:border-gray-800/80 text-gray-700 dark:text-gray-300">
           <Link to="/" className={`hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 py-1 px-2.5 rounded-lg ${location.pathname === '/' ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold' : ''}`}>خانه</Link>
           <Link to="/products?category=قاب و کاور" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 flex items-center gap-1">قاب و کاور</Link>
           <Link to="/products?category=گلس" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 flex items-center gap-1">گلس</Link>
           <Link to="/products?category=شارژر" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50">شارژر</Link>
           <Link to="/products?category=کابل" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50">کابل</Link>
           <Link to="/products?category=هندزفری" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 flex items-center gap-1">هندزفری</Link>
           <Link to="/products?category=پاوربانک" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 flex items-center gap-1">پاوربانک</Link>
           <Link to="/brands" className={`hover:text-orange-600 dark:hover:text-orange-400 transition-all py-1 px-2.5 rounded-lg ${location.pathname === '/brands' ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold' : ''}`}>برندها</Link>
           <Link to="/offers" className="hover:opacity-90 transition-all text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5 py-1 px-3 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 animate-pulse">
             <Sparkles className="h-3.5 w-3.5" /> پیشنهادهای شگفت‌انگیز
           </Link>
           <Link to="/blog" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50">وبلاگ</Link>
           <Link to="/contact" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50">تماس با ما</Link>
        </nav>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="lg:hidden bg-white/98 dark:bg-gray-900/98 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800 p-4 shadow-2xl absolute w-full left-0 right-0 z-50 overflow-hidden text-gray-800 dark:text-gray-100"
        >
          <div className="mb-4 md:hidden">
            <HeaderSearch onSearchSubmit={() => setMobileMenuOpen(false)} />
          </div>
          <div className="flex justify-around mb-4 sm:hidden pb-4 border-b border-gray-100 dark:border-gray-800">
            <button aria-label={isDarkMode ? "حالت روز" : "حالت شب"} onClick={toggleTheme} className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-orange-600">
              {isDarkMode ? <Sun className="h-6 w-6 text-amber-400" /> : <Moon className="h-6 w-6" />}
              <span className="text-xs mt-1">{isDarkMode ? 'روز' : 'شب'}</span>
            </button>
            <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-orange-600">
              <User className="h-6 w-6" />
              <span className="text-xs mt-1">حساب</span>
            </Link>
            <Link to="/compare" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-orange-600">
              <ArrowLeftRight className="h-6 w-6" />
              <span className="text-xs mt-1">مقایسه</span>
            </Link>
          </div>
          <nav className="flex flex-col space-y-3">
             <Link to="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">خانه</Link>
             <Link to="/products?category=قاب و کاور" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">قاب و کاور</Link>
             <Link to="/products?category=گلس" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">گلس</Link>
             <Link to="/products?category=شارژر" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">شارژر</Link>
             <Link to="/products?category=کابل" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">کابل</Link>
             <Link to="/products?category=هندزفری" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">هندزفری</Link>
             <Link to="/products?category=پاوربانک" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">پاوربانک</Link>
             <Link to="/offers" onClick={() => setMobileMenuOpen(false)} className="text-rose-600 dark:text-rose-400 font-bold">تخفیف‌های ویژه</Link>
             <Link to="/brands" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">برندها</Link>
             <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">وبلاگ</Link>
             <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-600 dark:hover:text-orange-400 font-medium">تماس با ما</Link>
          </nav>
        </motion.div>
      )}
      </AnimatePresence>
    </header>
  );
}

