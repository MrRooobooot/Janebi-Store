# Backend/SEO — Crawlability & Discoverability Audit (2026-09-02)

**Result: ALL 4 TASKS NO-OP** — live site already correct; prior commit `5eeec55` + `47f0395` shipped this cluster.
**Gate:** `npm run verify` → `✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)` (exit 0)
**Commit:** no-op for code; this report committed separately.

## 1. robots.txt & sitemap.xml
- `curl -s https://janebiarena.ir/robots.txt` → correct: `Sitemap: https://janebiarena.ir/sitemap.xml`, disallows /admin/, /api/, /checkout/, /profile; AI bot block present (CCBot disallowed, GPTBot/ClaudeBot/PerplexityBot etc. allowed). Live file byte-identical to `public/robots.txt` (diff empty).
- `curl -s https://janebiarena.ir/sitemap.xml` → 24 URLs, lastmod `2026-09-02` on every entry, zero example.com placeholders. Live file byte-identical to `public/sitemap.xml`.
- Sitemap product URLs `/product/1..14` exactly match live DB: `GET /api/products` → 14 products, ids `1..14`. No blog posts exist; key static pages all present (/, /products, /offers, /new-products, /brands, /about, /contact, /faq, /terms, /privacy).

## 2. X-Robots-Tag header
- Live evidence: `curl -sI https://janebiarena.ir` → `x-robots-tag: index, follow`. Already set in `server/app.ts:55` (`res.setHeader("X-Robots-Tag", "index, follow")`). No change needed.

## 3. Canonical / robots meta on key pages
- Live home HTML: `<link rel="canonical" href="https://janebiarena.ir/" />` and `<meta name="robots" content="index, follow" />` — absolute canonical, present in `index.html:10-11`. No relative/absent canonical. No change needed.

## 4. llms-full.txt drift
- `GET /api/products` → 14 products; `public/llms-full.txt` contains exactly 14 product URLs (`/product/1..14`), id sets match, all 14 live product titles present in the file. No drift → not regenerated.
