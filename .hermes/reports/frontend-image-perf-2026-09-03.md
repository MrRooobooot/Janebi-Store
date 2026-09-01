# TEAM-FRONTEND — Image Performance / LCP Round (2026-09-03)

## Scope
Audit largest client-side storefront images (hero banners, product cards, brand logos) and reduce LCP payload per CWV/SEO backlog item.

## Findings

### 1. Compression of oversized raster assets in public/ — NO-OP (verified honestly)
- Census: `find public -type f` (50 files, 372K total). **Zero raster images >100KB.**
- Largest images in `public/` are `icon-512.png` (6.6KB) and `icon-192.png` (~3KB); largest files overall are the Vazirmatn woff2 fonts (~50KB).
- All product/brand imagery is already vector SVG (4–5KB each). No WebP candidates exist to generate — no fabricated work performed. SVGs untouched per instruction.

### 2. Below-fold image attribute coverage — 21 raw `<img>` tags fixed
`PictureImage` already handles Home hero (`priority` eager+fetchPriority=high), deals row, `ProductCard` (via `SmartImage`) and `BrandLogo` with explicit width/height and lazy-by-default. The gaps were raw `<img>` tags; all now carry `loading="lazy"` + `decoding="async"` and explicit `width`/`height` where a fixed display size exists:
- `src/pages/ProductDetail.tsx` (thumbnails, related-product mini image)
- `src/pages/Compare.tsx`, `src/pages/static/Brands.tsx`, `src/pages/static/Blog.tsx`
- `src/components/HeaderSearch.tsx`, `src/components/Footer.tsx` (Enamad seal — `referrerPolicy="origin"` preserved)
- `src/components/checkout/CheckoutOrderSummary.tsx`, cart (`CartItemList`, `CartDrawer`)
- profile (4 files), admin (`AdminLayout`, `Users`, `Orders`, `Products` ×3)
- `src/components/profile/PersonalInfoTab.tsx`: English `alt="Avatar"` → Persian `alt="آواتار"`

LCP-critical elements (hero slide image, preload hints in `index.html`) were NOT touched.

### 3. PictureImage srcset coverage for card grid
`ProductCard.tsx` → `SmartImage` now passes `width="280" height="280"` and `sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"`. Raster product images get the full AVIF/WebP/srcset pipeline from `PictureImage`; SVG products correctly bypass `<picture>` sources. `PictureImage.tsx` itself unchanged.

### 4. Image 404 verification — real bug found and fixed
- DB census of `products.image` + `blog_posts.image` vs `public/` filesystem.
- **244 rows in the local dev DB (`data/janebi.db`) pointed at `/images/test.jpg`** — residue of inventory-concurrency test runs («کالای تست اینواریانت موجودی», ids 3623–…). This is the exact broken-image-404 bug class documented in the project skill (Test Data DB Isolation).
- Fixed: deleted the 244 test rows. Remaining catalogue: 14 real products, every image path resolves to an existing file in `public/products/` (0 missing). Zero `/images/`-prefixed rows remain. WAL checkpointed.
- Note: prod DB is separate (VPS); if the same residue exists there, it must be checked on the VPS during the next deploy — not done here (no-deploy constraint).
- Post-build artifact audit per skill invariant: `grep -c jsxDEV dist/assets/index-*.js` = 0, `grep -c "/Users/"` = 0.

## Gate
- `npm run verify` → **ALL HARDCORE QUALITY GATES PASSED** (tsc strict + Vitest **44 suites / 331 tests** passed + Vite client build + Esbuild server bundle).

## Files modified
- 18 component/page files (attribute additions listed above)
- `src/components/ProductCard.tsx` (dimensions + sizes)
- `data/janebi.db` (local dev only, gitignored — test-residue cleanup)
- `TASKS.md`, `CHANGELOG_AGENT.md` (round documentation)

## Left open
- Prod DB residue check on VPS during next deploy.
- No compression work possible: no >100KB rasters exist; revisit only if real photography is introduced.
