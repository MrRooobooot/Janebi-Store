# docs/ — index

Read in this order: `../PROJECT_GRAPH.md` (canonical live map) → `../AGENTS.md`
(PRD/stack/category rules) → `../TASKS.md` (open work + round log).
Other root guides: `../README.md`, `../CHANGELOG_AGENT.md`, `../PLAYWRIGHT.md` (which Playwright config to use).

## Layout

| Folder | What lives here | Naming |
|--------|-----------------|--------|
| `reference/` | Living documents: architecture, per-domain baselines, category tree, runbooks, running logs | descriptive name, no date in the file name |
| `reports/` | Dated one-shot reports (audits, imports, remediation) | `YYYY-MM-DD-kebab-case.md` |
| `data/` | Structured data files kept as evidence or script input | `YYYY-MM-DD-kebab-case.json`, except files a script reads by name |
| `archive/` | Superseded or one-shot documents kept for the record | unchanged |
| `research/`, `seo/`, `business/` | Domain research, SEO handbook, commercial documents | unchanged |
| `screenshots/` | Images used by the root `README.md` (tracked) | unchanged |
| `shots/` | Local audit screenshots (git-ignored; do not commit) | unchanged |

There is no `assets/` folder: `screenshots/` is referenced by the root README and was left where it is.

## reference/

| File | What it is |
|------|-----------|
| `ARCHITECTURE.md` | Verified architecture narrative (state checked 2026-10-03), with limitations listed. |
| `architecture-baseline.md` | Older stack/layout baseline (last edited 2026-08-17). Overlaps `ARCHITECTURE.md`; its directory layout is partly stale. Kept, not merged. |
| `auth-baseline.md`, `database-baseline.md`, `api-baseline.md`, `payment-baseline.md`, `deployment-baseline.md`, `inventory-baseline.md` | Per-domain baselines: the invariants each subsystem must keep. |
| `CATEGORY-TREE.md` | **SoT for the category tree** — closed list; no change without user approval. Read by `scripts/data/validate-ingest.py`. |
| `live-payment-runbook.md` | Human-run runbook for the first real Zarinpal payment (Persian). |
| `TEST_INFRA.md` | How the test tiers run and what each isolates. |
| `seo-baseline.md` | SEO metadata ownership per route, measured behaviour before and after the 2026-10 pass, and known limits. |
| `seo-claims.md` | Register of commercial claims in SEO copy, with the store page that states each one. |
| `TEST_READY.md` | Test-tier readiness snapshot dated 2026-09-05. **Counts are historical;** current counts: `../tests/README.md`. |
| `PROJECT_AUDIT.md` | Production-readiness audit, edition 2026-08-31 (severity list + status). |
| `UI-AUDIT-LOG.md` | Running UI/UX round log; every claim carries its measured evidence. |
| `PORTFOLIO_CASE_STUDY.md` | Problem / detection / root-cause write-ups; linked from the root README. |

## reports/

| File | Date | What it is |
|------|------|-----------|
| `2026-09-14-security-audit.md` | 2026-09-14 | Black-box security findings register (SEC-01…), updated in place as items close. |
| `2026-09-14-price-position-report.md` | 2026-09-14 | Our prices vs the Torob market band (data: `data/2026-09-14-price-watch.json`). |
| `2026-09-16-real-inventory-holder-import.md` | 2026-09-16 | Earldom holder stock import replacing the test catalogue. |
| `2026-09-17-ops-config-audit.md` | 2026-09-17 | Production logs/config audit and the permission fix it made. |
| `2026-09-17-test-validity-audit.md` | 2026-09-17 | Mutation-style check of how much the test suite can be trusted. |
| `2026-09-18-backend-remediation.md` | 2026-09-18 | Test isolation, order-integrity tests, PG parity, gateway/SMS liveness. |
| `2026-09-19-real-inventory-mcdodo-cables.md` | 2026-09-19 | Seven Mcdodo Lightning cables added to prod. |

## data/

| File | What it is |
|------|-----------|
| `specs-backfill-plan.json` | Output of `scripts/oneoff/build-specs-plan.py`, input to `backfill-specs.cjs`. Name is fixed by those scripts. |
| `2026-09-14-price-watch.json` | Raw output of `scripts/data/price-watch.mjs` behind the price-position report. |

## Other folders

- `research/iranian-ecommerce-design-standards.md` — design research.
- `seo/JANEBIARENA_SEO_HANDBOOK.md` — SEO handbook.
- `business/cooperation-proposal.pdf` — commercial document, not engineering.
- `code-pro-hermes-guide.md` / `.pdf` — local, git-ignored; left in place pending a separate decision.

## archive/
Moved here on 2026-09-16: `legacy-agent.md`, `DAILY-2026-09-13.md`, `ADMIN-CODE-REVIEW-2026-09-13.md`,
`admin-review-2026-09-01.md`, `TEST-RESIDUE-AUDIT-0916.md`, `final-production-audit.md`,
`PROJECT-architecture-spec-2026-09.md` (formerly root `PROJECT.md` — superseded by `AGENTS.md` + `PROJECT_GRAPH.md`).

## Moved files (old path → current path)
Ledgers (`TASKS.md`, `CHANGELOG_AGENT.md`, archive entries) may still mention old paths in historical lines:

| Old | Current |
|-----|---------|
| `docs/<name>-baseline.md`, `ARCHITECTURE.md`, `CATEGORY-TREE.md`, `live-payment-runbook.md`, `TEST_INFRA.md`, `TEST_READY.md`, `PROJECT_AUDIT.md`, `UI-AUDIT-LOG.md`, `PORTFOLIO_CASE_STUDY.md` | `docs/reference/<same name>` |
| `docs/SECURITY-AUDIT-2026-09-14.md` | `docs/reports/2026-09-14-security-audit.md` |
| `docs/PRICE-POSITION-REPORT-0914.md` | `docs/reports/2026-09-14-price-position-report.md` |
| `docs/REAL-INVENTORY-0916.md` | `docs/reports/2026-09-16-real-inventory-holder-import.md` |
| `docs/OPS-CONFIG-AUDIT-2026-09-17.md` | `docs/reports/2026-09-17-ops-config-audit.md` |
| `docs/TEST-VALIDITY-AUDIT-2026-09-17.md` | `docs/reports/2026-09-17-test-validity-audit.md` |
| `docs/BACKEND-REMEDIATION-2026-09-18.md` | `docs/reports/2026-09-18-backend-remediation.md` |
| `docs/REAL-INVENTORY-2026-09-19.md` | `docs/reports/2026-09-19-real-inventory-mcdodo-cables.md` |
| `docs/specs-backfill-plan.json` | `docs/data/specs-backfill-plan.json` |
| `docs/price-watch-0914.json` | `docs/data/2026-09-14-price-watch.json` |

## Historical paths in this folder
Entries written before 2026-09-16 point at `scripts/probes/<name>.mjs`. The tidy pass deleted ~50 dated
scratch probes and regrouped the survivors (`gate/`, `audit/`, `ops/`, `data/`, `oneoff/` — see
`../scripts/README.md`). Those log lines are left verbatim because they are the evidence record for
closed rounds.
