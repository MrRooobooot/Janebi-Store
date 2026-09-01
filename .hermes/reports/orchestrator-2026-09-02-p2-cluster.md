# Orchestrator P2 Cluster Report — 2026-09-02

**Scope**: Close remaining P2 audit items (PROJECT_AUDIT.md §6) EXCLUDING SMS/OTP (blocked on Kavenegar credentials).

## Verdict: ALL IN-SCOPE P2 ITEMS ALREADY IMPLEMENTED & DEPLOYED — no code changes made

Per the "skip any item already implemented — verify in code before changing" rule, every item was verified in code and on the live domain. The P2 cluster was closed in commit `555dccf` (2026-09-01, "fix(audit-p2)") per TASKS.md line 98.

## Item-by-item verification (code + live)

### 1. Coupon rate-limiter + usageLimit enforcement — ✅ PRESENT
- Limiter: `server/app.ts:164-176` — `couponLimiter` (10 req / 15 min / IP), mounted on both `/api/coupons/validate` and `/api/coupons`, ahead of the general limiter; test-env skip.
- usageLimit: `server/routes/coupons.ts:53` rejects exhausted coupons on validate; `server/routes/orders.ts:141` re-checks inside the atomic order transaction and `orders.ts:245` increments `usedCount` (`COALESCE(used_count,0)+1`).
- Schema: `usageLimit`/`usedCount` in both `server/db/schema.ts:113-114` and `schema.pg.ts:112-113`; migrations `drizzle/sqlite/0006_coupon_usage.sql` + `drizzle/pg/0006_coupon_usage.sql`.
- Admin create path accepts `usageLimit` (`server/routes/admin.ts:569-581`).

### 2. Nightly backup via SQLite VACUUM INTO — ✅ PRESENT
- `scripts/backup-db.mjs` — readonly better-sqlite3 connection, `VACUUM INTO` (WAL-consistent), keeps last 7 (`janebi-<timestamp>.db`), prunes older, exits non-zero on failure; `BACKUP_DIR`/`DATABASE_URL` overrides; `npm run db:backup` entry in package.json; `backups/` gitignored. Documented in PROJECT_GRAPH.md Ops section.

### 3. JSON-LD `</script>` escape — ✅ PRESENT
- `src/components/DynamicBreadcrumbs.tsx` — BreadcrumbList JSON-LD rendered via `dangerouslySetInnerHTML` ends with `.replace(/</g, '\\u003c')`, neutralizing any `</script>` breakout from user-controlled labels.
- `src/pages/ProductDetail.tsx` product schema uses `script.text = JSON.stringify(...)` via DOM API (no HTML parse path — safe); `index.html` JSON-LD is static.

### 4. Manifest/PWA theme-color sync — ✅ PRESENT
- `public/manifest.webmanifest`: `theme_color: #F47C20` (Kinetic Commerce CTA orange), `background_color: #0B1536` (Deep Space family).
- `index.html` meta `theme-color: #0B1536` (Deep Space canvas — matches dark chrome/status-bar intent with `black-translucent`).
- Live check: `https://janebiarena.ir/manifest.webmanifest` returns the synced colors.

### 5. `/reviews/latest` endpoint — ✅ KEPT (in active use)
- Grep: `src/components/LatestReviews.tsx:25` fetches `/api/reviews/latest`; the component is imported and rendered by `src/pages/Home.tsx:446`. It is NOT unused → per instructions, keep.
- Live check: `https://janebiarena.ir/api/reviews/latest` → HTTP 200. (The earlier "404, removed" note in TASKS.md predates commit `7cffe99`/`aff04dd` which shipped the real testimonials section using this endpoint — local repo and prod are consistent.)

## Verification
- `npm run verify` → ✅ ALL HARDCORE QUALITY GATES PASSED (strict tsc + 36 Vitest suites + Vite/Esbuild build).
- Live health: `https://janebiarena.ir/api/health` → 200.

## Files changed
- None (no source changes — all items pre-existing). Report only.
- SMS/OTP remains the sole open P2 item, blocked on Kavenegar credentials.

## Notes
- Because no artifact changed, no deploy was performed; prod was verified directly instead.
