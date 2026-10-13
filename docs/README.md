# docs/ — index

> **Status:** living · **Updated:** 2026-10-13 · **Scope:** where every document lives and what it is for. Rules: [documentation-standard.md](documentation-standard.md).

## Read first

1. [reference/project-graph.md](reference/project-graph.md): live system map (structure, invariants, known gaps).
2. `../AGENTS.md`: stack, hard rules, verification commands.
3. [ledger/tasks.md](ledger/tasks.md): open work only.
4. [ledger/changelog-agent.md](ledger/changelog-agent.md): what has landed, newest first.

`../README.md` is the public overview. Test counts and tiers are in `../tests/README.md`.

## Folders

| Folder | Holds | File name |
|---|---|---|
| `ledger/` | the two running logs: open work and the change log | `ledger/tasks.md`, `ledger/changelog-agent.md` |
| `reference/` | living documents: architecture, baselines, runbooks, registers, the system map | `<kebab-case>.md` |
| `reports/` | dated, frozen evidence: audits, imports, execution records | `<YYYY-MM-DD>-<slug>.md` |
| `archive/` | superseded or historical records kept on purpose | `<YYYY-MM-DD>-<slug>.md` |
| `data/` | JSON evidence or script input | `<YYYY-MM-DD>-<slug>.json` unless a script reads a fixed name |
| `business/` | commercial documents, not engineering | none |
| `screenshots/` | images linked from the root README (tracked) | none |
| `shots/` | local audit screenshots (git-ignored) | none |

Outside `docs/` on purpose: `../README.md` and `../AGENTS.md` (conventional root names), `../scripts/README.md`, `../tests/README.md`, `../bale-worker/README.md` (folder indexes), `../public/pricing.md` (served by the site). See the standard, section 2.

## ledger/

| File | What it is |
|---|---|
| [tasks.md](ledger/tasks.md) | Open work: decisions waiting, input waiting, the standing automation. |
| [changelog-agent.md](ledger/changelog-agent.md) | One entry per landed change, newest first. Append-only. |

## reference/

| File | What it is |
|---|---|
| [project-graph.md](reference/project-graph.md) | Live system map: structure, invariants, known gaps. |
| [architecture.md](reference/architecture.md) | Architecture: request lifecycle, payments, release and ops flows, limitations. |
| [api-baseline.md](reference/api-baseline.md) | Every `/api` route with its access level and defining file, plus rate limits. |
| [auth-baseline.md](reference/auth-baseline.md) | Sign-in paths, token lifetimes and cookies, roles, known limits. |
| [database-baseline.md](reference/database-baseline.md) | SQLite settings, the 15 tables and their columns, migrations, seed. |
| [inventory-baseline.md](reference/inventory-baseline.md) | Stock model, deduction and restock paths, known limits. |
| [payment-baseline.md](reference/payment-baseline.md) | Zarinpal lifecycle, gateway hosts, order states, callbacks. |
| [deployment-baseline.md](reference/deployment-baseline.md) | Runtime, container, nginx, environment variables, deploy and rollback, VPS cron. |
| [live-payment-runbook.md](reference/live-payment-runbook.md) | Human-run runbook for a live Zarinpal payment test (Persian). |
| [playwright-configs.md](reference/playwright-configs.md) | Which of the three Playwright configs to run, and when. |
| [seo-baseline.md](reference/seo-baseline.md) | SEO metadata ownership per route, with the evidence. |
| [seo-claims.md](reference/seo-claims.md) | Register of commercial claims that reach search engines and social cards. |
| [seo-handbook.md](reference/seo-handbook.md) | SEO guide and engineering standards for the storefront (Persian). Not fully re-verified on 2026-10-13. |
| [ui-audit-log.md](reference/ui-audit-log.md) | Append-only UI/UX audit log; one row per verified finding. |
| [portfolio-case-study.md](reference/portfolio-case-study.md) | Problem → detection → root cause write-ups; linked from the root README. |
| `reference/CATEGORY-TREE.md` | **Locked** category source of truth. Changes need explicit admin approval. Read by `scripts/data/validate-ingest.py`. |

