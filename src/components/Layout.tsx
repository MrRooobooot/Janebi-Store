import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BackToTop from './BackToTop';
import ChatWidget from './ChatWidget';
import DynamicBreadcrumbs from './DynamicBreadcrumbs';
import MobileBottomNav from './MobileBottomNav';
import CartDrawer from './cart/CartDrawer';
import { useCart } from '../contexts/CartContext';
import { Link } from 'react-router-dom';

const SLIM_LINKS = [
  { label: 'درباره ما', to: '/about' },
  { label: 'تماس با ما', to: '/contact' },
  { label: 'پرسش‌های متداول', to: '/faq' },
  { label: 'قوانین', to: '/terms' },
  { label: 'حریم خصوصی', to: '/privacy' },
];

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { isCartDrawerOpen, closeCartDrawer } = useCart();

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-20 lg:pb-0 relative w-full max-w-full overflow-x-hidden selection:bg-[var(--color-cta)] selection:text-white">
      <Header />
      <main className="grow w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-4 sm:py-6 relative box-border overflow-x-hidden">
        <DynamicBreadcrumbs />
        <div key={location.pathname} className="animate-in fade-in duration-150 w-full max-w-full">
          <Outlet />
        </div>
      </main>
      {isHome ? (
        <Footer />
      ) : (
        <footer className="hidden lg:block border-t border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-[var(--color-surface-footer-dark)] mt-6">
          <nav aria-label="پیوندهای پایین صفحه" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-8 py-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {SLIM_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="hover:text-[var(--color-emphasis-text)] transition-colors">{l.label}</Link>
              ))}
            </div>
            <span>© جانبی آرنا</span>
          </nav>
        </footer>
      )}
      <BackToTop />
      <ChatWidget />
      <MobileBottomNav />
      <CartDrawer isOpen={isCartDrawerOpen} onClose={closeCartDrawer} />
    </div>
  );
}
