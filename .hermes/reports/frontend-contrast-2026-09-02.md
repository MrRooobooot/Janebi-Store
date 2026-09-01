# Frontend Contrast Hotspots — Round 4 (2026-09-02d)

## Scope
WCAG AA light-mode contrast bumps on Header, Products page filter/price/sort UI, MobileBottomNav, NotFound. Pattern: one-step gray shift in light mode (400→500 / 500→600), dark mode explicitly pinned to `dark:text-gray-400` / `dark:text-zinc-400` (already passes — kept). Dual-theme invariant preserved; no hardcoded dark-only values; all Persian aria-labels and `min-touch-target` (44px) classes untouched.

## Files Modified

### src/components/Header.tsx (4 fixes)
| Element | Before | After |
|---|---|---|
| Top bar phone/hours text | `text-zinc-500 dark:text-zinc-400` | `text-zinc-600 dark:text-zinc-400` |
| User-menu ChevronDown | `text-zinc-400` | `text-zinc-500 dark:text-zinc-400` |
| User menu phone/email line | `text-zinc-500` (no dark) | `text-zinc-600 dark:text-zinc-400` |
| Mobile drawer wishlist/compare row | `text-zinc-500` (no dark) | `text-zinc-600 dark:text-zinc-400` |

### src/components/products/ProductFilterSidebar.tsx (7 fixes — Products page filter/price presets)
| Element | Before | After |
|---|---|---|
| Search icon | `text-gray-400` | `text-gray-500` |
| In-search clear button | `text-gray-500` | `text-gray-600 dark:text-gray-400` |
| Category count badges (×2, `replace_all`) | `text-gray-500` | `text-gray-600 dark:text-gray-400` |
| Brand count (unchecked) | `text-gray-400` | `text-gray-500 dark:text-gray-400` |
| Price min/max labels (×2, `replace_all`) | `text-gray-500` | `text-gray-600 dark:text-gray-400` |
| Mobile filter close button | `text-gray-500` | `text-gray-600 dark:text-gray-400` |

### src/components/products/ProductSortHeader.tsx (2 fixes — sort dropdown)
| Element | Before | After |
|---|---|---|
| "مرتب‌سازی:" label | `text-gray-500` | `text-gray-600 dark:text-gray-400` |
| Select ChevronDown | `text-gray-400` | `text-gray-500 dark:text-gray-400` |

### src/components/MobileBottomNav.tsx (1 fix)
| Element | Before | After |
|---|---|---|
| Inactive nav items | `text-zinc-500 dark:text-zinc-400` | `text-zinc-600 dark:text-zinc-400` |

### src/pages/static/NotFound.tsx (1 fix)
| Element | Before | After |
|---|---|---|
| 404 description text | `text-gray-500 dark:text-gray-400` | `text-gray-600 dark:text-gray-400` |

## Verification
- `npm run verify` → ✅ ALL HARDCORE QUALITY GATES PASSED (tsc strict + Vitest suite + production build, exit 0)
- Contrast regression gate: **`tests/accessibility.test.ts` does not exist in this repo** (searched whole tree; no axe-core/contrast suite — only `e2e/store.spec.ts` cart-flow accessibility test, unchanged). The Vitest suite run in verify passes; static check confirms no remaining `text-gray-400`/`text-zinc-400` light-mode-only classes in the touched files (all now carry an explicit `dark:` value or a ≥500 light-mode tone).

## Not in scope this round (per delegation split)
AdminProducts.tsx, FAQ.tsx, EmptyState.tsx, OrderHistory.tsx — still contain `gray-400/500` light-mode occurrences for a later round.
