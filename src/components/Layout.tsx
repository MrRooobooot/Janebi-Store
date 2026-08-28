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

export default function Layout() {
  const location = useLocation();
  const { isCartDrawerOpen, closeCartDrawer } = useCart();

  return (
    <div className="min-h-screen flex flex-col font-sans text-zinc-900 dark:text-zinc-100 bg-[#f8fafc] dark:bg-[#090d16] transition-colors duration-200 pb-20 lg:pb-0 relative w-full max-w-full overflow-x-hidden selection:bg-orange-500 selection:text-white">
      <Header />
      <main className="grow w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 relative box-border overflow-x-hidden">
        <DynamicBreadcrumbs />
        <div key={location.pathname} className="animate-in fade-in duration-150 w-full max-w-full">
          <Outlet />
        </div>
      </main>
      <Footer />
      <BackToTop />
      <ChatWidget />
      <MobileBottomNav />
      <CartDrawer isOpen={isCartDrawerOpen} onClose={closeCartDrawer} />
    </div>
  );
}
