# Frontend cluster — round 2026-09-02c

## Scope
Two clusters shipped on `main`: DESIGN (product-page reviews UX polish) and SEO (JSON-LD BlogPosting on the blog article reader). No schema/API changes.

## DESIGN — Product page reviews UX polish
**Files:** `src/components/ProductReviews.tsx`, `src/pages/ProductDetail.tsx`

- **Honest rating empty state:** score card now shows a `جدید` badge when there are no reviews (`totalReviews === 0 && initialReviewsCount === 0`), with empty/grayed stars and copy "هنوز دیدگاهی برای این محصول ثبت نشده است". Removed the fake `initialRating = 4.7` fallback — the prop was deleted and `avgRating` is now computed only from real fetched reviews (`null` otherwise). Call site in `ProductDetail.tsx` updated accordingly.
- **Dual-theme review cards:** cards switched to `bg-zinc-50 dark:bg-zinc-900/60`, `border-zinc-200/80 dark:border-zinc-800`, hover `hover:border-zinc-300 dark:hover:border-zinc-700`.
- **Persian digits:** rating badge (`review.rating.toFixed(1)`), average score, recommend percent, helpful/unhelpful counts and review dates now go through `toPersianDigits`. Dates render via `fa-IR` month-name formatting (`formatFaDate`, with raw-string fallback for unparseable dates).
- **A11y touch targets:** star-rating picker buttons → `w-11 h-11 min-w-[44px] min-h-[44px]` with Persian `aria-label` ("ثبت امتیاز N از ۵") + `aria-pressed`; helpful/unhelpful vote buttons → `min-h-[44px]` with Persian `aria-label` + `aria-pressed`; decorative icons `aria-hidden`; star summary has `role="img"` + Persian `aria-label`.
- **Reduced motion:** `useReducedMotion()` gates all `motion` enter/exit animations (review cards, form drawer); `motion-reduce:transition-none` added to hover-scale/transition elements.

## SEO — JSON-LD BlogPosting
**Files:** `src/lib/blogJsonLd.ts` (new), `src/pages/static/Blog.tsx`, `tests/unit/blog-json-ld.test.ts` (new)

- Pure builder `buildBlogPostingJsonLd(post, origin)` emits `@type: BlogPosting` with `headline`, `mainEntityOfPage` (canonical `…/blog`), and — **only when present in the fetched post data** — `identifier`, `datePublished` (raw DB `createdAt`), `dateModified` (only if an `updatedAt` exists; the current `blog_posts` schema has none, so it is honestly omitted), `author` (Person name, only if non-empty), `image` (absolute-ized real path, only if present), `description` (excerpt), `articleBody` (body). Returns `null` when no headline → no fabricated markup.
- `Blog.tsx` keeps raw `createdAt`/`updatedAt` alongside the Persian display date and injects `<script id="blog-posting-jsonld" type="application/ld+json">` into `document.head` while an article reader modal is open; removed on close/cleanup.
- **Vitest:** `tests/unit/blog-json-ld.test.ts` — 7 tests covering JSON round-trip validity, field honesty (omission of missing `dateModified`/`image`/`author`/invalid dates), and null-on-no-headline.

## Verification evidence
`npm run verify` → `✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)` (strict `tsc --noEmit` clean, all vitest suites green: **43 test files / 329 tests passed**, client + server builds succeed). Post-build audit: `grep -c jsxDEV dist/assets/index-*.js` → **0**.

Not deployed (orchestrator handles deploy). Untouched: the in-flight SMS-provider work (`server/env.ts`, `server/routes/auth.ts`, `.env.example`, `deploy.sh`, `package-lock.json`, `CHANGELOG_AGENT.md`, `tests/unit/otp-production-gate.test.ts`).
