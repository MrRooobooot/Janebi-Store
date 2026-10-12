# SEO metadata baseline: ownership, behaviour and evidence

> Recorded 2026-10-12 on the local working tree (not deployed). Production stays at
> `63e4cab`. Measurements come from a local production build against a scratch SQLite
> database with three fake products and two fake blog posts. No production or
> development data was read or changed.

## 1. Who owns each route's head

| Route | Head written by | Server (raw HTML) | Client (after hydration) |
|---|---|---|---|
| `/` | `HOME_SEO` (mirror of `index.html`) | shell values | `RouteHead` (same values) |
| `/products` (hub) | `catalogCopy.ts` via `Products.tsx` | `routeMetaForRequest` + catalogue snapshot | `applyCatalogSeo` once the listing has loaded |
| `/products?category=`, `?brand=` | same | live count, filtered canonical | same |
| `/products?search=…` | same | `noindex` | `noindex` |
| `/product/:id`, `/products/:id` | `productSeo.ts` | product row, canonical `/products/:id` | `ProductDetail` after its fetch |
| `/product/:id` unknown | `NOT_FOUND_SEO` | HTTP 404 | `ProductDetail` (not-found head) |
| `/blog` | registry (`/blog`) | registry | `RouteHead` |
| `/blog/:slug` published | `blogPostSeo` (routeSeo.ts), DB row | post title, excerpt, canonical | `Blog.tsx` after `/api/blog` loads |
| `/blog/:slug` unknown or draft | `NOT_FOUND_SEO` | HTTP 404 (was 200 soft 404) | `Blog.tsx` (not-found head) |
| `/blog/:slug` lookup fails (database error) | `articleMeta` throws `SeoLookupUnavailable` | HTTP 503, `Retry-After: 60`, `Cache-Control: no-store`, fixed body (no 404, no shell) | not rendered (the server already answered 503) |
| Static pages (`/about`, `/cart`, …) | `routeSeo.ts` registry | registry | `RouteHead` |
| `/admin/*` | registry (admin, noindex) | registry | `RouteHead` |
| Unknown URL | `NOT_FOUND_SEO` | HTTP 404 | `RouteHead` |

Ownership rule: the registry (`src/lib/routeSeo.ts`) is the only table of static copy;
the server and `RouteHead` both read it. Pages that own dynamic data (catalogue, product,
blog article) write their own head after their data has loaded. `RouteHead` resets the
head whenever the route changes, so a head never outlives its route.

## 2. Behaviour before this pass (probe, 2026-10-12 morning)

Probe: `probe-routes` (raw HTML from the server, DOM after a direct load, 1.5 s settle).

| Route | Problem |
|---|---|
| `/cart`, `/checkout`, `/checkout/callback`, `/profile`, `/login`, `/register`, `/force-change-password`, `/admin` | title = homepage, canonical = `/` (noindex pages still pointed at the homepage) |
| `/products/999999`, unknown URL | HTTP 404, but title = homepage |
| `/blog/<draft>`, `/blog/<unknown>` | HTTP 200 with homepage title and canonical (soft 404) |
| `/blog/<published>` (direct) | two BlogPosting blocks in the DOM (server prerender + client) |
| `/products` (direct) | `numberOfItems` written as `0`, then `3` (sequence observed in a MutationObserver probe) |
| `/products` → product → home (SPA) | product canonical and title stayed on the homepage; `product-schema-jsonld` stayed |
| Twitter tags on routes without registry metadata (cart, checkout, account, login, admin, 404s) | homepage copy |
| Visible and metadata claims | «بهترین قیمت»، «تضمین کیفیت»، «ارسال سریع»، «گارانتی تعویض فیزیکی»، «گارانتی معتبر»، «اورجینال» |

Also observed at the same point: a probe regex bug in my own measurement (escaping of
`ld+json`) gave empty raw JSON-LD columns for a while; it was corrected before any result
here was taken from it.

## 3. Behaviour after this pass

