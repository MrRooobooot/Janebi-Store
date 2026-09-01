# Backend: per-post blog sitemap slugs (round 2026-09-02d)

## What was done
- **`server/routes/sitemap.ts` (new)** — dynamic `GET /sitemap.xml`. Serves the checked-in static `public/sitemap.xml` (fallback `dist/sitemap.xml`, then minimal inline base) and appends one `<url>` per **published** post queried live from the `blog_posts` table.
  - URL shape: `https://janebiarena.ir/blog/<id>` — the post's real DB id is the only unique identifier the table has (no slug column exists; ids are `post-<ts>-<rand>`). No hardcoded slugs anywhere.
  - `<lastmod>` from the post's real `createdAt` (`YYYY-MM-DD`); **omitted entirely** when missing/unparseable.
  - XML-escaped, `Content-Type: application/xml`, 1h cache. DB failure degrades gracefully to the static base.
- **`server/app.ts`** — mounted `sitemapRoutes` after the API routers, so the dynamic route wins over `express.static` in prod (registered in `app.ts`, static is mounted later in `index.ts`).
- **`src/App.tsx`** — added `<Route path="blog/:slug" element={<Blog />} />` so sitemap URLs actually resolve (previously no per-post URL existed at all; posts opened in a modal).
- **`src/pages/static/Blog.tsx`** — deep-link support: on load, if `:slug` matches a fetched post id, the article auto-opens.
- **`tests/api/sitemap.test.ts` (new)** — isolated seeded rows (unique ids, cleaned in `afterAll`):
  1. static entries intact + per-post URLs from DB + lastmod present for dated post + **lastmod absent** for an invalid-date post;
  2. unpublished (draft) posts excluded.
- `public/sitemap.xml` left untouched (still the static base / fallback for pure-static hosting).

## Notes / deviations
- Task context assumed `/blog/:slug` + slug column existed; neither did. Chose post **id** as slug (zero fabrication) and added the minimal SPA route + auto-open so sitemap URLs don't 404. If readable slugs are wanted later, add a `slug` column and switch the route to use it — sitemap route only needs the one query changed.
- Sibling agents were concurrently editing `src/pages/static/Blog.tsx` and `server/app.ts`; patches applied additively on current file state.

## Verification
- `npx vitest run tests/api/sitemap.test.ts` — 2/2 pass.
- `npm run verify` (tsc strict + full vitest suite + client build + server bundle) — **ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)**.

## Files
- Added: `server/routes/sitemap.ts`, `tests/api/sitemap.test.ts`
- Modified: `server/app.ts`, `src/App.tsx`, `src/pages/static/Blog.tsx`
