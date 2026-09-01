# §3.12 Contact Messages Archive — Close-out Re-verification + CWV Pass (2026-09-02)

## §3.12 Status: ALREADY CLOSED — verified, no code changes needed

The archive policy was implemented, committed (adbcdc9) and live-deployed earlier
(see .hermes/reports/backend-contact-archive.md, TASKS.md §3.12). This session
re-verified every acceptance criterion against the current tree:

- **DB / schema**: `contactMessages.status` supports `unread | read | resolved | archived`
  (server/db/schema.ts:139, schema.pg.ts:138 — strict allow-list validated in API).
- **API**: `GET /api/admin/contact-messages?status=` (unread/read/resolved/archived/all;
  archived hidden by default; invalid filter → 400) — server/routes/admin.ts:615-634.
  `PUT /api/admin/contact-messages/:id/status` accepts archived, rejects forged → 400
  (admin.ts:636-656). Bulk `read-all` + `bulk-delete` also present.
- **Admin UI** (`/admin/messages`, src/pages/admin/Messages.tsx): status filter tabs
  (همه / خوانده نشده / خوانده شده / بایگانی), per-card archive/unarchive button with
  Persian copy + a11y labels, modal archive toggle, status badges (بایگانی‌شده), bulk ops.
- **Auto-archive reaper**: server/routes/contact.ts:14-32 — `read` messages older than
  `ARCHIVE_AFTER_DAYS=90` archived hourly, transaction-guarded/idempotent.
- **Unread-count exclusion**: invariantly satisfied — (a) default list excludes archived;
  (b) tab counts derive from the fetched (archived-free) list; (c) `read-all` only
  touches `status='unread'`, so archived rows can never enter unread counts; (d) no other
  unread-badge surface exists (AdminLayout has a plain nav link, no counter).
- **Tests**: tests/unit/contact-archive.test.ts + tests/api/contact-archive.test.ts —
  13/13 pass (verified in this session's gate run).

## Full gate

`npm run verify` — **ALL GREEN**: strict tsc ✓, 42 files / 322 tests ✓, client + server
build ✓ (dist/assets/index-c7E7plYU.js local).

## Core Web Vitals pass — homepage (findings, no changes required)

| Check | Result |
|---|---|
| Font preload | ✅ Vazirmatn Regular + Bold woff2 preloaded in index.html (crossorigin) |
| JS preloads | ✅ rolldown-runtime, vendor-react, vendor-motion, api, ToastContext, utils modulepreloaded |
| LCP element | Hero showcase image (`/products/*.svg`) rendered with `priority` → `loading="eager"` + `fetchPriority="high"` (PictureImage.tsx:120-143) |
| Image dimensions | ✅ hero 320×320, product cards 160×160 — explicit width/height, no CLS; hero uses SVG (tiny, no raster srcset needed) |
| Lazy loading | ✅ below-fold PictureImage defaults to `loading="lazy"` + `decoding="async"` |
| JS budget | ✅ index 139 kB (32.6 kB gz), vendor-react 246 kB (79 kB gz), code-split per route |

Findings (informational, not blockers):
1. LCP is client-rendered (hero image comes from store settings via JS), so real-user LCP
   depends on the route bundle arriving first; modulepreloads + font preloads mitigate.
   A static `<link rel="preload">` of the hero image isn't possible while it's settings-driven.
2. Pre-existing Tailwind v4 CSS build warning: `group-hover:scale-108` not recognized
   (lightningcss) — cosmetic; the hover-scale rule may not apply. Worth a follow-up fix
   (use `scale-105`/arbitrary value) in a future polish pass.

## Live verification (pre-deploy baseline)

- https://janebiarena.ir/api/health → 200
- https://janebiarena.ir/ → 200, live bundle `index-BiBTCCwB.js`
- https://janebiarena.ir/admin/messages → 200 (SPA fallback serves the admin route)

## Working-tree notes

- `package-lock.json` showed 12 unrelated `peer: true` deletions (npm-install churn from a
  prior session) — intentionally NOT committed.
- No production code changed in this session; docs-only commit.
