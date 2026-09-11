/**
 * Janebi Arena Design System Tokens & Unified UI Kit
 * ═══════════════════════════════════════════════════════════════════
 * Single TypeScript source of truth for UI/UX styling.
 * Directly synced with `src/design/tokens.json`, `src/index.css` @theme,
 * and backend `server/routes/settings.ts`.
 *
 * All components should use these semantic class tokens instead of
 * ad-hoc hardcoded colors, borders, or shadows.
 * ═══════════════════════════════════════════════════════════════════
 */

import tokensJson from './tokens.json';

export const tokens = tokensJson;

/**
 * Standard semantic Tailwind class combinations.
 * Change here to update every component throughout the store.
 */
export const UI = {
  // Surface Containers
  surface: {
    canvas: 'bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] text-slate-900 dark:text-slate-100',
    card: 'bg-white dark:bg-[#0e1629] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-xs transition-colors',
    cardHover: 'bg-white dark:bg-[#0e1629] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.16] hover:shadow-md transition-all',
    elevated: 'bg-white dark:bg-[#121c33] border border-slate-200/80 dark:border-white/[0.08] rounded-3xl shadow-sm',
    header: 'bg-white/90 dark:bg-[#0c1220]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08]',
    footer: 'bg-slate-50 dark:bg-[#070b14]/95 border-t border-slate-200/80 dark:border-white/[0.08]',
    drawer: 'bg-white dark:bg-[#0e1629] text-slate-900 dark:text-slate-100 shadow-2xl border-slate-200/80 dark:border-white/[0.08]',
    subtle: 'bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]',
  },

  // Interactive Buttons
  button: {
    cta: 'bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white font-black rounded-xl shadow-sm shadow-[var(--color-cta)]/25 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center min-touch-target',
    secondary: 'bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors inline-flex items-center justify-center min-touch-target',
    outline: 'border border-slate-200 dark:border-white/[0.1] hover:border-slate-300 dark:hover:border-white/[0.2] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] font-bold rounded-xl transition-colors inline-flex items-center justify-center min-touch-target',
    ghost: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors inline-flex items-center justify-center',
    brandSubtle: 'bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 text-[var(--color-emphasis-text)] border border-primary-200 dark:border-primary-800/60 font-black rounded-xl transition-colors inline-flex items-center justify-center min-touch-target',
  },

  // Badges & Pills
  badge: {
    brand: 'bg-[var(--color-cta)]/10 text-[var(--color-emphasis-text)] border border-[var(--color-cta)]/30 rounded-full font-bold',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-full font-bold',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-full font-bold',
    neutral: 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.08] rounded-full font-bold',
    discount: 'bg-rose-600 text-white font-mono font-black rounded-full shadow-xs',
  },

  // Form Inputs
  input: {
    base: 'w-full bg-white dark:bg-[#0e1629] border border-slate-200/90 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl py-2.5 px-3.5 text-xs font-medium focus:outline-none focus:border-[var(--color-cta)] focus:ring-2 focus:ring-[var(--color-cta)]/20 transition-all',
    select: 'w-full appearance-none bg-white dark:bg-[#0e1629] border border-slate-200/90 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-4 pr-3 pl-9 text-xs font-bold focus:outline-none focus:border-[var(--color-cta)]/50 transition-all cursor-pointer',
  },

  // Typography
  text: {
    pageTitle: 'text-2xl sm:text-3xl font-black text-slate-900 dark:text-white',
    sectionTitle: 'text-lg sm:text-xl font-black text-slate-900 dark:text-white',
    cardTitle: 'text-sm font-black text-slate-900 dark:text-slate-100 leading-snug',
    body: 'text-xs sm:text-sm text-slate-600 dark:text-slate-400',
    caption: 'text-[11px] text-slate-500 dark:text-slate-400 font-medium',
    price: 'font-mono font-black text-[var(--color-emphasis-text)] tracking-tight',
  },
} as const;

export default UI;
