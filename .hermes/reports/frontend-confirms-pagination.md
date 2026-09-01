# Frontend Cluster: Confirm Dialogs + Pagination + Bulk Actions UI

**Date**: 2026-09-01 · Scope: src/ only (no server changes) · Gate: ✅ `npm run verify` PASSED (strict tsc + Vitest + client/server build)

## Files Changed
- `src/components/admin/PageControls.tsx` (new) — shared admin pagination controls (Persian digits, ≥44px tap targets, Persian aria-labels) + `unwrapList()` helper that tolerates both plain-array and `{items,total}` API envelopes.
- `src/pages/admin/Messages.tsx` — pagination (12/page), per-card selection checkboxes, bulk toolbar: "خواندن همه پیام‌ها" (POST `/api/admin/messages/read-all`) and "حذف انتخاب‌شده‌ها" (POST `/api/admin/messages/bulk-delete` with `{ids}`), both with optimistic refresh + rollback + error toast; 404 handled gracefully with toast "این قابلیت هنوز در سرور فعال نشده است". Bulk-delete uses the repo's existing `window.confirm` Persian pattern.
- `src/pages/admin/Orders.tsx` — pagination (10/page), select-all-per-page + per-row checkboxes, bulk-delete bar (POST `/api/admin/orders/bulk-delete`, `{ids}`) with `window.confirm`, optimistic refresh + rollback + toasts, 404-graceful. colSpan updated 7→8.
- `src/pages/admin/Users.tsx` — pagination (10/page), `unwrapList` on fetch.
- `src/pages/admin/Dashboard.tsx` — Persian onboarding empty-state card when totalProducts===0 or totalOrders===0, with links to `/admin/products` and `/admin/orders` (44px buttons, Lucide Rocket/Package/ShoppingCart icons).

## Findings
- Delete flows already confirmed: Coupons, Users (role change), Products, Reviews, Newsletter all use the existing `window.confirm` Persian pattern — Reviews needed no change. Messages and Orders previously had no destructive action, so confirm was added on the new bulk-delete flows.
- `GET /api/admin/orders`, `/api/admin/users`, `/api/admin/contact-messages` currently return plain arrays (no server pagination except audit_logs) — pagination implemented client-side and `unwrapList` keeps it compatible if the backend wraps responses later.
- Bulk endpoints (`messages/read-all`, `messages/bulk-delete`, `orders/bulk-delete`) were not present server-side at time of writing; UI ships with 404-graceful handling so nothing breaks until the parallel backend work lands.

## Gate Result
`npm run verify` → ✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED) — typecheck, all Vitest suites, Vite client build + esbuild server bundle.
