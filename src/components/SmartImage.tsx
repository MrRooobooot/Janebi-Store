import React, { useState, useEffect } from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Image URL — if it fails to load, the SVG fallback is shown instead */
  src: string;
  alt: string;
  /** Icon shown in the fallback tile (lucide component) */
  fallbackIcon?: React.ComponentType<{ className?: string }>;
  /** Priority images (hero/above-the-fold) should skip lazy loading */
  priority?: boolean;
}

/**
 * SmartImage — resilient image with graceful fallback.
 *
 * Iranian users cannot reach foreign image CDNs (Unsplash et al. are DNS-sinkholed),
 * so every remote image must degrade to a branded local placeholder instead of
 * rendering a broken-image icon. Also enforces native lazy loading by default.
 */
export default function SmartImage({
  src,
  alt,
  fallbackIcon: FallbackIcon,
  priority = false,
  className = '',
  ...rest
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  // Reset the failure state when the source changes (e.g. product switch)
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/60 text-gray-300 dark:text-gray-600 select-none ${className}`}
      >
        {FallbackIcon ? (
          <FallbackIcon className="w-1/3 h-1/3 max-w-16 max-h-16" />
        ) : (
          <DefaultGlyph />
        )}
        <span className="text-[10px] text-gray-400 dark:text-gray-500 px-2 text-center leading-relaxed line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
}

function DefaultGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-1/3 h-1/3 max-w-16 max-h-16">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 15.5l-4.5-4.5L7 20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
