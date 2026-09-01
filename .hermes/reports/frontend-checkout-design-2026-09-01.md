# Frontend Checkout Design Cluster — 2026-09-01

## Scope
Cart/Checkout UI polish: stepper, order summary, touch targets, theme audit. No server/ or blog changes.

## Findings
Most of the cluster was already at target state (prior passes): Persian digits via `toPersianDigits`, `formatPrice` on all amounts, sticky summary (`sticky top-28`), token-based dual-theme surfaces, global `:focus-visible` ring `#994700` (light) / `#ffb68b` (dark) in `src/index.css`, and brand palette `#F47C20` (primary-300) / `#EA580C` (primary-400) in `@theme`.

## Changes
- `src/components/cart/CartDrawer.tsx`
  - Icon-only quantity +/− buttons: `w-5 h-5` → `min-touch-target w-9 h-9` (44px), icons h-3→h-4, rounded/transition added; Persian aria-labels kept.
  - Remove-item button: `p-1` → `min-touch-target p-2` + rose hover bg.
  - Drawer close button: added `min-touch-target` (44px).
- `src/components/checkout/CheckoutStepsBar.tsx`
  - Completed step badge: solid `bg-primary-300` → brand gradient `from-primary-300 to-primary-400` (#F47C20 → #EA580C) for both light/dark.
  - Completed step Link: explicit `focus-visible` ring — `ring-primary-700` (#994700) light / `ring-primary-200` dark, offset to canvas tokens; focus scales badge.

## Verified
- Stepper: all step numbers/labels already use `toPersianDigits`; current-step ring uses brand tokens; upcoming steps use tokened surfaces (no untokened `bg-zinc-950`/`gray-800`).
- Order summary: labels right / prices left under RTL, `formatPrice` on every amount (line items, totals, shipping, final), `sticky top-28` on desktop, clean mobile stack via grid `lg:grid-cols-12`.
- Touch targets: all icon-only buttons across Cart page, CartDrawer, and Checkout surfaces ≥44px (`min-touch-target`), all with Persian `aria-label`.
- Theme audit (Cart, Checkout, CheckoutCallback, CartDrawer, FreeShippingBar, forms): every surface uses `--color-surface/canvas/border` var pairs with `dark:` variants — no stuck dark elements in light mode found.
- Gate: `npm run verify` — ✅ ALL HARDCORE QUALITY GATES PASSED (typecheck + 297 tests + full build).