## reports/

| File | Date | What it is |
|---|---|---|
| [2026-08-31-project-audit.md](reports/2026-08-31-project-audit.md) | 2026-08-31 | Production-readiness audit at its edition date. Statuses are frozen there; current state is in `reference/project-graph.md` and `ledger/tasks.md`. |
| [2026-09-06-iranian-ecommerce-design-standards.md](reports/2026-09-06-iranian-ecommerce-design-standards.md) | 2026-09-06 | Design research snapshot of Iranian storefronts. |
| [2026-09-14-price-position-report.md](reports/2026-09-14-price-position-report.md) | 2026-09-14 | Our prices against the Torob market band. Data: `data/2026-09-14-price-watch.json`. |
| [2026-09-14-security-audit.md](reports/2026-09-14-security-audit.md) | 2026-09-14 | Black-box security findings register (SEC-01…). |
| [2026-09-16-real-inventory-holder-import.md](reports/2026-09-16-real-inventory-holder-import.md) | 2026-09-16 | Earldom holder stock import that replaced the test catalogue. |
| [2026-09-17-ops-config-audit.md](reports/2026-09-17-ops-config-audit.md) | 2026-09-17 | Production logs and config audit, and the permission fix it made. |
| [2026-09-17-test-validity-audit.md](reports/2026-09-17-test-validity-audit.md) | 2026-09-17 | Mutation-style check of how far the test suite can be trusted. |
| [2026-09-18-backend-remediation.md](reports/2026-09-18-backend-remediation.md) | 2026-09-18 | Test isolation, order-integrity tests, gateway and SMS liveness. |
| [2026-09-19-real-inventory-mcdodo-cables.md](reports/2026-09-19-real-inventory-mcdodo-cables.md) | 2026-09-19 | Seven Mcdodo Lightning cables added to production. |
| [2026-10-13-postgres-removal-record.md](reports/2026-10-13-postgres-removal-record.md) | 2026-10-13 | Execution record: PostgreSQL removed from the VPS; SQLite is the only database. |

## data/

| File | What it is |
|---|---|
| [2026-09-14-price-watch.json](data/2026-09-14-price-watch.json) | Raw output of `scripts/data/price-watch.mjs`, behind the price report. |
| [specs-backfill-plan.json](data/specs-backfill-plan.json) | Input of `scripts/oneoff/backfill-specs.cjs`. Name fixed by those scripts. |

## business/

`business/cooperation-proposal.pdf`: commercial document.

## archive/

Kept on purpose. Each file has a banner at the top and keeps its name, because ledger lines cite it.

| File | Why it is here |
|---|---|
| `archive/2026-10-13-tasks-done-rounds.md` | Every closed round from the old root TASKS file, verbatim. |
| `archive/2026-10-13-project-graph-change-sections.md` | Dated change narratives removed from the old root project-graph file. Payment terminal ID redacted on 2026-10-13 (`<redacted>`); nothing else changed in the body. |

## Local only (not part of this index)

- `code-pro-hermes-guide.md` and `.pdf`: a personal agent-profile note. Git-ignored, so git cannot restore it; left in place until a decision is made.
- `shots/`: local audit screenshots. Git-ignored.

## Deleted on 2026-10-13

Superseded or misleading, with no unique facts left in the repo. Every one was committed, so `git show HEAD:<path>` restores it.

