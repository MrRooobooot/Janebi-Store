# TEAM-BACKEND/SEO — Crawlability & Discoverability — 2026-09-02

## Gate
`npm run verify` — ✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED), exit 0.

## Task results

### 1. robots.txt + sitemap.xml (live audit) — CHANGED
- `https://janebiarena.ir/robots.txt` — OK, no-op. Correct Allow/Disallow (admin, api, checkout, profile disallowed; AI bots allowed; CCBot blocked; Sitemap directive present).
- `https://janebiarena.ir/sitemap.xml` — had 10 static URLs but **no `<lastmod>` and no product URLs**. Regenerated `public/sitemap.xml`: 24 URLs (10 static + 14 `/product/:id` for real DB products, ids 1–14 fetched from live `GET /api/products`), every URL carries `<lastmod>2026-09-02</lastmod>`. No example.com placeholders. No blog posts exist (blog hidden from sitemap by design per f95acbd) — none listed.

### 2. X-Robots-Tag header — CHANGED
- Live `curl -sI https://janebiarena.ir` → **no X-Robots-Tag**. Added `res.setHeader("X-Robots-Tag", "index, follow")` to the pre-helmet header middleware in `server/app.ts` (helmet's own xRobotsTag defaults to noindex, so set manually).

### 3. Canonical / hreflang — CHANGED (partial)
- Live home HTML and local `index.html`: **no `<link rel="canonical">`** present. Added `<link rel="canonical" href="https://janebiarena.ir/" />` to the index.html SEO block. og:url already absolute (`https://janebiarena.ir/`) — OK.
- hreflang: no-op — single-locale Persian site, no alternate-language pages; adding hreflang would be incorrect.

### 4. llms-full.txt counts — NO-OP
- Live `GET /api/products` returns 14 products; `public/llms-full.txt` lists 14 `/product/:id` URLs (ids 1–14). No drift, file untouched.

## Files
- `public/sitemap.xml` — regenerated (24 URLs, lastmod 2026-09-02)
- `server/app.ts` — X-Robots-Tag header
- `index.html` — canonical link (SEO meta block only)

## Post-deploy live verification
To be filled after deploy:
- sitemap 200 + lastmod 2026-09-02: (see final report in commit)
