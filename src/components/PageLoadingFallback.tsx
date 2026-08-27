import React from 'react';

export default function PageLoadingFallback() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 w-full animate-pulse shadow-sm shadow-orange-500/50" />
    </div>
  );
}
