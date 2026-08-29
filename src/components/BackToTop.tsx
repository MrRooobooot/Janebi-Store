import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

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
      className="fixed bottom-6 left-6 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-orange-600 dark:text-orange-500 border border-gray-200 dark:border-[var(--color-border-dark)] hover:bg-orange-50 dark:hover:bg-orange-900/20 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all z-40 hover:-translate-y-0.5"
      aria-label="بازگشت به بالا"
    >
      <ArrowUp className="h-6 w-6" />
    </button>
  );
}
