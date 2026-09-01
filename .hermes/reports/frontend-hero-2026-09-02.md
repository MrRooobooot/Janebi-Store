# Frontend Hero/Slider Polish Round — 2026-09-02e

## Scope
Home page hero slider (src/pages/Home.tsx) + shared Persian typography util (src/lib/utils.ts) + hero transition CSS (src/index.css).

## Changes

### 1. Slide transition smoothness + prefers-reduced-motion
- Added `hero-slide-content` class (crossfade + 10px lift, 480ms ease-out-quint) applied to the slide grid via `key={activeSlide}` remount — smooth enter animation per slide instead of a hard content swap.
- Auto-advance interval is now fully skipped when `window.matchMedia('(prefers-reduced-motion: reduce)')` matches.
- Global `@media (prefers-reduced-motion: reduce)` in index.css also disables the keyframe animation; image/icon hover transforms get `motion-reduce:` Tailwind guards.

### 2. Pagination dots — contrast / theme-awareness
- Active dot: `bg-primary-400 dark:bg-primary-300` (brand tokens, higher contrast than previous flat orange-500).
- Inactive dots upgraded: `bg-zinc-400 dark:bg-zinc-600` hover `zinc-500`/`zinc-400` (was zinc-300/dark:zinc-700 — too low contrast in both themes).
- Added `role="tablist"`/`role="tab"`/`aria-selected`; `aria-label` now uses `toPersianDigits(idx + 1)` (e.g. "اسلاید ۲").

### 3. Persian typography of slide headlines
- New `normalizePersianTypography()` in src/lib/utils.ts: Arabic ي/ك → Persian ی/ک, repairs broken ZWNJ (`می شود`→`می‌شود`, `سازنده ها`→`سازنده‌ها`, `بزرگ تر`→`بزرگ‌تر`), and routes through `toPersianDigits` so any ASCII digits in settings-provided copy render as Persian digits.
- Applied to slide tag, title, subtitle, CTA text, badge, and image alt text in the hero.

### 4. CTA hover — brand palette
- CTA changed from `bg-orange-600 hover:bg-orange-500` to `bg-primary-300 hover:bg-primary-500 active:bg-primary-600` — exactly #F47C20 fill → #D94E06 hover per DESIGN.md, with `shadow-primary-500/30` and a `focus-visible:outline-primary-700` ring.

### 5. Zero CLS
- Hero `PictureImage` retains explicit `width="320" height="320"` + `priority` (eager/fetchPriority=high); unchanged (already compliant) and verified.

### 6. No hardcoded dark-only backgrounds
- Hero gradient dark stops replaced: `dark:from-[#0e1422] via-[#090d16] to-[#05070c]` → `dark:from-[var(--color-surface-elevated-dark)] via-[var(--color-surface-dark)] to-[var(--color-canvas-dark)]`.
- Ambient dot-grid hardcoded hexes `#0000000a`/`#ffffff0a` → `var(--color-border-light)` / `var(--color-border-dark)`.
- Fixed broken dynamic class: `border-orange-200/80 dark:${slide.borderColor}` (interpolated `dark:` prefix produced no dark variant) → slide data now carries full `light dark:` class strings, used verbatim.

## Verification
- `npm run verify` → ✅ ALL HARDCORE QUALITY GATES PASSED (typecheck + 297 vitest tests + full build).

## Files Changed
- src/pages/Home.tsx
- src/lib/utils.ts
- src/index.css
