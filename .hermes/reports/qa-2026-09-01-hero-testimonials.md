# QA Report — Hero Settings + Testimonials Cluster (prod-first, LIVE https://janebiarena.ir)

**Date**: 2026-09-01 · **Team**: TEAM-QA · **Verdict**: **PASS** (with 1 non-blocking observation)

## 1) Homepage testimonials (GET /api/reviews/latest)
- **PASS** — API non-empty live, section rendered on both engines.
- `curl /api/reviews/latest` → exactly 2 reviews (`rev-101` محمد حسینی, `rev-102` سارا احمدی).
- Chromium DOM: `#latest-reviews-heading` ("نظرات مشتریان") present; 2 `<article>` cards, text matches API verbatim; no fabricated 3rd review.
- WebKit DOM: same — section:true, 2 articles with identical names/comments.
- Persian digits: `hasLatinDigitInReviews:false` on WebKit; rating aria "امتیاز ۵ از ۵"; zero Latin digits inside section.
- Empty/error path: component returns `null` when list empty/fails (code path in `LatestReviews.tsx` line 40) — no fabricated content.

## 2) Hero slides = 3 configured images
- **PASS** — live DOM hero `<img alt="<slide title>">` values match `GET /api/settings` exactly:
  - Slide 1 → `/products/hld-13.svg` (alt "هولدرهای مگنتی خودرو…"), visible, w=270
  - Slide 2 → `/products/cas-4.svg` (alt "قاب‌های مگ‌سیف…"), visible, w=270
  - Slide 3 → `/products/cbl-1.svg` (alt "کابل‌های کنفی…"), present after slider rotation
  - All three URLs return HTTP 200. No client-side "فست" hack; images derive from settings (fallbacks preserved in `Home.tsx` lines 53/65/77).

## 3) Key page sweep, Chromium + WebKit (Playwright 1.62.1)
- **PASS** — home, /products, /products/14, /cart loaded with correct Persian `<h1>`/titles on both engines.
- Console errors: **zero app errors** on both engines. Only `408` from external third-party `trustseal.enamad.ir/logo.aspx` (9 hits; not an app resource, pre-existing, out of cluster scope).
- No `pageerror` events anywhere.

## 4) GET /api/settings hero fields
- **PASS** — response includes `heroSlide1Image: "/products/hld-13.svg"`, `heroSlide2Image: "/products/cas-4.svg"`, `heroSlide3Image: "/products/cbl-1.svg"` plus all heroSlide1..3 Title/Subtitle/Link/Badge fields.

## 5) npm run verify
- **PASS** — exit 0; `✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)`; typecheck + full Vitest suite + Vite client build (index-C9BFGqoK.js) + esbuild server bundle all green.

## Observation (non-blocking, recommend follow-up)
- Field-name mismatch between API and `LatestReviews.tsx`: API sends `productName` / `date` (pre-formatted Persian), component expects `productTitle` / `createdAt` (ISO). Result: per-review date line and the "محصول: …" product link are not rendered (comment, author, and star ratings render fine). Does not violate any stated check (section visible, Persian digits only, exactly 2 real reviews) but should be aligned in a follow-up.

## Evidence files
- `.hermes/reports/qa-sweep.cjs`, `qa-dom-check.cjs`, `qa-hero-check.cjs`, `qa-slides-check.cjs`, `qa-webkit-check.cjs`, `qa-detail-check.cjs`
- `qa-sweep-results.json`, screenshots `home-chromium.png` / `home-webkit.png`
