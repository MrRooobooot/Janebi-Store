# Frontend Product Detail Polish — 2026-09-02 (TEAM-FRONTEND)

## Scope
Product detail page only (`src/pages/ProductDetail.tsx`). No server changes. Not deployed (orchestrator deploys).

## Design item shipped
**Sticky desktop buy-box** (`hidden lg:flex`, appears via existing IntersectionObserver when main action row scrolls out of view):
- Price + strike-through original price + stock chip + add-to-cart, wishlist (44px), compare (44px).
- Floating rounded-2xl glass bar, theme tokens only (`--color-surface-*`, `--color-border-*`), orange CTA gradient.
- Persian copy, `active:scale` micro-interactions.

## SEO item shipped (Product JSON-LD enrichment)
- `image` as array with absolute URLs (`https://janebiarena.ir` + path).
- `sku` added only when present on product (no `mpn` — field doesn't exist in schema, not fabricated).
- `additionalProperty` (PropertyValue) from real data: دسته‌بندی (category), برند (brand), گارانتی (warranty), and each `features[]` entry as ویژگی.
- FAQPage schema **skipped** — no FAQ source exists on the page.

## A11y polish
- Share, lightbox-close, wishlist, compare icon-only buttons now ≥44px with Persian `aria-label` (share/close previously had `title` only or none).

## Verify
```
======================================================
✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)
======================================================
```
`npm run verify` — typecheck + full test suite + client/server build: ALL GREEN.

## Commit
`58e34f71a85117930fe632d0be8e88a222a3d24d` — `feat(product): sticky buy-box/gallery polish + JSON-LD enrichment` (pushed to main, 1 file changed, +107/−6)

## Files touched
- `src/pages/ProductDetail.tsx`
