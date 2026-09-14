# Security audit — 2026-09-14 (black-box, live janebiarena.ir)

Scope: unauthenticated external attack surface of the production deployment
(HTTP/TLS/headers/CORS/authz/rate-limits/injection/file exposure).
Method: raw curl/openssl probes against prod; source read only to confirm root cause.

## Findings

### SEC-01 — CRITICAL — backend source + source map publicly downloadable
- `GET /server.cjs` → **200**, 439 KB (`application/node`)
- `GET /server.cjs.map` → **200**, 731 KB, `sourcesContent: true`, 385 KB of real
  TypeScript for 49 server files (`server/routes/*`, middleware, db schema, env).
- Root cause: production web root is `dist/`, the *same* directory esbuild writes
  `dist/server.cjs` + `dist/server.cjs.map` into (`server/index.ts` mounts
  `express.static(path.join(cwd,"dist"))`). Compiled-bundle grep found no secret
  literals (all secrets come from `process.env`), but the full backend logic,
  route table, auth flow and validation schemas were disclosed.
- Fix: single guard middleware in `server/app.ts` before every static mount —
  any `*.cjs` / `*.map` path → 404. Regression probe
  `scripts/probes/static-exposure.sh` wired into `npm run verify` (step 4).

### SEC-02 — HIGH — IP rate limiting bypassable via client-supplied X-Forwarded-For
- nginx used `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`
  (append) while the app runs `app.set("trust proxy", 1)`, which resolves
  `req.ip` from the *untrusted leftmost* XFF entry — i.e. a header the client
  fully controls.
- Proof: with the auth limiter already saturated (`429` on unspoofed calls), four
  requests each carrying a distinct `X-Forwarded-For: 10.0.0.N` returned `401`
  (allowed) instead of `429`; a fixed XFF chain collapsed back to `429`.
- Impact: unlimited login/OTP-SMS brute force (SMS cost + account takeover vector)
  and bypass of every other IP limiter (coupon brute force, contact/newsletter).
- Fix: nginx overwrites instead of appending —
  `proxy_set_header X-Forwarded-For $remote_addr;` (4 proxy locations).
  Live conf kept in `deploy/nginx-janebi-store.conf`.
- Verified after reload: 9 rapid requests with rotating spoofed XFF → `429`
  immediately (same bucket as the real client IP), unspoofed baseline still
  `401 ×5 → 429`.

## Verified sound (no action)
- TLS: HTTP/2, Let's Encrypt valid cert, `ssl_verify_result=0`, HSTS 1y+includeSubDomains.
- `http://` and `https://www.` → 301 to the canonical https origin.
- Headers: CSP (report-to + `/api/csp-report`), COOP, CORP, nosniff, XFO, referrer,
  Permissions-Policy, no `x-powered-by`.
- Secrets: `/.env`, `/.git/config`, `/data/janebi.db`, `/package.json`, `/metrics`
  all 404; no high-entropy strings in the served bundles.
- AuthZ: every `/api/admin/*` → 401 unauthenticated; `/api/admin/stats` rejects
  `alg:none` and garbage bearer tokens; all user-scoped routes 401 unauthenticated.
- Injection: search/id/coupon inputs are Zod-validated (400) and parameterized —
  `' OR '1'='1`, `UNION SELECT password FROM users`, `;DROP TABLE` all inert.
  Malformed JSON → structured 400, no stack traces.
- CORS: no reflection of a foreign Origin; no wildcard with credentials.
- Rate limits: auth 5/min, contact 10/15min, csp-report 60/15min — all fire.
- Canonical/OG URLs are built from `APP_URL`, not the Host header (no host poisoning).
- Path traversal variants (`..%2f`, `/assets/../../.env`) → 400/404; TRACE → 405.

## Advisory (accepted)
- CSP `script-src 'self' 'unsafe-inline'` — required by the current inline
  bootstrap; tightening needs nonce/hash work.
- No `/.well-known/security.txt`.
