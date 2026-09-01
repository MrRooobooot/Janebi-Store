# TEAM-FRONTEND: Hide dead OTP UI + JSON-LD script-escape

**Date**: 2026-09-01 · **Gate**: `npm run verify` — PASS (strict tsc + 302 tests / 38 suites + Vite/Esbuild build; post-build artifact audit: jsxDEV=0, /Users/ leaks=0)

## 1. OTP login & reset UI hidden (audit known blocker #5: no SMS provider in prod)

- **src/pages/Login.tsx**:
  - Removed the "ورود با پیامک (OTP)" login tab and the entire OTP-login mode branch (`mode: "otp"`, `verifyOtp` call, OTP login entry UI). Login page now shows only password login + the reset ("forgot") flow.
  - Removed the dead `/api/auth/otp/status` feature probe and the unused `useEffect` import; the reset flow's OTP countdown now renders with `toPersianDigits` (e.g. «۱۲۰ ثانیه تا ارسال مجدد»).
  - **503 contract**: `handleSendOtp` (`POST /api/auth/otp/send`) and `handleResetPassword` (`POST /api/auth/reset-password`) show toast `سرویس پیامکی فعال نیست` on HTTP 503 (with `.json().catch(() => ({}))` guard so a non-JSON 503 body can't throw).
- **src/contexts/AuthContext.tsx**: `verifyOtp` (`POST /api/auth/otp/verify`) shows the same `سرویس پیامکی فعال نیست` toast on 503. (Function retained in context API — no other consumer remains.)

## 2. JSON-LD script-escape — src/pages/ProductDetail.tsx

The Product JSON-LD injected via `schemaScript.text = JSON.stringify({...})` is now post-processed with `.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')`, so product titles/descriptions containing `<` (e.g. `</script>`) can no longer break out of the inline `<script type="application/ld+json">`.

## 3. Persian digits

All digits rendered in the changed UI pass through `toPersianDigits` (OTP countdown in reset flow). Existing Persian-digit literals («۵ رقم», phone placeholder) unchanged.

## Files changed

- src/pages/Login.tsx
- src/contexts/AuthContext.tsx
- src/pages/ProductDetail.tsx

## Verification evidence

- `npm run verify` → "ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)"; Vitest: 38 files / 302 tests passed; bundle audit `grep -c jsxDEV` = 0, `grep -c "/Users/"` = 0.
- Not deployed (per instructions) — commit+push only.
