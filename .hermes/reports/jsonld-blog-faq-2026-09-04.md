# JSON-LD BlogPosting + FAQPage — SEO/Quality Cluster (2026-09-04)

Repo: /Users/aidin/Desktop/Janebi-Store · Prod: https://janebiarena.ir
Commit: `ed61aff` — seo: FAQPage JSON-LD from real on-page Q&A (FAQ section, values from constants)
Parent: `f58d33d` (OTP live) / `cb48cf5` (4th blog post + BreadcrumbList)

## 1. BlogPosting JSON-LD — live verification (NO change needed)

Method: raw `curl` of `/blog/<slug>` serves only the static SPA shell (index.html
with the static Organization/WebSite @graph) — BlogPosting is injected client-side,
so rendered-DOM verification was done via headless Playwright (Chromium) against
live prod. Note: `/api/blog` exposes posts with `id` acting as the slug; there is no
separate `slug` field.

### Probe 1: /blog/dastband-bluetooth-entekhab (200)
- `@type: BlogPosting` present, one instance.
- headline: «اسمارت‌بند یا ساعت هوشمند؟ مقایسه‌ای واقع‌بینانه برای خرید لوازم پوشیدنی» — matches API title exactly.
- datePublished: `2026-09-24T14:00:00.000Z` — matches API createdAt.
- author: `{@type: Person, name: "تیم جانبی آرنا"}` — matches API author.
- identifier, image, description, articleBody all match API data. No fabricated fields; `dateModified` correctly absent (post has no updatedAt).

### Probe 2: /blog/asrar-sharzh-salem-battery (200)
- headline: «شارژ درست، عمر بیشتر: ۷ اشتباه رایج که باتری گوشی را فرسوده می‌کند» — matches API.
- datePublished: `2026-09-14T09:30:00.000Z`, author «تیم جانبی آرنا» — real DB values.
- Cross-check: an invalid slug (`/blog/hedzfar-bluetooth-buy-guide`) gracefully renders the blog list (Blog JSON-LD), no broken detail markup.

**Verdict: BlogPosting JSON-LD is live-correct on prod; no change required.**

## 2. FAQPage JSON-LD — added (change implemented & deployed)

Findings before change:
- FAQ section exists at `/faq` (route `src/pages/static/FAQPage.tsx` → `src/components/FAQ.tsx`); the FAQ component is not used on product pages.
- No `/api/faq` endpoint exists (404) — FAQ content lives in the client component as 4 real Q&As (shipping figures resolved from `src/lib/constants.ts`: FREE_SHIPPING_THRESHOLD=2,000,000; SHIPPING_FEES express=50,000 / standard=35,000 Toman).
- No FAQPage JSON-LD existed anywhere (`grep -rn "FAQPage"` / `ld+json` audit).

Change (`src/components/FAQ.tsx`, +27/-2):
- `useEffect` injects a `FAQPage` JSON-LD script (`id="faq-page-jsonld"`) built from the **same `faqs` array that renders on the page** — single source of truth, zero duplication, zero fabricated Q&A; cleanup removes the script on unmount.
- Honesty note: content source is the component (the live on-page FAQ), not a DB table (none exists for FAQ). Every question/answer is verbatim on-page content; only values from constants lib — no invented data.

## 3. Quality gates & deploy

- `npm run verify` → ✅ ALL HARDCORE QUALITY GATES PASSED (strict TS + full Vitest suite + build + artifact audit jsxDEV=0).
- `git push` → f58d33d..ed61aff main.
- `SSHPASS='AiDiN123' sshpass -e ./deploy.sh` → ✅ Deploy OK; health check `{status: ok, database: ok, latencyMs: 11}`.

## 4. Live re-verification (post-deploy)

- `GET https://janebiarena.ir/faq` → **200**.
- Rendered DOM contains `#faq-page-jsonld` with `@type: FAQPage` and 4 `Question`/`acceptedAnswer` entities matching the rendered page exactly, including resolved Persian-format figures (۲٬۰۰۰٬۰۰۰ / ۵۰٬۰۰۰ / ۳۵٬۰۰۰ تومان).
- Prod homepage/blog endpoints unaffected (same build pipeline, verify gate passed).

## 5. Files touched

- `src/components/FAQ.tsx` (modified — FAQPage JSON-LD injection)
- `.hermes/reports/jsonld-blog-faq-2026-09-04.md` (this report)
