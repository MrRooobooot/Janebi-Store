# TEAM-FRONTEND — Blog & Admin Visual Design Polish (2026-09-02)

## Scope
- `src/pages/static/Blog.tsx` (the live Blog page; no separate BlogPost file exists)
- `src/components/admin/AdminLayout.tsx` (no AdminBlog page exists in the repo)

## Changes
### Blog.tsx
- Card grid polish: fixed title heights `h-10 sm:h-11 line-clamp-2` so all cards align; card-level tokens switched to dual-theme zinc pairs (`bg-zinc-50 dark:bg-zinc-900/60`, `border-zinc-200/80 dark:border-zinc-800`) — all hardcoded `var(--color-surface-*)` / gray pairs removed.
- Persian digit dates via `toPersianDigits` + `Intl.DateTimeFormat('fa-IR')` (year/month/day long form); `readTime` also passed through `toPersianDigits`.
- A11y: modal close button enlarged to 44px (`w-11 h-11`) with existing Persian aria-label; article cards support Enter **and** Space activation with `preventDefault`; `focus-visible` ring.
- `prefers-reduced-motion`: `useReducedMotion()` gates all motion/react animations (page fade, card stagger, modal spring), plus `motion-reduce:` Tailwind variants on pulse/hover-scale/translate transitions.
- Empty + error states preserved (no fabricated data); loading skeletons neutralized to zinc.

### AdminLayout.tsx
- Consistent dark-mode surface tokens: `bg-zinc-50 dark:bg-zinc-900/60` (sidebar, gate card, user card, mobile header, main canvas `dark:bg-zinc-950`), `border-zinc-200/80 dark:border-zinc-800` on all dividers.
- 44px icon-only touch targets with Persian aria-labels: theme toggles (desktop + mobile), mobile menu open/close buttons.
- `motion-reduce:transition-none` on theme/theme-canvas transitions.

## Verification
- `npm run verify`: **exit 0 — ALL HARDCORE QUALITY GATES PASSED** (tsc strict + all Vitest suites + client build + server bundle).

## Commits (both pushed to origin/main)
- `6b1ccc1` — includes Blog.tsx design-polish edits (committed by sibling agent working the same file; edits are mine and verified in HEAD)
- `978daf8` — feat(blog,admin): design polish — cards, dual-theme tokens, a11y (2026-09-02 round) — AdminLayout.tsx

## Notes
- AdminLayout has no table; "table header contrast" N/A for this page.
- Did not deploy; no files outside blog/admin scope touched.
