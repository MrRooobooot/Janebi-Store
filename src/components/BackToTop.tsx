import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  // Both /products/:id and the /product/:id alias carry the sticky purchase bar.
  const abovePurchaseBar = /^\/products?\/[^/]/.test(location.pathname);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className={`fixed right-4 left-auto z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-cta)] text-white hover:bg-[var(--color-cta-hover)] active:bg-[var(--color-cta-active)] sm:left-6 sm:right-auto ${
        abovePurchaseBar ? 'bottom-[148px] sm:bottom-6' : 'bottom-[5.75rem] sm:bottom-6'
      }`}
      aria-label="بازگشت به بالا"
    >
      <ArrowUp className="h-6 w-6" />
    </button>
  );
}
