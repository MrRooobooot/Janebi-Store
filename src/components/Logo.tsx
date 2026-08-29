import React from 'react';

interface LogoSymbolProps {
  className?: string;
  size?: number | string;
  theme?: 'default' | 'white' | 'dark';
}

export function LogoSymbol({ className = "w-9 h-9", size, theme = 'default' }: LogoSymbolProps) {
  const mainStrokeColor = theme === 'white' 
    ? '#FFFFFF' 
    : theme === 'dark' 
    ? '#0B1536' 
    : 'currentColor';

  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top-left orange arc */}
      <path 
        d="M 23 40 A 32 32 0 0 1 54 18" 
        stroke="#F47C20" 
        strokeWidth="12" 
        strokeLinecap="round" 
      />
      
      {/* Top-right electric blue dot */}
      <circle 
        cx="77" 
        cy="24" 
        r="6.5" 
        fill="#1E70EB" 
      />

      {/* Dynamic Navy/Theme J-Body */}
      <path 
        d="M 77 46 L 77 56 C 77 74 63 82 50 82 C 32 82 18 70 18 52 C 18 39 28 32 39 32 C 49 32 55 40 55 49 C 55 58 48 63 42 63" 
        stroke={mainStrokeColor} 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  variant?: 'full' | 'symbol' | 'en';
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = "", variant = 'full', size = 'md' }: LogoProps) {
  const symbolSizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9 sm:w-11 sm:h-11",
    lg: "w-12 h-12 sm:w-14 sm:h-14"
  };

  const textSizes = {
    sm: "text-sm sm:text-base",
    md: "text-base sm:text-xl",
    lg: "text-xl sm:text-2xl"
  };

  if (variant === 'symbol') {
    return <LogoSymbol className={`${symbolSizes[size]} ${className}`} />;
  }

  if (variant === 'en') {
    return (
      <div className={`flex items-center gap-2.5 sm:gap-3 group ${className}`}>
        <div className="relative p-1 rounded-2xl bg-zinc-100/90 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
          <LogoSymbol className={symbolSizes[size]} />
        </div>
        <div className="flex flex-col text-left">
          <span className={`${textSizes[size]} font-black tracking-tight text-zinc-900 dark:text-white`}>
            Janebi <span className="text-[#F47C20]">Arena</span>
          </span>
          <span className="text-[8px] sm:text-[9px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider font-mono">
            OFFICIAL STORE
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 group ${className}`}>
      <div className="relative p-1 sm:p-1.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-all duration-300">
        <LogoSymbol className={symbolSizes[size]} />
      </div>
      <div className="flex flex-col text-right">
        <div className="flex items-center gap-1">
          <span className={`${textSizes[size]} font-black tracking-tight text-[#0B1536] dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors`}>
            جانبی
          </span>
          <span className={`${textSizes[size]} font-black tracking-tight text-[#F47C20]`}>
            آرنا
          </span>
        </div>
        <span className="text-[8px] sm:text-[9px] text-zinc-400 dark:text-zinc-500 -mt-0.5 font-black tracking-[0.18em] uppercase font-mono">
          JANEBI ARENA
        </span>
      </div>
    </div>
  );
}
