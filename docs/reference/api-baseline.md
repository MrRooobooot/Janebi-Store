# API baseline — Janebi Store

> **Status:** living · **Updated:** 2026-10-13 · **Scope:** every HTTP route under `/api`, its access level, and the file that defines it. Request and response shapes live in `server/validators/index.ts` and the route files; this page does not repeat them.

## How this list was read

Taken from the mounts in `server/app.ts` and the `router.*` calls under `server/routes/`, following `router.use(subRouter)` into `server/routes/admin/`. There is no generator in the repo; re-read those files to refresh it. Count at 2026-10-13: 81 routes.

- **Access**
  - `public`: no `authenticate` on the route and no file-level `router.use(authenticate)`.
  - `user`: `authenticate` on the route, or file-level `router.use(authenticate)`.
  - `admin`: `authenticate` + `requireAdmin`, applied with `router.use` in `server/routes/admin.ts`. `upload.ts` is mounted under `/api/admin/upload`.
- `POST /api/coupons` is an alias of `POST /api/coupons/validate` (same handler). Coupon creation is `POST /api/admin/coupons`.
- `/api/auth/refresh`, `/api/auth/session`, `/api/auth/logout` have no `authenticate` middleware; their checks are inside the handlers in `server/routes/auth.ts`.

## Rate limits (`server/app.ts`)

| Limiter | Applies to | Limit |
|---|---|---|
| general `limiter` | every `/api/` request | 600 per 15 min per IP |
| `authLimiter` | `/api/auth/login`, `/register`, `/otp/send`, `/otp/verify`, `/reset-password` | 5 per minute per IP |
| `strictActionLimiter` | `/api/orders`, `/api/payment/request`, `/api/auth/refresh` | 20 per minute per IP |
| `couponLimiter` | `/api/coupons`, `/api/coupons/validate` | 10 per 15 min per IP |
| `contactLimiter` | `/api/contact` | 10 per 15 min per IP |
| `newsletterLimiter` | `/api/contact/newsletter` | 5 per 15 min per IP |
| `cspReportLimiter` | `/api/csp-report` | 60 per 15 min per IP |

## Non-API routes

- `GET /sitemap.xml`: dynamic sitemap (`server/routes/sitemap.ts`).
- `GET /pay/:authority`: server-rendered gateway handoff (`server/app.ts`).
- Every other path is served by the React SPA.

## Routes

