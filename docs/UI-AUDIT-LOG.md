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
| 0912 | all products | all | all | 124 product images hotlinked to digikala CDN (fragile, WAF 408) | `/api/products` scan + 408 in console | seed imported remote URLs | phase-2 migration: 124 self-hosted `/images/products/dk-*.jpg`, compose mount added, APPLIED 124/124 | fixed |
| 0912 | reviews | all | all | 0 reviews in DB across 138 products | `/api/products/*/reviews` = [] | no real reviews imported | honest empty-state (no fake data) | open |

## Coverage ledger (stateful guest rotation A)
- products grid, PDP + tabs: swept light+dark 1280+390 — PASS (vision + DOM)
- cart with real items: swept — PASS (disabled-step flag = wontfix)
- checkout gate, wishlist, compare, search, statics (about/contact): swept light+dark — no new defects
- external-host noise (enamad 403/408, digikala 408 pre-fix): classified NOT app bugs

## Next rotations (standing goal)
- B: admin panel pages (isolated staging DB)
- C: forms/micro-interactions (auth modal, coupon apply, quantity steppers live behavior)
