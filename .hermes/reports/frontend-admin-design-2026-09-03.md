# Frontend Admin Design Polish — Round 7 (2026-09-03)

**Scope**: Remaining admin pages not yet covered by rounds 5/6 (commits `0bf6ba6`, `20fbd1b`). Visual-only changes; zero logic edits.

## Files changed
- `src/pages/admin/Users.tsx` (9 edits)
- `src/pages/admin/Settings.tsx` (2 edits)
- `src/pages/admin/Coupons.tsx` (10 edits)
- `src/pages/admin/Messages.tsx` (13 edits)
- `src/components/admin/AdminLayout.tsx` (3 edits)

## Note on AdminBlog.tsx
No `AdminBlog.tsx` exists in this repo — blog is storefront-only (`src/pages/static/Blog.tsx`), with no admin blog management page. Task item skipped; nothing to polish.

## Changes applied (established round 5/6 pattern)
1. **WCAG contrast (light mode)** — `gray-400`/`gray-500` body text shifted to `gray-500`/`gray-600` (≥4.5:1), dark side kept at `gray-400`:
   - Page subtitles, table headers, empty/loading states, card field labels (Coupons/Messages), VIP-points & contact captions, date/`faDate` captions.
   - Decorative icons (`Search`, `ArrowRight`) `gray-400 → gray-500`.
   - Disabled-inactive chip `text-gray-400 → gray-500 dark:text-gray-300` (Coupons).
   - AdminLayout: gate text `gray-500 → gray-600`; "ADMIN PANEL" eyebrow `zinc-400 → zinc-500` (light) with dark bumped to `zinc-400`.
2. **Icon-only 44px targets + Persian aria-labels**:
   - All modal close (X) buttons now `p-3` with `-m-*` offset (44×44px hit area, visual footprint preserved) + `aria-label="بستن ..."`; Users ×2, Coupons ×1, Messages ×1.
   - Messages row archive toggle: `p-1.5 → p-3 -m-1.5` (icon 14px + 24px ≈ 42px; rounded-lg preserved). Already had Persian aria-label.
   - Coupons copy button: `p-2.5 → p-3.5` (44px) + added `aria-label="کپی کد تخفیف <code>"`.
   - AdminLayout header/menu/theme/close buttons audited — already `w-11 h-11` with Persian labels; unchanged.
3. **Dark-mode consistency**: all new light-side shifts carry explicit `dark:text-gray-400` / `dark:text-gray-300`; no new non-zinc tokens introduced in AdminLayout (zinc system untouched).

## Verification
- `npm run verify` → **✅ ALL HARDCORE QUALITY GATES PASSED** (typecheck, 297 tests, full build; exit 0).
- `grep gray-400` on the 5 files: no remaining light-mode `text-gray-400` outside paired `dark:` tokens.
- No deploy performed (per instructions).

## Commit
`design(admin): contrast + a11y polish round 7 (2026-09-03)`
