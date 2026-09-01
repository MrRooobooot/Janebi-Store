# TEAM-BACKEND cluster: OTP production gate + DB backup — 2026-09-01

## 1. OTP endpoints disabled in production
- `server/routes/auth.ts`: production without an SMS provider (`SMS_API_KEY`/`SMS_PROVIDER`, via existing `smsProviderEnabled` flag) now hard-503s on **all three** OTP-driven endpoints with `{error:'سرویس پیامکی فعال نیست'}`:
  - `POST /api/auth/otp/send` (previously gated with a different message — unified)
  - `POST /api/auth/otp/verify` (newly gated)
  - `POST /api/auth/reset-password` (newly gated — reset-by-OTP reuses the SMS code)
- Dev/test keep the in-memory simulator flow (`debugCode` returned, code logged).
- Gating is evaluated per-request (`otpUnavailable()` reads `env.NODE_ENV` at call time).

## 2. DB backup script
- `scripts/backup-db.mjs`: better-sqlite3 `VACUUM INTO` (WAL-consistent) → `backups/janebi-<ISO-timestamp>.db`; overrides via `BACKUP_DIR` / `DATABASE_URL`; keeps last 7 (prunes older); exits non-zero on failure (cleans partial file). `backups/` already gitignored.
- `package.json`: added `"db:backup": "node scripts/backup-db.mjs"`.
- `PROJECT_GRAPH.md`: new §6 Ops section documenting `npm run db:backup`; debts #2/#11 updated to reflect full OTP gating.

## 3. Tests
- New `tests/unit/otp-production-gate.test.ts`: asserts 503 + error message on send/verify/reset in production (env monkeypatched per-request), and that dev/test flow still returns 200 + debugCode.

## Verification
- `npm run verify` → **exit 0**, "ALL HARDCORE QUALITY GATES PASSED" (typecheck + full vitest suite incl. 2 new tests + full build).
- `npm run db:backup` → produced `backups/janebi-2026-09-01T04-29-42-106Z.db` (520 KiB) from local dev DB.

## Files changed
- `server/routes/auth.ts`
- `scripts/backup-db.mjs` (new)
- `tests/unit/otp-production-gate.test.ts` (new)
- `package.json`
- `PROJECT_GRAPH.md`