| Method | Path | Access | Defined in |
|---|---|---|---|
| GET | `/api/admin/analytics` | admin | `server/routes/admin/stats.ts` |
| GET | `/api/admin/audit-logs` | admin | `server/routes/admin/auditLogs.ts` |
| GET | `/api/admin/backup` | admin | `server/routes/admin/backup.ts` |
| GET | `/api/admin/contact-messages` | admin | `server/routes/admin/messages.ts` |
| PUT | `/api/admin/contact-messages/:id/status` | admin | `server/routes/admin/messages.ts` |
| GET | `/api/admin/coupons` | admin | `server/routes/admin/coupons.ts` |
| POST | `/api/admin/coupons` | admin | `server/routes/admin/coupons.ts` |
| DELETE | `/api/admin/coupons/:code` | admin | `server/routes/admin/coupons.ts` |
| PUT | `/api/admin/coupons/:code` | admin | `server/routes/admin/coupons.ts` |
| POST | `/api/admin/messages/bulk-delete` | admin | `server/routes/admin/messages.ts` |
| POST | `/api/admin/messages/read-all` | admin | `server/routes/admin/messages.ts` |
| GET | `/api/admin/newsletter` | admin | `server/routes/admin/newsletter.ts` |
| DELETE | `/api/admin/newsletter/:email` | admin | `server/routes/admin/newsletter.ts` |
| GET | `/api/admin/orders` | admin | `server/routes/admin/orders.ts` |
| PUT | `/api/admin/orders/:id/status` | admin | `server/routes/admin/orders.ts` |
| PUT | `/api/admin/orders/:id/tracking` | admin | `server/routes/admin/orders.ts` |
| POST | `/api/admin/orders/bulk-delete` | admin | `server/routes/admin/orders.ts` |
| GET | `/api/admin/products` | admin | `server/routes/admin/products.ts` |
| POST | `/api/admin/products` | admin | `server/routes/admin/products.ts` |
| DELETE | `/api/admin/products/:id` | admin | `server/routes/admin/products.ts` |
| PUT | `/api/admin/products/:id` | admin | `server/routes/admin/products.ts` |
| GET | `/api/admin/reviews` | admin | `server/routes/admin/reviews.ts` |
| DELETE | `/api/admin/reviews/:id` | admin | `server/routes/admin/reviews.ts` |
| PUT | `/api/admin/reviews/:id/approved` | admin | `server/routes/admin/reviews.ts` |
| GET | `/api/admin/settings` | admin | `server/routes/admin/settings.ts` |
| PUT | `/api/admin/settings` | admin | `server/routes/admin/settings.ts` |
| GET | `/api/admin/stats` | admin | `server/routes/admin/stats.ts` |
| POST | `/api/admin/upload/product-image` | admin | `server/routes/upload.ts` |
| GET | `/api/admin/users` | admin | `server/routes/admin/users.ts` |
| PUT | `/api/admin/users/:id/password` | admin | `server/routes/admin/users.ts` |
| PUT | `/api/admin/users/:id/points` | admin | `server/routes/admin/users.ts` |
| PUT | `/api/admin/users/:id/role` | admin | `server/routes/admin/users.ts` |
| POST | `/api/auth/login` | public | `server/routes/auth.ts` |
| POST | `/api/auth/logout` | public | `server/routes/auth.ts` |
| GET | `/api/auth/me` | user | `server/routes/auth.ts` |
| POST | `/api/auth/otp/send` | public | `server/routes/auth.ts` |
| GET | `/api/auth/otp/status` | public | `server/routes/auth.ts` |
| POST | `/api/auth/otp/verify` | public | `server/routes/auth.ts` |
| POST | `/api/auth/refresh` | public | `server/routes/auth.ts` |
| POST | `/api/auth/register` | public | `server/routes/auth.ts` |
| POST | `/api/auth/reset-password` | public | `server/routes/auth.ts` |
| POST | `/api/auth/session` | public | `server/routes/auth.ts` |
| GET | `/api/blog` | public | `server/routes/blog.ts` |
| GET | `/api/brands` | public | `server/routes/brands.ts` |
| DELETE | `/api/cart` | user | `server/routes/cart.ts` |
| GET | `/api/cart` | user | `server/routes/cart.ts` |
| POST | `/api/cart` | user | `server/routes/cart.ts` |
| DELETE | `/api/cart/:id` | user | `server/routes/cart.ts` |
| PUT | `/api/cart/:id` | user | `server/routes/cart.ts` |
| GET | `/api/categories` | public | `server/routes/categories.ts` |
| POST | `/api/contact` | public | `server/routes/contact.ts` |
| POST | `/api/contact/newsletter` | public | `server/routes/contact.ts` |
| GET | `/api/coupons-active` | public | `server/routes/coupons-active.ts` |
| POST | `/api/coupons` | public | `server/routes/coupons.ts` |
| POST | `/api/coupons/validate` | public | `server/routes/coupons.ts` |
| POST | `/api/csp-report` | public | `server/app.ts` |
| GET | `/api/health` | public | `server/app.ts` |
| GET | `/api/orders` | user | `server/routes/orders.ts` |
| POST | `/api/orders` | user | `server/routes/orders.ts` |
| GET | `/api/orders/:id` | user | `server/routes/orders.ts` |
| POST | `/api/orders/:id/cancel` | user | `server/routes/orders.ts` |
| GET | `/api/orders/my-orders` | user | `server/routes/orders.ts` |
| POST | `/api/payment/request` | user | `server/routes/payment.ts` |
| GET | `/api/payment/verify` | public | `server/routes/payment.ts` |
| GET | `/api/products` | public | `server/routes/products.ts` |
| GET | `/api/products/:id` | public | `server/routes/products.ts` |
| GET | `/api/products/:id/reviews` | public | `server/routes/products.ts` |
| POST | `/api/products/:id/reviews` | public | `server/routes/products.ts` |
| GET | `/api/reviews/latest` | public | `server/routes/reviews.ts` |
| GET | `/api/settings` | public | `server/routes/settings.ts` |
| GET | `/api/users/me` | user | `server/routes/users.ts` |
| PUT | `/api/users/me` | user | `server/routes/users.ts` |
| GET | `/api/users/me/addresses` | user | `server/routes/users.ts` |
| POST | `/api/users/me/addresses` | user | `server/routes/users.ts` |
| DELETE | `/api/users/me/addresses/:id` | user | `server/routes/users.ts` |
| PUT | `/api/users/me/addresses/:id` | user | `server/routes/users.ts` |
| PUT | `/api/users/me/addresses/:id/default` | user | `server/routes/users.ts` |
| PUT | `/api/users/me/password` | user | `server/routes/users.ts` |
| GET | `/api/wishlist` | user | `server/routes/wishlist.ts` |
| POST | `/api/wishlist` | user | `server/routes/wishlist.ts` |
| DELETE | `/api/wishlist/:id` | user | `server/routes/wishlist.ts` |

Refresh the table from the route files when a route is added, removed or moved. The count in the header is the one to update.
