import React, { useState, useEffect } from 'react';
import { getAssetUrl } from '../lib/utils';

interface PictureImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  /** Width for CLS prevention */
  width?: number | string;
  /** Height for CLS prevention */
  height?: number | string;
  /** Icon shown in the fallback tile (lucide component) */
  fallbackIcon?: React.ComponentType<{ className?: string }>;
  /** Priority images (hero/LCP banner/above-the-fold) */
  priority?: boolean;
  /** AVIF source override (optional) */
  avifSrc?: string;
  /** WebP source override (optional) */
  webpSrc?: string;
  /** Responsive srcset for high-DPI displays */
  srcSet?: string;
  /** Responsive sizes attribute */
  sizes?: string;
  className?: string;
}

/**
 * PictureImage — High-performance responsive <picture> image component.
 * Features:
 * 1. Automatic modern image format fallbacks (AVIF -> WebP -> original/SVG).
 * 2. LCP acceleration with loading="eager" & fetchPriority="high".
 * 3. Below-the-fold optimization with loading="lazy" & decoding="async".
 * 4. CLS elimination with explicit width/height & aspect-ratio preservation.
 * 5. Resilient SVG error fallback tile with cache-busting.
 */
export default function PictureImage({
  src,
  alt,
  width,
  height,
  fallbackIcon: FallbackIcon,
  priority = false,
  avifSrc,
  webpSrc,
  srcSet,
  sizes,
  className = '',
  ...rest
}: PictureImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const versionedSrc = getAssetUrl(src);

  // Derive AVIF / WebP paths if not explicitly provided and file is raster (png/jpg/jpeg)
  const isSvg = versionedSrc.toLowerCase().includes('.svg');
  const isRaster = /\.(png|jpe?g)$/i.test(src.split('?')[0]);

  const resolvedAvif = avifSrc 
    ? getAssetUrl(avifSrc) 
    : isRaster 
      ? getAssetUrl(src.replace(/\.(png|jpe?g)$/i, '.avif'))
      : undefined;

  const resolvedWebp = webpSrc 
    ? getAssetUrl(webpSrc) 
    : isRaster 
      ? getAssetUrl(src.replace(/\.(png|jpe?g)$/i, '.webp'))
      : undefined;

  // Build high-DPI 2x variants for raster formats
  const avifSrcSet = srcSet
    ? srcSet
    : resolvedAvif
      ? `${resolvedAvif} 1x, ${resolvedAvif} 2x`
      : undefined;

  const webpSrcSet = srcSet
    ? srcSet
    : resolvedWebp
      ? `${resolvedWebp} 1x, ${resolvedWebp} 2x`
      : undefined;

  const defaultSrcSet = srcSet
    ? srcSet
    : isRaster
      ? `${versionedSrc} 1x, ${versionedSrc} 2x`
      : undefined;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        style={{ width, height }}
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-850 text-zinc-300 dark:text-zinc-600 select-none ${className}`}
      >
        {FallbackIcon ? (
          <FallbackIcon className="w-1/3 h-1/3 max-w-16 max-h-16" />
        ) : (
          <DefaultGlyph />
        )}
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 px-2 text-center leading-relaxed line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  // Pure SVG assets do not require multiple raster source candidates
  if (isSvg) {
    return (
      <img
        src={versionedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => setFailed(true)}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <picture className="contents">
      {resolvedAvif && <source srcSet={avifSrcSet} sizes={sizes} type="image/avif" />}
      {resolvedWebp && <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" />}
      <img
        src={versionedSrc}
        srcSet={defaultSrcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => setFailed(true)}
        className={className}
        {...rest}
      />
    </picture>
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
