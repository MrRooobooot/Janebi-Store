# QA Report — P2 UI Cluster (da2d470) · Live Production

**Date**: 2026-09-01 · **Target**: https://janebiarena.ir · **Verdict: PASS**

## 1. `npm run verify` — PASS
- Final line: `✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)` (exit 0)
- Vitest: `Test Files  39 passed (39)` · `Tests  306 passed (306)`
- TypeScript check + full client/server build (`✓ built in 596ms`, dist/server.cjs emitted) — clean

## 2. Live curl probes — PASS
- `GET /api/health` → HTTP 200 `{"status":"ok","database":"ok","latencyMs":1}`
- `GET /manifest.webmanifest` → contains `"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"` and `"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"`
- `GET /icon-192.png` → HTTP 200, `content-type: image/png`, 2812 bytes (matches repo `public/icon-192.png` 2812 B; `file`: PNG 192x192 RGBA)
- `GET /icon-512.png` → HTTP 200, `content-type: image/png`, 6668 bytes (matches repo 6668 B; `file`: PNG 512x512 RGBA)
- `index.html` contains: `apple-touch-icon" type="image/png" href="/icon-192.png"`

## 3. Dual-engine browser flow — PASS (Chromium + WebKit)
Routes loaded with HTTP 200 and zero app console errors / failed API requests on both engines:
`/`, `/products`, `/products/1`, `/new-products`, `/offers`, `/login`

- Note: console showed `408` for a **third-party** resource only: `https://trustseal.enamad.ir/logo.aspx?...` (Enamad trust seal, external, not app code). No 4xx/5xx from the app's own API/assets.
- Horizontal overflow at 390px viewport: `scrollWidth - clientWidth = 0` for `/` and `/offers` on both engines.

## 4. NewProducts / Offers real data — PASS
- `/new-products`: 22 product links rendered with prices in تومان; sample rendered: «محافظ کابل و شارژر سیلیکونی ضد پارگی فنری ۴ عددی» (۹۵٬۰۰۰ → ۶۵٬۰۰۰ تومان), «پایه نگهدارنده و هولدر مگنتی خودرو باسئوس مدل MagPro»
- `/offers`: 22 product links rendered with prices
- Both engines (chromium + webkit) identical: `productLinks=22 hasPrices=true overflow=0`
- `GET /api/products?limit=3` → 200, real items (e.g. title «محافظ کابل و شارژر سیلیکونی ضد پارگی فنری ۴ عددی»)

## Failures
None.
