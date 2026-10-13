# Playwright configs — which one to use

> **Status:** living · **Updated:** 2026-10-10 · **Scope:** which of the three Playwright configs to run, and when

There are three Playwright configs in the repo root. They share `testDir: ./e2e` but differ in
how the server is started, which database is touched and which specs they are meant for.
This page was written from the configs themselves; nothing here is inferred beyond that.

| | `playwright.config.ts` | `playwright.e2e.config.ts` | `playwright.local.config.ts` |
|---|---|---|---|
| Wired into | **nothing** (no npm script, not in CI) | `npm run test:e2e` | nothing — run by hand (see below) |
| Server | starts `npm run dev` on `:3000` (reuses one if already running) | `node e2e/prepare-db.mjs && npm run dev` on `:3210`, never reuses | **none** — expects an already running server |
| Database | whatever `npm run dev` uses (the normal dev DB) | isolated scratch copy `data/janebi.e2e.db`, prepared by `e2e/prepare-db.mjs`; `NODE_ENV=test` so rate limiters skip | whatever the target server uses |
| Specs | every spec in `e2e/` | `real-user.spec.ts` by default; override with `E2E_MATCH=<file>` | any; documented use is `seo-crawl-parity.spec.ts` |
| Browsers | chromium + webkit | chromium + webkit | chromium only |
| Parallelism / retries | fully parallel; 2 retries on CI | serial files, 2 workers, 1 retry | 1 worker, 0 retries |
| Reporter | `html` → `playwright-report/` | `list` + html → `playwright-report-real/` | `list` |
| Base URL | `http://localhost:3000` | `http://localhost:3210` | `E2E_BASE_URL`, default `http://127.0.0.1:4322` |

## Commands

```bash
# Real-user suite on the isolated DB (the supported entry point)
npm run test:e2e
E2E_MATCH=cookie-auth.spec.ts npm run test:e2e      # a single spec

# Acceptance specs against a server you already started (local prod build or dev)
E2E_BASE_URL=http://127.0.0.1:4322 npx playwright test \
  --config=playwright.local.config.ts e2e/seo-crawl-parity.spec.ts
```

## Caveats

- `playwright.config.ts` has no documented caller. Running it executes all of `e2e/` against the
  normal dev server and dev DB, not the isolated scratch DB. Whether it is still needed is not
  determinable from the repo; it was left untouched.
- `deep-coverage.spec.ts` and `real-user.spec.ts` state in their headers that they rely on the
  isolated DB and server of `playwright.e2e.config.ts`.
- E2E is not part of `npm run verify` or CI (see `scripts/verify-all.sh` and `.github/workflows/ci.yml`).
- Reports (`playwright-report*/`) and `test-results/` are git-ignored.
