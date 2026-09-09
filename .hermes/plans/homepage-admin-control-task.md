# Task: Homepage full admin control — Janebi-Store

Repo: /Users/aidin/Desktop/Janebi-Store (branch main). NEVER commit/push/deploy from subagents — supervisor does it.

## Contract (MUST follow exactly)
All homepage copy flows from **`src/lib/constants.ts` `STORE_SETTINGS_DEFAULTS`** (single source of truth) → `/api/settings` (server/routes/settings.ts SAFE_KEYS auto-derives from it — no server change needed for new string keys) → client.

DB keys already supported by PUT /api/admin/settings (admin.ts allow-list also derives from the same constants file — verify, don't assume).
New keys added today (2026-09-09) already in STORE_SETTINGS_DEFAULTS:
`announcementBarEnabled, dealsTitle, dealsSubtitle, b2bTitle, b2bDesc, b2bLink, b2bButtonText, vipBadge, vipTitle, vipSubtitle, vipCouponCode, valueProp1Title..4Desc, heroSlide1..3Tag, heroSlide1..3ButtonText`

## Subtask A — Admin Settings UI (`src/pages/admin/Settings.tsx`)
Read the file first. Currently hero cards missing: Link + Image inputs; sections missing entirely for: deals, B2B banner, VIP banner, 4 valueProps.
1. Hero cards (1/2/3): add 2 inputs each — `heroSlideNLink` (placeholder «لینک دکمه») and `heroSlideNImage` (placeholder «مسیر تصویر (مثلاً /products/hld-13.svg)»).
2. Add collapsible (details/summary or simple state) cards AFTER hero section: «پیشنهادات شگفت‌انگیز» (dealsTitle/dealsSubtitle), «بنر فروش عمده» (b2bTitle/b2bDesc/b2bLink/b2bButtonText), «بنر باشگاه مشتریان» (vipBadge/vipTitle/vipSubtitle/vipCouponCode), «کارت‌های ارزش برند» (valueProp1..4Title/Desc — 8 inputs in 4 groups).
3. Add announcement-bar ON/OFF toggle (checkbox or switch) bound to `announcementBarEnabled` — NOTE: this key is 'true'/'false' STRING in DB; booleanize for UI.
4. Match existing card style (rounded-3xl, border tokens, lucide icons — reuse imports).
5. type `StoreSettings` interface in the file: extend with the new keys.
6. NO new dependencies. Persian labels. Verify with `npx tsc --noEmit` (project root, node_modules present).

## Subtask B — Homepage dynamic rendering (`src/pages/Home.tsx` + `src/components/VipClubBanner.tsx` + `src/components/Header.tsx`)
1. `Home.tsx`: replace hardcoded strings with settings fallback pattern `settings.X || STORE_SETTINGS_DEFAULTS.X`:
   - valueProps array (titles+descs) — it's a `const` inside component; make it depend on `settings` (useMemo or inline).
   - B2B banner: title/desc/Link to/link text.
   - Deals section header: dealsTitle/dealsSubtitle.
   - heroSlides useMemo: tag/buttonText from `heroSlideNTag`/`heroSlideNButtonText` keys (settings first, fallback defaults).
2. `Header.tsx`: announcement bar renders ONLY if `announcementBarEnabled !== 'false'`. settings comes from useStoreSettings already imported — check.
3. `VipClubBanner.tsx`: accept props `{ badge, title, subtitle, couponCode }` from Home (Home reads settings, passes down). On successful signup, reveal the coupon code in the success box (replace/augment the existing submitted UI — show code in mono/large, add copy-on-click via existing toast pattern if trivial).
4. NO new deps, NO motion import changes. Verify `npx tsc --noEmit`.

## Subtask C — Bale bot homepage settings (`server/bot/bale.ts` + read-only notifier)
1. `makeSettingsSectionKeyboard` (~line 345): add row `.text('🏷 بنر باشگاه مشتریان', 'st:vip')` before back button. Handler for `st:vip`: show current vipBadge/vipTitle/vipSubtitle/vipCouponCode from storeSettings (fallback constants default — import { STORE_SETTINGS_DEFAULTS } from '../../src/lib/constants.js' already possible, check existing imports) + new session mode `edit_vip_field` with inline buttons per field (`st:vipf:badge|title|subtitle|coupon`). Text reply → save that one key → answerCallbackQuery/editMessage confirmation.
2. Announcement bar toggle already exists (st:bar_tog) writing `announcementBarEnabled` — KEEP. Verify it uses the same key spelled exactly `announcementBarEnabled`.
3. Add to `showStoreStats` text: newsletter subscriber count: `db.select({count}).from(newsletterSubscribers)` (import newsletterSubscribers from ../db/schema.js — check if imported; newsletterSubscribers NOT currently in bale.ts imports).
4. Constraint: callback_data ≤ 64 bytes, ASCII only. Markdown formatting per existing code style. NO HTML parse_mode.
5. Verify: `npx tsc --noEmit` + existing tests `npx vitest run tests/unit/bale-bot.test.ts tests/unit/event-notifier.test.ts` (vitest available).

## Verification before returning
- `npx tsc --noEmit` clean.
- Report EXACTLY: files changed + functions touched + any key mismatch between client/keys/server allow-list you found.
- If PUT /api/admin/settings allow-list does NOT auto-derive from STORE_SETTINGS_DEFAULTS (read server/routes/admin.ts ~line 910-935 first): STOP editing that file, report the mismatch in your summary.
