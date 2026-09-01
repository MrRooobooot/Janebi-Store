# Product Detail Page Design Polish — 2026-09-03

**Cluster**: DESIGN (product page rotate) · **Gate**: `npm run verify` ✅ PASS · jsxDEV=0 · /Users/=0

## Changes

### 1. Product gallery interaction (`src/pages/ProductDetail.tsx`)
- Gallery now supports multi-image products via new optional `Product.images` field (`src/types/index.ts`); falls back to single `image`. Thumbnails render only from real product data (no placeholders).
- Main image swaps via `AnimatePresence mode="wait"` crossfade/scale (220ms ease-out).
- Thumbnails: hover AND focus AND click swap; active thumb uses brand tokens — `border-primary-300` (#F47C20 family) + `ring-2 ring-primary-300/60` + `--shadow-glow-orange`; inactive hover shifts to `primary-200/300`.
- Keyboard: natively focusable buttons + ArrowLeft/ArrowRight roving navigation (RTL-aware: Left = previous) with focus management; Persian `aria-label` («نمایش تصویر ۱ از ۳»), `aria-current`, `aria-pressed`, grouped `role="group"`.
- Touch targets ≥44px (`min-w/h-[44px]`); focus-visible outline in `primary-700` (#994700 ring token).

### 2. Specs table polish (`src/pages/ProductDetail.tsx`)
- Zebra rows on the specs `<dl>`: `even:bg-[var(--color-canvas-light)]/60 dark:even:bg-white/[0.035]` on all 5 row variants.
- Dark-token compliance: removed ALL hardcoded `bg-gray-800*` surfaces from the page (spec container, price box, trust badges, lightbox zoom button, sticky bars, hover states) → token/alpha surfaces (`dark:bg-white/[0.035–0.08]`, `var(--color-canvas-light)`). `grep bg-gray-800|bg-zinc-900` = 0 in file.
- Dividers switched to `--color-border-subtle-*` tokens. Persian digits verified (counts, thumbnail alts via `toPersianDigits`).

### 3. Breadcrumbs — audited live, no change needed
- https://janebiarena.ir/product/14 (headless check): visible RTL nav `خانه › محصولات › محافظ کابل › …` + `BreadcrumbList` JSON-LD present with absolute URLs (rendered by `src/components/DynamicBreadcrumbs.tsx` via global Layout).

### A11y invariants
- Icon buttons ≥44px mobile, Persian aria-labels everywhere; `prefers-reduced-motion` covered by existing global CSS kill-switch in `src/index.css` (all transitions/animations ~0ms).

## Verification
- `npm run verify` → ✅ ALL HARDCORE QUALITY GATES PASSED (tsc strict + 297 Vitest + build), exit 0.
- Post-build audit: `jsxDEV` count = 0 in all dist chunks; `/Users/` leaks = 0.
- `tsc --noEmit` clean. Not deployed (orchestrator deploys).
