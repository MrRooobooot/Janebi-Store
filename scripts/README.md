# scripts/ — operator tooling

Layout rule: **one folder per purpose**. Anything wired into a gate lives in
`gate/`; anything you run against a live box lives in `ops/`; anything that
touches catalogue/DB rows lives in `data/`; anything proven one-and-done lives
in `oneoff/` (kept for provenance, not for reuse).

| Folder | Runs where | Meaning |
|--------|-----------|---------|
| `gate/` | local + CI | Required by `npm run verify` (`scripts/verify-all.sh`). Breaking one of these fails the gate. |
| `audit/` | local or live prod | Rerunnable evidence producers (Playwright/DOM). They never mutate data. |
| `ops/` | VPS or over SSH | Backup, monitor, drift checks, recovery. |
| `data/` | VPS container / with prod creds | Catalogue, migration and cleanup one-shots that ARE re-run per import or incident. |
| `oneoff/` | once, already done | Historical import/backfill/seed steps. Kept so the produced data is reproducible. |

## gate/
- `static-exposure.sh` — `/server.cjs` + `.map` must 404 while `/api/products` answers 200 (SEC-01).
- `csp-inline.sh` — served shell's inline hash must match the pinned `script-src` hash, no `'unsafe-inline'`, `security.txt` 200 (SEC-03).

## audit/
- `design-audit.mjs` — layout/contrast sweep across engines × viewports (bleed, baseline, FAB overlap, console errors).
- `prod-csp-sweep.mjs` — live prod: zero `securitypolicyviolation` + zero broken images, chromium + webkit.
- `prod-guest-smoke.mjs` — live prod guest walk: every route renders, no console errors, no script-readable credential in storage.
- `csp-live.mjs` — browser proof that the pinned inline script actually executes in prod.
- `sw-and-csp.mjs` — service-worker regression: no clone-after-use errors, cache versions bumped.
- `form-a11y.mjs` — every form field has id/name + associated label (DevTools a11y findings).
- `mobile-ux.mjs` — 390×844 / 360×800: overflow, tap targets, tiny text, overlap.
- `hero-cards.mjs` — hero shows real product cards (photo/title/price), not demo art.
- `post-purge.mjs` — after a data purge: only real inventory listed, pages render.
- `probe-admin.mjs` — 12 admin routes at 390px (drawer, table overflow, sticky header).
- `probe-blog.mjs` — blog card defects (title clip, meta contrast, chip wrap).
- `console-errors.mjs` — single-page console error collector.

## ops/
- `backup-db.mjs` — `VACUUM INTO` backup (WAL-safe), keeps last 7; `npm run db:backup`.
- `indexnow.mjs` — IndexNow ping (Bing/Yandex/Seznam); called at the end of `deploy.sh`.
- `vps-monitor.py` — cron health/disk/container check (`HEALTH_URL` defaults to `127.0.0.1:3000/api/health`).
- `snap-db.py` — fresh DB snapshot out of the running container.
- `nginx-drift.sh` — compare live nginx conf with `deploy/nginx-*.conf` (deliberately NOT in the gate).
- `audit-boot.sh` — boot a local audit instance on an isolated port/DB.
- `recover-and-harden.sh` — recovery runbook script (SSH outage / bad deploy).
- `verify-owner-protection.sh`, `verify-users-chronology.sh` — owner-account and user-chronology invariants.
- `pre-state-e2e.sh`, `post-order-e2e.sh` — order-flow pre/post state capture.
- `proof-admin-bugs.sh` — capture admin-panel symptoms for a bug report.

## data/
- `ingest-real-products.py` + `validate-ingest.py` — real-catalogue import pipeline (run inside the container).
- `seed-blog.ts` — blog seeder (esbuild bundle → scp → `docker cp` → node in-container; `SEED_BLOG_ONLY=<id>` for one post).
- `repair-blog-texts.ts` — fix escaped/newline drift in seeded blog bodies.
- `migrate-sqlite-to-pg.ts` — SQLite → PostgreSQL parity move.
- `price-watch.mjs` — catalogue vs market price band (Torob).
- `purge-test-users.cjs` — purge test residue (run LAST, after any test suite).
- `backfill-user-created-at.cjs` — derive real `users.created_at` from stored Jalali text.
- `fk-audit.cjs`, `merge-dup-brands.cjs`, `merge-dup-categories.cjs` — integrity + duplicate-entity merges (idempotent).

## oneoff/
- `build-specs-plan.py` → `backfill-specs.cjs` — specs plan generation + `PUT /api/admin/products/:id` backfill (plan JSON: `docs/specs-backfill-plan.json`).
- `ingest`-era media steps: `apply-product-images.py`, `migrate-product-images.py`, `regen-og-images.py`.
- `seed-post19.sh` — single blog post deploy helper.