<!-- link-check:off -->
| Deleted file | Reason |
|---|---|
| `reference/TEST_INFRA.md` | Test plan citing an `ORIGINAL_REQUEST` source that is not in the repo. Superseded by `tests/README.md`. |
| `reference/TEST_READY.md` | Snapshot of 2026-09-05; counts were historical. |
| `reference/architecture-baseline.md` | Stale layout (`.agents/`, a removed AI service). Superseded by `reference/architecture.md`. |
| `archive/legacy-agent.md` (was root `agent.md`) | Old project control ledger. Superseded by `AGENTS.md` and the ledgers. |
| `archive/DAILY-2026-09-13.md` | One-day commit summary. The commits are in git history. |
| `archive/ADMIN-CODE-REVIEW-2026-09-13.md` | Review whose four bugs were fixed; the round is in the archived tasks. |
| `archive/admin-review-2026-09-01.md` | Review with fixed findings. It also contained personal phone numbers, which must not stay in a repo. |
| `archive/TEST-RESIDUE-AUDIT-0916.md` | One-time purge record; the residue is gone. |
| `archive/final-production-audit.md` | A 2026-08-15 "A+ / 100%" certification that the code and later audits contradict. |
| `archive/PROJECT-architecture-spec-2026-09.md` | Superseded by `reference/architecture.md`. |
<!-- link-check:on -->

## Moved paths (old → current)

Ledger lines and archived documents may still cite old paths. Those lines are kept verbatim as evidence of what was true when they were written.

<!-- link-check:off -->
| Old path | Current path |
|---|---|
| `docs/reference/ARCHITECTURE.md` | `docs/reference/architecture.md` |
| `docs/reference/PORTFOLIO_CASE_STUDY.md` | `docs/reference/portfolio-case-study.md` |
| `docs/reference/PROJECT_AUDIT.md` | `docs/reports/2026-08-31-project-audit.md` |
| `docs/reference/UI-AUDIT-LOG.md` | `docs/reference/ui-audit-log.md` |
| `docs/reference/postgres-removal-record.md` | `docs/reports/2026-10-13-postgres-removal-record.md` |
| `PLAYWRIGHT.md` (root) | `docs/reference/playwright-configs.md` |
| `TASKS.md` (root) | `docs/ledger/tasks.md` |
| `CHANGELOG_AGENT.md` (root) | `docs/ledger/changelog-agent.md` |
| `PROJECT_GRAPH.md` (root) | `docs/reference/project-graph.md` |
| `docs/seo/JANEBIARENA_SEO_HANDBOOK.md` | `docs/reference/seo-handbook.md` |
| `docs/research/iranian-ecommerce-design-standards.md` | `docs/reports/2026-09-06-iranian-ecommerce-design-standards.md` |
| `docs/<name>-baseline.md` (other baselines) | `docs/reference/<same name>` |
| `docs/SECURITY-AUDIT-2026-09-14.md` | `docs/reports/2026-09-14-security-audit.md` |
| `docs/PRICE-POSITION-REPORT-0914.md` | `docs/reports/2026-09-14-price-position-report.md` |
| `docs/REAL-INVENTORY-0916.md` | `docs/reports/2026-09-16-real-inventory-holder-import.md` |
| `docs/OPS-CONFIG-AUDIT-2026-09-17.md` | `docs/reports/2026-09-17-ops-config-audit.md` |
| `docs/TEST-VALIDITY-AUDIT-2026-09-17.md` | `docs/reports/2026-09-17-test-validity-audit.md` |
| `docs/BACKEND-REMEDIATION-2026-09-18.md` | `docs/reports/2026-09-18-backend-remediation.md` |
| `docs/REAL-INVENTORY-2026-09-19.md` | `docs/reports/2026-09-19-real-inventory-mcdodo-cables.md` |
| `docs/specs-backfill-plan.json` | `docs/data/specs-backfill-plan.json` |
| `docs/price-watch-0914.json` | `docs/data/2026-09-14-price-watch.json` |
<!-- link-check:on -->

Entries written before 2026-09-16 point at `scripts/probes/<name>.mjs`. The tidy pass deleted about 50 dated scratch probes and regrouped the survivors into `gate/`, `audit/`, `ops/`, `data/` and `oneoff/`. See `../scripts/README.md`. Those lines stay verbatim.
