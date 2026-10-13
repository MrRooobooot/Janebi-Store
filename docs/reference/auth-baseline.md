# Authentication baseline — Janebi Store

> **Status:** living · **Updated:** 2026-10-13 · **Scope:** sign-in paths, token lifetimes and storage, role checks, and the known limits of each. Every claim here was checked against `server/routes/auth.ts`, `server/utils/cookies.ts`, `server/routes/tokenVersion.ts`, `server/middleware/auth.ts` and `src/contexts/AuthContext.tsx` on 2026-10-13.

## 1. Sign-in paths

- **Password:** `POST /api/auth/register` (phone + password, minimum 6 characters) and `POST /api/auth/login`. Passwords are hashed with `bcrypt` at 10 rounds.
- **SMS OTP:** `POST /api/auth/otp/send` issues a 5-digit code; `POST /api/auth/otp/verify` checks it. A code expires after 5 minutes and locks after 5 failed attempts. `POST /api/auth/otp/send` is limited to 5 requests per minute per IP. `GET /api/auth/otp/status` reports whether OTP is enabled; it returned `enabled: true` on 2026-10-13. When the SMS provider is not configured, `send` answers `503`.
- Both paths issue the same pair of tokens.
- `POST /api/auth/reset-password` resets a forgotten password through the same OTP mechanism.

## 2. Tokens and cookies

| Token | Signed with | Lifetime | Payload |
|---|---|---|---|
| Access | `JWT_ACCESS_SECRET` | 1 day | `userId` |
| Refresh | `JWT_REFRESH_SECRET` | 7 days | `userId`, `tokenVersion` |

- Both tokens are set as cookies (`server/utils/cookies.ts`): `accessToken` and `refreshToken`, both `HttpOnly`, `Path=/`, `SameSite=Strict` in production and `Lax` otherwise, and `Secure` in production.
- `POST /api/auth/refresh` reads the refresh cookie only. The request-body fallback was removed (comment `R3-01` in `server/routes/auth.ts`).
- Revocation works through `tokenVersion`. The current version per user is kept in `server/routes/tokenVersion.ts`, and a refresh token whose version no longer matches is rejected.

## 3. Authorization

- `server/middleware/auth.ts`:
  - `authenticate` takes the access token from `Authorization: Bearer …` if present, otherwise from the `accessToken` cookie, then loads the user.
  - `requireAdmin` checks `role === 'admin'` and returns `403` otherwise.
- The role model has two values, customer and admin. There is no permission model: every admin route checks the same role.

## 4. Frontend

- `src/contexts/AuthContext.tsx` does not write any token to `localStorage` or `sessionStorage`. The browser holds the tokens only as HttpOnly cookies; the context calls `GET /api/auth/me` to learn who is signed in.
- `src/components/admin/AdminLayout.tsx` hides the admin UI unless `user.role === 'admin'`. This is a display guard only; the API enforces the role.

## 5. Known limits

1. **Access-token lifetime is one day.** Shortening it would need silent refresh, which the frontend does not do.
2. **`tokenVersion` is held in process memory** (`server/routes/tokenVersion.ts`). After a restart every user's version returns to 0, so revocations made before the restart are lost. The comment in that file says this is acceptable for a single-process deployment; it should be revisited if the app runs in more than one process.
3. **Pending OTP codes are also held in process memory** (`otpStore`, a `Map` in `server/routes/auth.ts`). A restart drops every pending code; users request a new one.
4. **No per-session list.** Revocation is all-or-nothing per user (by version bump), not per device.
5. **Single admin role** with no finer permissions.
