import React from 'react';
import PictureImage from './PictureImage';

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
}

const BRAND_FILES: Record<string, string> = {
  apple: '/brands/apple.svg',
  'اپل': '/brands/apple.svg',
  samsung: '/brands/samsung.svg',
  'سامسونگ': '/brands/samsung.svg',
  anker: '/brands/anker.svg',
  'انکر': '/brands/anker.svg',
  xiaomi: '/brands/xiaomi.svg',
  'شیائومی': '/brands/xiaomi.svg',
  baseus: '/brands/baseus.svg',
  'بیسوس': '/brands/baseus.svg',
  nillkin: '/brands/nillkin.svg',
  'نیلکین': '/brands/nillkin.svg',
  sony: '/brands/sony.svg',
  'سونی': '/brands/sony.svg',
  jbl: '/brands/jbl.svg',
  'جی‌بی‌ال': '/brands/jbl.svg',
  'جی بی ال': '/brands/jbl.svg',
  ugreen: '/brands/ugreen.svg',
  'یوگرین': '/brands/ugreen.svg',
  beats: '/brands/beats.svg',
  'بیتس': '/brands/beats.svg',
  bose: '/brands/bose.svg',
  'بوز': '/brands/bose.svg',
  huawei: '/brands/huawei.svg',
  'هواوی': '/brands/huawei.svg',
  'هوآوی': '/brands/huawei.svg',
  lenovo: '/brands/lenovo.svg',
  'لنوو': '/brands/lenovo.svg',
  lg: '/brands/lg.svg',
  'ال‌جی': '/brands/lg.svg',
  'ال جی': '/brands/lg.svg',
  sennheiser: '/brands/sennheiser.svg',
  'سنهایزر': '/brands/sennheiser.svg',
  panasonic: '/brands/panasonic.svg',
  'پاناسونیک': '/brands/panasonic.svg',
};

export default function BrandLogo({ name, className = '', size = 'md', priority = false }: BrandLogoProps) {
  const cleanName = (name || '').trim().toLowerCase();
  
  let fileUrl = BRAND_FILES[cleanName];
  if (!fileUrl) {
    for (const [key, path] of Object.entries(BRAND_FILES)) {
      if (cleanName.includes(key)) {
        fileUrl = path;
        break;
      }
    }
  }

  const sizeClasses = {
    sm: 'h-5 max-w-[70px]',
    md: 'h-7 max-w-[100px]',
    lg: 'h-10 max-w-[130px]'
  }[size];

  if (fileUrl) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <PictureImage
          src={fileUrl}
          alt={name}
          priority={priority}
          className={`${sizeClasses} w-auto object-contain transition-transform`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center font-black text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] uppercase tracking-tight ${className}`}>
      {name}
    </div>
  );
}
