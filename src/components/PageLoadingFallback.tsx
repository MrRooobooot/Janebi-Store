import React from 'react';

export default function PageLoadingFallback() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="h-1 bg-gradient-to-r from-[var(--color-cta)]/10 via-[var(--color-accent-surface)] to-[var(--color-cta)]/10 w-full animate-pulse shadow-sm shadow-[var(--color-cta)]/40" />
    </div>
  );
}