| Check | Before | After |
|---|---|---|
| Raw HTML title and canonical on every public route | homepage title for `/cart`, `/checkout`, `/checkout/callback`, `/profile`, `/login`, `/register`, `/force-change-password`, `/admin`, and the unknown-URL and unknown-product 404s | each route's own; 404s have no canonical |
| Unknown and unpublished blog URL | HTTP 200 | HTTP 404 with not-found head |
| Article lookup fails (database error) | HTTP 404 with `noindex` (a regression introduced earlier in this pass, found in the release review) | HTTP 503 with `Retry-After` and `no-store`; a healthy database still answers 200 |
| `numberOfItems` on a direct `/products` load | `3` (SSR), `0`, `3` | `3` (SSR), `3` |
| BlogPosting blocks on a direct article load | 2 | 1 |
| BreadcrumbList on an article | client breadcrumb with raw slug label | server breadcrumb with post title (kept) |
| Product → home (SPA) | canonical and title stayed on the product | homepage canonical and title; no Product block |
| Twitter title on non-home routes | homepage copy | the route's own title |

## 4. Tests that cover each item

| Item | Test |
|---|---|
| Every App.tsx route is known to the registry | `tests/unit/route-registry.test.ts` |
| Registry noindex equals the server's `shouldNoIndex` | `tests/unit/route-registry.test.ts` |
| Static titles distinct; every canonical absolute and self | `tests/unit/route-registry.test.ts` |
| Server head per static route (title, canonical, og, twitter, robots) | `tests/unit/route-seo-pages.test.ts` |
| 404 head: no canonical, no og:url, noindex | `tests/unit/route-seo-pages.test.ts`, `e2e/route-seo-coverage.spec.ts` |
| Draft and unknown blog URL: no head, HTTP 404 | `tests/unit/route-seo-pages.test.ts`, `e2e/route-seo-coverage.spec.ts` |
| Client head: canonical removal, robots, blog article head | `tests/unit/head-seo-pages.test.ts` |
| HOME_SEO equals index.html | `tests/unit/head-seo.test.ts`, `tests/unit/route-registry.test.ts` |
| Reset and JSON-LD ownership (FAQ kept, server product block removed) | `tests/unit/head-seo.test.ts` |
| Catalogue JSON-LD count equals the live total | `e2e/route-seo-coverage.spec.ts` |
| Direct load and SPA walk across owners | `e2e/route-seo-coverage.spec.ts`, `e2e/route-seo.spec.ts` |
| Commercial wording: phrase guard (superlatives, undocumented claims) | `tests/unit/route-registry.test.ts` |
| `/contact` names only channels the page shows | `tests/unit/route-registry.test.ts` (reads `Contact.tsx`) |
| `/offers` makes no unevidenced discount promise, figure or time window | `tests/unit/route-registry.test.ts` |
| Article lookup failure: rejects with `SeoLookupUnavailable`, never null | `tests/unit/route-seo-pages.test.ts` (one mocked query; the database is not touched) |
| 503 response: status, `Retry-After`, `no-store`, no error text, SQL, path or stack | `tests/unit/route-seo-pages.test.ts` |
| Live HTTP check on a production build: article 200 / draft 404 / unknown 404 on a healthy copy; 503 with `no such table: blog_posts` on a copy without that table; `/about` and `/products/:id` unchanged | manual run on scratch copies (phase 4 report); not an automated test |

## 5. Known limits (not fixed in this pass)

- While the catalogue is loading after a filter change, the previous listing's head stays
  until the request settles (the listing writer waits for `loading=false`). This is bounded
  by the request time and does not cross a route change.
- Visible copy outside the metadata still carries the claims listed in
  `docs/reference/seo-claims.md`.
- The visible breadcrumb on an article URL shows the raw slug as its label
  (`DynamicBreadcrumbs` has no post title). Only the JSON-LD uses the server's title.
- The blog modal opens an article without changing the URL, so an article opened from the
  list does not get its own head. Only the deep link `/blog/:slug` does.
- A database error on a product page still serves the generic shell with HTTP 200 and the
  homepage canonical. This is the behaviour from before the pass; it was not changed in
  phase 4 (the brief scoped the 503 to articles).
- On a direct article load, if `/api/blog` fails in the browser, `Blog.tsx` writes no head,
  so the homepage head stays while the server had answered 200 with the article head.
- Two browser tests skip when the database has no published article or no two active
  products in one category (`e2e/route-seo-coverage.spec.ts`, `e2e/route-seo.spec.ts`). A skip
  is not a pass; the phase 4 run had both fixtures and reported 32 passed, 0 skipped.
