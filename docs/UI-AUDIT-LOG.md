# UI/UX AUDIT LOG — single source of truth (append-only; one row per verified finding)

Legend: status = open | fixed | wontfix. Evidence = DOM probe / pixel probe / screenshot / HTTP.
Pixel probe (`scripts/probes/probe-pixel.mjs`) is the ONLY contrast authority —
`getComputedStyle` on oklab colors mis-parses (2.87 artifacts, disproven 0912).

| date | page | viewport | theme | finding | evidence | root cause | fix | status |
|------|------|----------|-------|---------|----------|------------|-----|--------|
| 0911 | header nav | 1280 | light+dark | suspected low-contrast nav links | pixel probe 7.59:1 | — | none needed | wontfix |
| 0912 | contact/login inputs | 1280 | light | placeholder ~2.6:1 (vision+pixel) | pixel probe rgb(71,85,105)→srgb oklab mis-read | browser-default placeholder color; no project rule | `--color-text-*` floor in index.css | fixed |
| 0912 | cart page | 1280 | light | disabled step buttons 2.8:1 flagged by vision | DOM: `text-zinc-400` = intentional disabled affordance (WCAG exempts disabled) | — | none | wontfix |
| 0912 | PDP tabs | 1280 | dark | suspected tab/contrast breaks | DOM+pixel: active tab switches, text 8:1+ | — | none needed | wontfix |
| 0912 | PDP specs | 1280 | dark | spec table one line only | API: specs data absent in DB row | data poverty, not UI | admin panel entry | open |
| 0912 | all products | all | all | 124 product images hotlinked to digikala CDN (fragile, WAF 408) | `/api/products` scan + 408 in console | seed imported remote URLs | phase-2 migration: 124 self-hosted `/images/products/dk-*.jpg` + 124 `.avif` variants (-82% bytes), compose mount added, APPLIED 124/124, 0 broken imgs on prod | fixed |
| 0912 | reviews | all | all | 0 reviews in DB across 138 products | `/api/products/*/reviews` = [] | no real reviews imported | honest empty-state (no fake data) | open |

## Coverage ledger (stateful guest rotation A) — DONE
- products grid, PDP + tabs: swept light+dark 1280+390 — PASS (vision + DOM)
- cart with real items: swept — PASS (disabled-step flag = wontfix)
- checkout gate, wishlist, compare, search, statics (about/contact): swept light+dark — no new defects
- external-host noise (enamad 403/408, digikala 408 pre-fix): classified NOT app bugs

## Rotation B — admin panel (isolated snapshot DB, :3978) — this round
| 0912 | /admin/audit-logs | 1280 | both | meta cell raw JSON truncated (267>224px) | DOM probe sw>cw | `truncate` on JSON blob | `<details>` expand → pretty-printed pre; re-probe trunc:0, expand verified | fixed |
| 0912 | SKU/dash/loader/labels (Products, Blog, Newsletter, Reviews, Settings, Coupons) | 1280 | light | text-gray-400 ≈2.8:1 on white | DOM computed oklch .707 | un-flipped subtle text | flipped to gray-600 dark:gray-400 (18 sites) | fixed |
| 0912 | admin empty-state icon (Products) | 1280 | both | "weak contrast icon" vision flag | decorative ≥48px, WCAG exempt | — | none | wontfix |
| 0912 | /admin/blog/new 404 | — | — | vision/probe flag | Blog uses inline form; no `/new` link exists in code | probe artifact | removed from probe list | wontfix |
| 0912 | dashboard bottom-clip / missing pagination (vision) | 1280 | — | "سطر آخر بریده" | screenshot viewport edge; Products loads ALL by design (code comment L124) | — | none | wontfix |
| 0912 | dashboard metric grid asymmetry (vision: row2 2-of-4 cols) | 1280 | dark | flagged | 6 metric cards / 4-col grid = data-count artifact, not CSS break | — | none | wontfix |

## Rotation D — admin mobile 390px (isolated DB, :3978) — this round
| 0912 | Orders chips row | 390 | both | visible scrollbar on filter chips (touch scroll works, CDP drag -305px) | DOM probe offsetWidth-clientWidth>0 pre-fix | `no-scrollbar` class undefined in TW4 config-less setup | `@utility no-scrollbar` defined in index.css (post: scrollbar 0) | fixed |
| 0912 | Products table | 390 | both | "کات لبه چپ/جدول نامناسب" vision flag | probe: in-container scroll 748>356, body hOver=0; table scrolls inside rounded card by design | desktop table + overflow-x container | none — intended pattern (card-view rewrite = wontfix until column count grows) | wontfix |
| 0912 | all pages | 390 | both | horizontal page overflow | probe hOver:0 all 11 pages | — | none | wontfix |
| 0912 | Products 138 sub-40px targets | 390 | both | "tiny targets" flag | they are the quick-stock pill (36px h × 49px w, pointer+input swap on tap); 44px rule = recommended not blocker | — | none | wontfix |
| 0912 | drawer | 390 | both | hamburger menu functionality | 18 links visible after tap, backdrop OK | — | none | wontfix (healthy) |

## Rotation E — admin panel re-layout (user request «پنل بچین») — incl. E2 unification
| 0912 | all 11 admin pages | 1280+390 | both | 3 drifted h1 variants (no-icon 2xl→3xl / text-primary-500 icon / text-xl Blog) | grep code scan | copy-paste drift over time | `PageHeader` component (icon-[var(--color-emphasis-text)] + truncate + subtitle); migrated 11/11; probe sweep clean; blog dark screenshot verified (no raw JSX, Persian digits) | fixed |
| 0912 | sidebar | 1280+390 | both | flat 11-item nav, verbose labels | vision+code | no workflow grouping | 3 sections: فروش و کالاها / مشتریان / محتوا و سیستم; shorter labels; 11 links + 3 headers, no nav overflow desktop+drawer | fixed |
| 0912 | dashboard stats | 1280 | both | 6 cards on 4-col grid = broken 2nd row | vision flag earlier reclassified: real defect now | grid lg:grid-cols-4 with 6 items | lg:grid-cols-3 (symmetric 2×3) | fixed |
| 0912 | dashboard VIP card | 1280 | both | stretched to 731px row height = dead whitespace | DOM: vipH 731→208 post-fix | grid default `stretch` | `self-start` | fixed |
| 0912 | mobile burger button | 390 | — | `items-center justify-center` w/o flex = no-op | code read | missing `flex` | added flex | fixed |
| 0912 | «مشاهده همه» misaligned / icon side | 1280 | — | vision flags | DOM probe: link x=57 (left edge = correct RTL justify-between); icon-right pattern consistent app-wide | — | none | wontfix |

## Next rotations (standing goal)
- C: forms/micro-interactions (auth modal, coupon apply, quantity steppers live behavior)
