# Backend CWV / SEO — 2026-09-02 round

**Verify**: `npm run verify` — ✅ ALL HARDCORE QUALITY GATES PASSED (EXIT=0)
**Commit**: see git log — `perf(seo): lazy images, font preloads, blog sitemap entries (2026-09-02 round)`

## Task 1 — Image loading attributes
- `src/components/PictureImage.tsx` already implements the correct policy: non-priority images render `loading="lazy" decoding="async" fetchPriority="auto"`; only `priority={true}` gets eager/high. No change needed.
- ProductCard grid images go through `SmartImage` → `PictureImage` with no `priority` prop → lazy/async. Compliant, no change.
- Blog listing images (`src/pages/static/Blog.tsx` card grid) already had `loading="lazy"`.
- Blog detail modal hero `<img>` lacked `decoding="async"` → **added** (kept eager; it is the LCP element of the opened modal).
- Hero slide in `Home.tsx` keeps `priority={true}` (LCP) — untouched. index.html preloads untouched.

## Task 2 — Font preloading
- `index.html` already has `<link rel="preload" as="font" crossorigin>` for `/fonts/Vazirmatn-Regular.woff2` and `/fonts/Vazirmatn-Bold.woff2` (the only two faces loaded by `src/index.css` first paint; files exist in `public/fonts/`). **No-op** — verified, nothing to add.

## Task 3 — Blog sitemap
- `blog_posts` table exists in schema and is served via `GET /api/blog`, but is **empty** in the production/dev DB and the frontend has no per-post route (posts open in a modal on `/blog`). No per-post slugs exist → zero fabricated URLs added.
- Added the real `/blog` listing URL to `public/sitemap.xml` with `lastmod 2026-09-02` (was missing entirely).
- Dynamic per-post sitemap entries are not possible today: no `/blog/:slug` frontend route and no slug column. If per-post pages are added later, extend a server sitemap route following the product URL pattern.

## Files changed
- `src/pages/static/Blog.tsx` (decoding="async" on detail image; file also carries an unrelated sibling agent's a11y/motion edits in the working tree)
- `public/sitemap.xml` (+ `/blog` entry)
