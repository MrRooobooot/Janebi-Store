# Backend: hero image settings fields (audit §3.6)

## Changes
- `server/routes/settings.ts`: added `HERO_IMAGE_DEFAULTS` (exported) with `heroSlide1Image=/products/hld-13.svg`, `heroSlide2Image=/products/cas-4.svg`, `heroSlide3Image=/products/cbl-1.svg` — the exact paths the live frontend already falls back to, so zero visual change. Merged into `DEFAULTS`/`SAFE_KEYS` for the public `GET /api/settings`.
- `server/routes/admin.ts`: admin settings allow-list (`GET/PUT /api/admin/settings`) now includes the hero image keys; `PUT` accepts only allow-listed keys with string values. `appCache.invalidate('settings')` already ran on save (verified present).
- `server/routes/reviews.ts` (new) + mounted at `/api/reviews` in `server/app.ts`: `GET /api/reviews/latest` returns the 6 most recent REAL reviews from the `reviews` table — `LEFT JOIN users` for display name (account name preferred, fallback to stored `userName`), `INNER JOIN products` for product metadata. No fabricated data. Cached 60s under `reviews:latest`; cache busted on review create (`products.ts`) and admin review delete.
- `server/routes/products.ts`: busts `reviews:latest` cache when a new review is posted.

## API shape for the frontend

`GET /api/settings` and `GET /api/admin/settings` (plus `PUT /api/admin/settings` body) now include:
```
heroSlide1Image: string  // default '/products/hld-13.svg'
heroSlide2Image: string  // default '/products/cas-4.svg'
heroSlide3Image: string  // default '/products/cbl-1.svg'
```

`GET /api/reviews/latest` → JSON array (max 6 items):
```
id: string            // e.g. "rev-101"
productId: number
productName: string   // products.title
productImage: string  // products.image
userName: string      // users.name if review has a userId, else reviews.userName
rating: number        // 1-5
title: string
comment: string
isVerifiedBuyer: boolean
date: string          // stored display string (fa-IR)
```

## Gate
`npm run verify` green (tsc strict + Vitest suites + client & server builds).
