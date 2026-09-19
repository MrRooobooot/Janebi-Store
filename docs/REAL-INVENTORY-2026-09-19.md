# Real Inventory Import — MCdodo Cables (2026-09-19)

## Scope
7 Mcdodo Lightning cables added to prod (`janebiarena.ir`) via admin API. Category: «کابل و سیم» (locked tree). No code changes.

## Products (DB ids 5633–5639)

| id | SKU | Title | Price (تومان) | Stock | Image |
|----|-----|-------|--------------|-------|-------|
| 5633 | CA-5261 | کابل شارژ و انتقال داده مک‌دودو مدل CA-5261 (لایتنینگ) | 875,000 | 10 | /images/products/ca-5261.webp |
| 5634 | CA-3581 | کابل شارژ و انتقال داده مک‌دودو مدل CA-3581 (لایتنینگ) | 635,000 | 10 | /images/products/ca-3581.webp |
| 5635 | CA-3580 | کابل شارژ و انتقال داده مک‌دودو مدل CA-3580 (لایتنینگ) | 545,000 | 10 | /images/products/ca-3580.webp |
| 5636 | CA-7271 | کابل شارژ و انتقال داده مک‌دودو مدل CA-7271 (لایتنینگ) | 475,000 | 10 | /images/products/ca-7271.webp |
| 5637 | CA-7270 | کابل شارژ و انتقال داده مک‌دودو مدل CA-7270 (لایتنینگ) | 475,000 | 10 | /images/products/ca-7270.webp |
| 5638 | CA-2261 | کابل شارژ و انتقال داده مک‌دودو مدل CA-2261 (لایتنینگ) | 410,000 | 10 | /images/products/ca-2261.webp |
| 5639 | CA-2260 | کابل شارژ و انتقال داده مک‌دودو مدل CA-2260 (لایتنینگ) | 335,000 | 10 | /images/products/ca-2260.webp |

Titles/specs sourced from marketplace evidence (Torob search on full model code); no fabricated specs. All prices from the user's supplied list. Stock=10 placeholder — adjust per real inventory.

## Images
- Sourced from exact-model marketplace listings (Torob CDN, Bing image index); store-watermarked candidates (Master Kala / Omegabattery / emdadmobile / Wonderland) rejected after vision QA.
- Normalized: square white canvas, max side ≤1024 (upscale never >1.6×; none applied), WebP q82, all ≤54 KB.
- Shipped to BOTH `/home/ubuntu/Janebi-Store/public/images/products/` and `/home/ubuntu/Janebi-Store/dist/images/products/` (skill rule).
- Per-asset `curl` 200 ×7 verified before import.

## Process (skill `janebi-prod-catalog-import`)
1. Prod recon first: 38 products, all «هولدر و نگهدارنده» — catalogue previously single-category.
2. Pre-write backup: `/home/ubuntu/backups/janebi-pre-mcdodo-20260919-190933.db` (643 KB).
3. Import via admin API (not raw SQL): in-container `jsonwebtoken` short-lived owner token; preflight `GET /api/admin/stats` 200; SKU-collision check (0 dupes); dry-run pass, then `--apply`. Result: 7× HTTP 201. Audit-log + cache invalidation free via API path.
4. Scripts shipped into container `/app`, deleted after run.

## Verification
- `X-Total-Count` 38 → 45 (+7). Per-SKU price compare: missing=[], price_mismatch=[].
- Category check: all 7 = «کابل و سیم».
- PDP `/products/:id` 200, `/api/products/:id` 200, image 200 ×7.
- Search: «مک‌دودو» → 7 hits (FTS5); «5261» → 1 hit. (SKU full-token `CA-5261` not a single FTS token — `5261` works.)
- Browser probe (Playwright, visible images only, h1 present): **[chromium] OK=7/7, [webkit] OK=7/7**.
- Probe artifacts: `scripts/audit/mcdodo-live-probe.mjs` (v1 had loose selector counting hidden 40×40 thumbnails + below-fold lazy images; visible-only filter is the correct assertion).

## Notes
- IndexNow ping intentionally not run (no code/URL-level SEO change beyond new product pages; sitemap auto-includes via API).
- Stock counts (10) and any color variants are admin-adjustable via panel/Bale bot.
