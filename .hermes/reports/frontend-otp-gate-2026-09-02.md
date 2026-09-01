# Frontend OTP Gate — 2026-09-02

## Change
- `src/pages/Login.tsx`: on mount, plain-fetch `GET /api/auth/otp/status` (no auth header) → `{ enabled: boolean }`. `enabled=false` or fetch failure → OTP reset flow hidden, Persian notice shown for «بازیابی رمز عبور»; `enabled=true` → prior OTP reset flow unchanged. `src/contexts/AuthContext.tsx` surfaces no OTP UI (503-guarded `verifyOtp` only) — no change needed there.
- `src/lib/otp.ts` (new): `resolveOtpStatus()` — fail-safe resolver, only explicit `enabled === true` enables the UI.
- `tests/unit/login-otp-gate.test.ts` (new): resolver fail-safe cases + `/otp/status` endpoint contract test.

## Quality gate
```
$ npm run verify
✅ ALL HARDCORE QUALITY GATES PASSED (100% VERIFIED)
$ grep -c jsxDEV dist/assets/index-*.js
0
$ grep -c "otp/status" dist/assets/Login-*.js
1
```

## Commit
- `c11f9ca` fix(login): gate OTP reset UI behind GET /api/auth/otp/status (pushed)

## Deploy
- `./deploy.sh` completed; dist synced to VPS (45.82.137.67), container restarted.

## Live evidence (2026-09-02, janebiarena.ir)
```
$ curl -s https://janebiarena.ir/ | grep -o 'assets/index-[^"]*\.js'
assets/index-CPl-fppE.js                      ← matches local build hash

$ curl -s https://janebiarena.ir/api/auth/otp/status
{"enabled":false}

$ curl -s https://janebiarena.ir/assets/Login-D0G6tgAE.js | grep -c "otp/status"
1

$ curl -s https://janebiarena.ir/assets/Login-D0G6tgAE.js | grep -o "بازیابی رمز عبور با کد پیامکی در حال حاضر در دسترس نیست"
بازیابی رمز عبور با کد پیامکی در حال حاضر در دسترس نیست

$ curl -s https://janebiarena.ir/api/health
{"status":"ok","database":"ok",...}
```

## Result
Prod serves the gated Login bundle; `/otp/status` reports `enabled:false`, so the live login page shows only password login + the Persian unavailability notice in the reset path.
