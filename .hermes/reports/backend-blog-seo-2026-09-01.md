# Backend Blog SEO — 2026-09-01 (team-backend SEO cluster)

## Scope
1. 4th authentic Persian blog post, 2. BreadcrumbList JSON-LD on blog pages, 3. sitemap lastmod refresh.

## 1. New blog post (scripts/seed-blog.ts)
- id/slug: `rahnamaye-kharid-handsfree-bluetooth`
- title: «راهنمای خرید هندزفری بلوتوث: از کیفیت صدا تا عمر باتری»
- 6 substantive paragraphs (کدک صوتی SBC/AAC/aptX/LDAC، عمر باتری واقعی، فرم قرارگیری در گوش، تأخیر/Game Mode و میکروفون ENC، IPX4/IPX7، جمع‌بندی خرید). Persian digits throughout, no filler, no fake ratings. Image: real self-hosted `/products/ear-6.svg`. Category «صوت و هندزفری», tags column populated.

## 2. BreadcrumbList JSON-LD — SERVER-RENDERED (no React edits)
- New `server/lib/breadcrumbs.ts`: builds schema.org BreadcrumbList for `/blog` (خانه/مجله) and `/blog/:slug` (خانه/مجله/<real DB title>).
- Injected into the HTML shell in `server/index.ts` (both dev vite path and prod catch-all): crawler-visible in initial HTML, **no React component changes needed** — nothing to hand to frontend.
- Zero-fabrication: unknown slug or DB error → nothing injected.
- Tests: `tests/api/breadcrumbs.test.ts` (4 cases).

## 3. Sitemap
- `server/routes/sitemap.ts`: blog URL `<lastmod>` = today (every published post re-listed today). Post `createdAt` values deliberately NOT used — the 3 pre-existing posts were seeded with future dates (09-05/09-14/09-24) which would be invalid lastmod.
- Static `/blog` entry lastmod bumped to 2026-09-01 in `public/sitemap.xml`.
- `tests/api/sitemap.test.ts` updated to the new lastmod semantics.

## Verification
- `npm run verify` → **exit 0, 45 test files / 341 tests passed, ALL HARDCORE QUALITY GATES PASSED**.
- Transient flake observed earlier: `otp_vip_analytics.test.ts` 502 from live SMS.ir — reproduced on a clean tree via `git stash`, unrelated to this cluster; subsequent full verify run green.
- Prod DB seeded (same method as 24fd04f): `docker cp` seed .cjs into `janebi-store:/app`, `docker exec -w /app node …` (note: prod column is `created_at`, not `createdAt`), temp script cleaned up.

## Live prod status (at commit time)
- `/api/blog` → **4 posts** incl. the new one ✅
- `/sitemap.xml` → includes `/blog/rahnamaye-kharid-handsfree-bluetooth` ✅ (lastmod 2026-09-01 from its real createdAt under the currently deployed build)
- ⚠️ The new lastmod=today logic and server-side breadcrumb injection are **in the committed code but not yet live** — requires a redeploy (`./deploy.sh`). Deploy was left to the supervisor because the shared working tree contains other clusters' in-flight edits (auth.ts/package-lock.json); deploying now would ship their uncommitted work.

## Files changed
- scripts/seed-blog.ts, server/lib/breadcrumbs.ts (new), server/index.ts, server/routes/sitemap.ts, tests/api/breadcrumbs.test.ts (new), tests/api/sitemap.test.ts, public/sitemap.xml
- Untouched per constraint: src/components/Checkout*, cart files, React components.
